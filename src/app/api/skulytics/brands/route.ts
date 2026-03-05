import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  SKULYTICS_CATEGORY_MAP,
  type SkulyticsBrand,
  type SkulyticsApiBrandResponse,
  type AssetCategory,
} from "@/lib/skulytics";

const BASE_URL = "https://api.skulytics.io";

// In-memory cache: category key → { brands, expiry }
const brandCache = new Map<string, { data: SkulyticsBrand[]; expiry: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category") as AssetCategory | "all" | null;
  if (!category) {
    return NextResponse.json({ brands: [] });
  }

  const apiKey = process.env.SKULYTICS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ brands: [] });
  }

  // Collect all Skulytics categories to search
  let skulyticsCategories: string[] = [];

  if (category === "all") {
    for (const mapping of Object.values(SKULYTICS_CATEGORY_MAP)) {
      if (mapping.supported) {
        skulyticsCategories.push(...mapping.categories);
      }
    }
    skulyticsCategories = [...new Set(skulyticsCategories)];
  } else {
    const mapping = SKULYTICS_CATEGORY_MAP[category];
    if (!mapping?.supported || mapping.categories.length === 0) {
      return NextResponse.json({ brands: [] });
    }
    skulyticsCategories = mapping.categories;
  }

  // Check cache
  const cacheKey = category;
  const cached = brandCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json({ brands: cached.data });
  }

  try {
    // Fetch brands for each Skulytics category in parallel
    const fetches = skulyticsCategories.map(async (skulyticsCat) => {
      const url = new URL(`${BASE_URL}/brand`);
      url.searchParams.set("category", skulyticsCat);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return [];

      const json: SkulyticsApiBrandResponse = await res.json();
      if (!json.data) return [];

      return json.data.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        image: b.image,
      }));
    });

    const results = await Promise.all(fetches);
    const allBrands = results.flat();

    // Deduplicate by id, sort alphabetically
    const seen = new Set<number>();
    const unique: SkulyticsBrand[] = [];
    for (const brand of allBrands) {
      if (!seen.has(brand.id)) {
        seen.add(brand.id);
        unique.push(brand);
      }
    }
    unique.sort((a, b) => a.name.localeCompare(b.name));

    // Cache
    brandCache.set(cacheKey, { data: unique, expiry: Date.now() + CACHE_TTL });

    return NextResponse.json({ brands: unique });
  } catch (err) {
    console.error("Skulytics brands fetch failed:", err);
    return NextResponse.json({ brands: [] });
  }
}
