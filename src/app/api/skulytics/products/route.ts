import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  SKULYTICS_CATEGORY_MAP,
  type SkulyticsProductSummary,
  type SkulyticsApiProductResponse,
  type AssetCategory,
} from "@/lib/skulytics";

const BASE_URL = "https://api.skulytics.io";

async function fetchAllPages(
  brand: string,
  skulyticsCat: string,
  apiKey: string
): Promise<SkulyticsProductSummary[]> {
  const perPage = 100;
  const firstUrl = new URL(`${BASE_URL}/product`);
  firstUrl.searchParams.set("brand", brand);
  firstUrl.searchParams.set("category", skulyticsCat);
  firstUrl.searchParams.set("per_page", String(perPage));
  firstUrl.searchParams.set("page", "1");

  const firstRes = await fetch(firstUrl.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });

  if (!firstRes.ok) return [];

  const firstJson: SkulyticsApiProductResponse = await firstRes.json();
  if (!firstJson.data) return [];

  const mapProduct = (p: NonNullable<SkulyticsApiProductResponse["data"]>[number]): SkulyticsProductSummary => ({
    productId: p.product_id,
    sku: p.sku,
    name: p.name,
    brand: p.brand.brand_name,
    image: p.image,
    status: p.status,
  });

  const products = firstJson.data.map(mapProduct);

  // Fetch remaining pages if there are more
  const lastPage = firstJson.meta?.last_page ?? 1;
  if (lastPage > 1) {
    const pagePromises: Promise<SkulyticsProductSummary[]>[] = [];
    for (let page = 2; page <= lastPage; page++) {
      pagePromises.push(
        (async () => {
          const url = new URL(`${BASE_URL}/product`);
          url.searchParams.set("brand", brand);
          url.searchParams.set("category", skulyticsCat);
          url.searchParams.set("per_page", String(perPage));
          url.searchParams.set("page", String(page));

          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(10000),
          });

          if (!res.ok) return [];
          const json: SkulyticsApiProductResponse = await res.json();
          return (json.data ?? []).map(mapProduct);
        })()
      );
    }
    const moreResults = await Promise.all(pagePromises);
    products.push(...moreResults.flat());
  }

  return products;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brand = req.nextUrl.searchParams.get("brand");
  const category = req.nextUrl.searchParams.get("category") as AssetCategory | "all" | null;

  if (!brand || !category) {
    return NextResponse.json({ products: [] });
  }

  const apiKey = process.env.SKULYTICS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ products: [] });
  }

  // Collect all Skulytics categories to search
  let skulyticsCategories: string[] = [];

  if (category === "all") {
    // Search across all supported categories
    for (const mapping of Object.values(SKULYTICS_CATEGORY_MAP)) {
      if (mapping.supported) {
        skulyticsCategories.push(...mapping.categories);
      }
    }
    // Deduplicate (e.g. "Other" appears in multiple mappings)
    skulyticsCategories = [...new Set(skulyticsCategories)];
  } else {
    const mapping = SKULYTICS_CATEGORY_MAP[category];
    if (!mapping?.supported || mapping.categories.length === 0) {
      return NextResponse.json({ products: [] });
    }
    skulyticsCategories = mapping.categories;
  }

  try {
    // Fetch all pages for each Skulytics category in parallel
    const fetches = skulyticsCategories.map((skulyticsCat) =>
      fetchAllPages(brand, skulyticsCat, apiKey)
    );

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
