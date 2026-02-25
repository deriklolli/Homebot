import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

interface ConsumableProduct {
  name: string;
  estimatedCost: number | null;
  searchTerm: string;
}

interface ConsumableSuggestion {
  consumable: string;
  description: string;
  frequencyMonths: number;
  products: ConsumableProduct[];
}

interface SingleRequest {
  make: string;
  model: string;
  category: string;
  name: string;
}

interface BatchRequest {
  batch: Array<{ make: string; model: string }>;
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  // Auth check — middleware excludes /api/ routes, so verify session here
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Batch mode: return cached suggestions for multiple make+model pairs
  if (body.batch) {
    return handleBatch(body as BatchRequest);
  }

  // Single mode: check cache, call Claude on miss
  return handleSingle(body as SingleRequest);
}

async function handleBatch(body: BatchRequest) {
  const pairs = body.batch.filter((p) => p.make && p.model);
  if (pairs.length === 0) {
    return NextResponse.json({ results: {} });
  }

  const service = getServiceClient();

  // Build OR filter for all pairs
  const orConditions = pairs
    .map((p) => `and(make.ilike."${p.make}",model.ilike."${p.model}")`)
    .join(",");

  const { data, error } = await service
    .from("consumable_cache")
    .select("make, model, suggestions")
    .or(orConditions);

  if (error) {
    return NextResponse.json({ results: {} });
  }

  const results: Record<string, ConsumableSuggestion[]> = {};
  for (const row of data ?? []) {
    const key = `${row.make.toLowerCase()}|${row.model.toLowerCase()}`;
    results[key] = row.suggestions as ConsumableSuggestion[];
  }

  return NextResponse.json({ results });
}

async function handleSingle(body: SingleRequest) {
  const { make, model, category, name } = body;

  if (!name || !category) {
    return NextResponse.json(
      { error: "Name and category are required" },
      { status: 400 }
    );
  }

  if (!make || !model) {
    return NextResponse.json({ suggestions: [], fromCache: false });
  }

  const service = getServiceClient();

  // Check cache
  const { data: cached } = await service
    .from("consumable_cache")
    .select("suggestions")
    .ilike("make", make)
    .ilike("model", model)
    .limit(1)
    .single();

  if (cached) {
    return NextResponse.json({
      suggestions: cached.suggestions as ConsumableSuggestion[],
      fromCache: true,
    });
  }

  // Cache miss — call Claude
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI suggestions not configured" },
      { status: 500 }
    );
  }

  const prompt = `You are a home maintenance expert. Given the following home appliance, identify ALL filters, consumables, and replacement parts that need periodic replacement.

Asset: ${name}
Category: ${category}
Make: ${make}
Model: ${model}

Return a JSON array where each item represents a consumable category with multiple product options the homeowner can choose from. Each item should have:
- "consumable": the type of consumable (e.g., "Water Filter", "Salt Pellets")
- "description": brief description of what it is and why it needs replacing
- "frequencyMonths": how often it should be replaced in months (number)
- "products": array of 2-3 specific product options, each with:
  - "name": specific product name with size/quantity (e.g., "Morton Clean & Protect 40lb")
  - "estimatedCost": approximate cost in USD, or null if unknown
  - "searchTerm": a specific Amazon search term to find this exact product

Only include items that genuinely need periodic replacement. Do not include the appliance itself or one-time accessories. If this asset type has no consumables, return an empty array.

Return ONLY the JSON array, no other text.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status);
      return NextResponse.json(
        { error: "Failed to get suggestions" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const textContent = data.content?.[0]?.text ?? "[]";

    // Strip markdown code blocks if present
    const jsonStr = textContent
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();
    const raw = JSON.parse(jsonStr);

    // Validate structure
    const suggestions: ConsumableSuggestion[] = [];
    for (const item of Array.isArray(raw) ? raw : []) {
      if (
        typeof item.consumable === "string" &&
        typeof item.frequencyMonths === "number" &&
        Array.isArray(item.products)
      ) {
        const validProducts: ConsumableProduct[] = [];
        for (const p of item.products) {
          if (typeof p.name === "string" && typeof p.searchTerm === "string") {
            validProducts.push({
              name: p.name,
              estimatedCost:
                typeof p.estimatedCost === "number" ? p.estimatedCost : null,
              searchTerm: p.searchTerm,
            });
          }
        }
        if (validProducts.length > 0) {
          suggestions.push({
            consumable: item.consumable,
            description: item.description ?? "",
            frequencyMonths: item.frequencyMonths,
            products: validProducts,
          });
        }
      }
    }

    // Cache the result (including empty arrays)
    const { error: upsertError } = await service.from("consumable_cache").upsert(
      {
        make: make.trim().toLowerCase(),
        model: model.trim().toLowerCase(),
        category: category.trim(),
        suggestions,
      },
      { onConflict: "make,model" }
    );
    if (upsertError) {
      console.error("Failed to cache suggestions:", upsertError);
    }

    return NextResponse.json({ suggestions, fromCache: false });
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("Failed to parse AI response as JSON");
      return NextResponse.json(
        { error: "Invalid response format" },
        { status: 502 }
      );
    }
    console.error("Suggest consumables error:", err);
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}
