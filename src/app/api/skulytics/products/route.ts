import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  SKULYTICS_CATEGORY_MAP,
  type SkulyticsProductSummary,
  type SkulyticsApiProductResponse,
  type AssetCategory,
} from "@/lib/skulytics";

const BASE_URL = "https://api.skulytics.io";

function mapProduct(p: SkulyticsApiProductResponse["data"] extends (infer T)[] | null ? T : never): SkulyticsProductSummary {
  return {
    productId: p.product_id,
    sku: p.sku,
    name: p.name,
    brand: p.brand.brand_name,
    image: p.image,
    status: p.status,
  };
}

/** Fetch ALL pages for a single brand+category combo */
async function fetchAllForCategory(
  brand: string,
  skulyticsCat: string,
  apiKey: string
): Promise<SkulyticsProductSummary[]> {
  // Page 1
  const url = new URL(`${BASE_URL}/product`);
  url.searchParams.set("brand", brand);
  url.searchParams.set("category", skulyticsCat);
  url.searchParams.set("per_page", "500");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) return [];

  const json: SkulyticsApiProductResponse = await res.json();
  if (!json.data) return [];

  const products = json.data.map(mapProduct);
  const lastPage = json.meta?.last_page ?? 1;

  if (lastPage <= 1) return products;

  // Fetch remaining pages in parallel
  const pagePromises: Promise<SkulyticsProductSummary[]>[] = [];
  for (let page = 2; page <= lastPage; page++) {
    const pageUrl = new URL(`${BASE_URL}/product`);
    pageUrl.searchParams.set("brand", brand);
    pageUrl.searchParams.set("category", skulyticsCat);
    pageUrl.searchParams.set("per_page", "500");
    pageUrl.searchParams.set("page", String(page));

    pagePromises.push(
      fetch(pageUrl.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      })
        .then((r) => (r.ok ? r.json() : { data: null }))
        .then((j: SkulyticsApiProductResponse) =>
          j.data ? j.data.map(mapProduct) : []
        )
        .catch(() => [])
    );
  }

  const pageResults = await Promise.all(pagePromises);
  return [...products, ...pageResults.flat()];
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
    for (const mapping of Object.values(SKULYTICS_CATEGORY_MAP)) {
      if (mapping.supported) {
        skulyticsCategories.push(...mapping.categories);
      }
    }
    skulyticsCategories = [...new Set(skulyticsCategories)];
  } else {
    const mapping = SKULYTICS_CATEGORY_MAP[category];
    if (!mapping?.supported || mapping.categories.length === 0) {
      return NextResponse.json({ products: [] });
    }
    skulyticsCategories = mapping.categories;
  }

  try {
    // Fetch ALL products for each category in parallel (with full pagination)
    const categoryResults = await Promise.all(
      skulyticsCategories.map((cat) => fetchAllForCategory(brand, cat, apiKey))
    );

    const allProducts = categoryResults.flat();

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
