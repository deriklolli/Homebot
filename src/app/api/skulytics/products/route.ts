import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  SKULYTICS_CATEGORY_MAP,
  type SkulyticsProductSummary,
  type SkulyticsApiProductResponse,
  type AssetCategory,
} from "@/lib/skulytics";

const BASE_URL = "https://api.skulytics.io";

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

  const apiKey = process.env.SKULYTICS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ products: [] });
  }

  const mapping = SKULYTICS_CATEGORY_MAP[category];
  if (!mapping?.supported || mapping.categories.length === 0) {
    return NextResponse.json({ products: [] });
  }

  try {
    // Fetch products for each mapped Skulytics category in parallel
    const fetches = mapping.categories.map(async (skulyticsCat) => {
      const url = new URL(`${BASE_URL}/product`);
      url.searchParams.set("brand", brand);
      url.searchParams.set("category", skulyticsCat);
      url.searchParams.set("per_page", "100");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) return [];

      const json: SkulyticsApiProductResponse = await res.json();
      if (!json.data) return [];

      return json.data.map((p): SkulyticsProductSummary => ({
        productId: p.product_id,
        sku: p.sku,
        name: p.name,
        brand: p.brand.brand_name,
        image: p.image,
        status: p.status,
      }));
    });

    const results = await Promise.all(fetches);
    const allProducts = results.flat();

    // Deduplicate by productId
    const seen = new Set<number>();
    const unique: SkulyticsProductSummary[] = [];
    for (const product of allProducts) {
      if (!seen.has(product.productId)) {
        seen.add(product.productId);
        unique.push(product);
      }
    }

    // Sort by name
    unique.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ products: unique });
  } catch (err) {
    console.error("Skulytics products fetch failed:", err);
    return NextResponse.json({ products: [] });
  }
}
