import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { buildSodaUrl, type ProductDetail } from "@/lib/product-data";

// In-memory cache: sku → { product, expiry }
const detailCache = new Map<string, { data: ProductDetail; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sku = req.nextUrl.searchParams.get("sku");
  const brand = req.nextUrl.searchParams.get("brand") || "";
  if (!sku) {
    return NextResponse.json({ product: null });
  }

  // Check cache
  const cached = detailCache.get(sku);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json({ product: cached.data });
  }

  // Parse datasetId and modelNumber from sku format "datasetId::modelNumber"
  const separatorIndex = sku.indexOf("::");
  if (separatorIndex === -1) {
    return NextResponse.json({ product: null });
  }
  const datasetId = sku.substring(0, separatorIndex);
  const modelNumber = sku.substring(separatorIndex + 2);

  if (!datasetId || !modelNumber) {
    return NextResponse.json({ product: null });
  }

  try {
    // Run ENERGY STAR detail, Google CSE image, and Claude warranty in parallel
    const [energyStarResult, imageResult, warrantyResult] = await Promise.allSettled([
      // 1. ENERGY STAR product detail
      fetchEnergyStarDetail(datasetId, modelNumber),
      // 2. Google CSE product image
      fetchProductImage(brand, modelNumber),
      // 3. Claude warranty estimate
      fetchWarrantyEstimate(brand, modelNumber),
    ]);

    const esData = energyStarResult.status === "fulfilled" ? energyStarResult.value : null;
    const imageUrl = imageResult.status === "fulfilled" ? imageResult.value : "";
    const warrantyMonths = warrantyResult.status === "fulfilled" ? warrantyResult.value : null;

    // Build the product name from ENERGY STAR data or fallback
    const productName = esData?.name || `${brand} ${modelNumber}`.trim();

    const product: ProductDetail = {
      productId: 0,
      sku: modelNumber,
      name: productName,
      brand: esData?.brand || brand,
      image: imageUrl,
      productUrl: "",
      warrantyMonths,
      manualUrl: null,
    };

    // Cache
    detailCache.set(sku, { data: product, expiry: Date.now() + CACHE_TTL });

    return NextResponse.json({ product });
  } catch (err) {
    console.error("Product detail fetch failed:", err);
    return NextResponse.json({ product: null });
  }
}

// --- ENERGY STAR detail fetch ---

async function fetchEnergyStarDetail(
  datasetId: string,
  modelNumber: string
): Promise<{ name: string; brand: string } | null> {
  const safeModel = modelNumber.replace(/'/g, "''");
  const url = buildSodaUrl(datasetId, {
    $where: `model_number='${safeModel}'`,
    $limit: "1",
  });

  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return null;

  const rows: Record<string, string>[] = await res.json();
  if (rows.length === 0) return null;

  const row = rows[0];
  const brand = row.brand_name || row.outdoor_unit_brand_name || "";
  const type = row.type || row.product_type || "";
  const name = type ? `${brand} ${row.model_number} (${type})` : `${brand} ${row.model_number}`;

  return { name: name.trim(), brand };
}

// --- Google CSE image fetch ---

async function fetchProductImage(brand: string, modelNumber: string): Promise<string> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) return "";

  const query = `${brand} ${modelNumber}`;
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cseId);
  url.searchParams.set("q", query);
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", "1");

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return "";

  const data = await res.json();
  return data.items?.[0]?.link ?? "";
}

// --- Claude warranty estimate ---

async function fetchWarrantyEstimate(
  brand: string,
  modelNumber: string
): Promise<number | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a home appliance expert. Estimate the manufacturer's standard warranty period for this product.

Brand: ${brand}
Model: ${modelNumber}

Respond with ONLY a JSON object: {"warrantyMonths": <number or null>}
- Use the standard manufacturer warranty for this brand and product type
- If you cannot determine the warranty with reasonable confidence, return null
- Do NOT include extended warranty options, only the standard included warranty`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const textContent = data.content?.[0]?.text ?? "";

  // Strip markdown code blocks if present
  const jsonStr = textContent
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();

  const parsed = JSON.parse(jsonStr);
  return typeof parsed.warrantyMonths === "number" ? parsed.warrantyMonths : null;
}
