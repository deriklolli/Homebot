import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  ENERGYSTAR_DATASET_MAP,
  buildSodaUrl,
  type ProductBrand,
  type AssetCategory,
} from "@/lib/product-data";

// In-memory cache: category → { brands, expiry }
const brandCache = new Map<string, { data: ProductBrand[]; expiry: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category") as AssetCategory | null;
  if (!category) {
    return NextResponse.json({ brands: [] });
  }

  const mapping = ENERGYSTAR_DATASET_MAP[category];
  if (!mapping?.supported || mapping.datasets.length === 0) {
    return NextResponse.json({ brands: [] });
  }

  // Check cache
  const cached = brandCache.get(category);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json({ brands: cached.data });
  }

  try {
    // Query all datasets for this category in parallel
    const fetches = mapping.datasets.map(async (ds) => {
      const url = buildSodaUrl(ds.datasetId, {
        $select: ds.brandField,
        $group: ds.brandField,
        $order: `${ds.brandField} ASC`,
        $limit: "500",
      });

      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return [];

      const rows: Record<string, string>[] = await res.json();
      return rows
        .map((row) => row[ds.brandField])
        .filter((name): name is string => !!name && name.trim() !== "");
    });

    const results = await Promise.allSettled(fetches);

    // Merge and deduplicate brand names (case-insensitive)
    const seen = new Set<string>();
    const brandNames: string[] = [];

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const name of result.value) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          brandNames.push(name);
        }
      }
    }

    brandNames.sort((a, b) => a.localeCompare(b));

    const brands: ProductBrand[] = brandNames.map((name, i) => ({
      id: i,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      image: "",
    }));

    // Cache
    brandCache.set(category, { data: brands, expiry: Date.now() + CACHE_TTL });

    return NextResponse.json({ brands });
  } catch (err) {
    console.error("ENERGY STAR brands fetch failed:", err);
    return NextResponse.json({ brands: [] });
  }
}
