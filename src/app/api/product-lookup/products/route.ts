import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  ENERGYSTAR_DATASET_MAP,
  buildSodaUrl,
  type ProductSummary,
  type AssetCategory,
} from "@/lib/product-data";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brand = req.nextUrl.searchParams.get("brand");
  const category = req.nextUrl.searchParams.get("category") as AssetCategory | null;

  if (!brand || !category) {
    return NextResponse.json({ products: [] });
  }

  const mapping = ENERGYSTAR_DATASET_MAP[category];
  if (!mapping?.supported || mapping.datasets.length === 0) {
    return NextResponse.json({ products: [] });
  }

  try {
    // Query all datasets for this category in parallel
    const fetches = mapping.datasets.map(async (ds) => {
      // SoQL uses single quotes for string literals; escape any single quotes in brand name
      const safeBrand = brand.replace(/'/g, "''");

      const url = buildSodaUrl(ds.datasetId, {
        $select: `${ds.brandField},model_number`,
        $where: `upper(${ds.brandField})='${safeBrand.toUpperCase()}'`,
        $order: "model_number ASC",
        $limit: "100",
      });

      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) return [];

      const rows: Record<string, string>[] = await res.json();

      // Deduplicate model numbers within this dataset
      const seen = new Set<string>();
      const products: ProductSummary[] = [];

      for (const row of rows) {
        const modelNumber = row.model_number;
        if (!modelNumber || seen.has(modelNumber)) continue;
        seen.add(modelNumber);

        products.push({
          productId: products.length,
          sku: `${ds.datasetId}::${modelNumber}`,
          name: `${ds.label}: ${modelNumber}`,
          brand: row[ds.brandField] || brand,
          image: "",
          status: "ENERGY STAR Certified",
        });
      }

      return products;
    });

    const results = await Promise.allSettled(fetches);

    // Merge products from all datasets
    const allProducts: ProductSummary[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allProducts.push(...result.value);
      }
    }

    return NextResponse.json({ products: allProducts });
  } catch (err) {
    console.error("ENERGY STAR products fetch failed:", err);
    return NextResponse.json({ products: [] });
  }
}
