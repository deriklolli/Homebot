import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type {
  SkulyticsProductSummary,
  SkulyticsApiProductResponse,
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

  const query = req.nextUrl.searchParams.get("query");

  if (!query || query.length < 3) {
    return NextResponse.json({ products: [] });
  }

  const apiKey = process.env.SKULYTICS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ products: [] });
  }

  try {
    // Search by SKU without brand filter (API doesn't support combining them)
    // Filter by brand client-side instead
    const url = new URL(`${BASE_URL}/product`);
    url.searchParams.set("sku", query);
    url.searchParams.set("matching_rule", "contains");
    url.searchParams.set("per_page", "50");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ products: [] });
    }

    const json: SkulyticsApiProductResponse = await res.json();
    if (!json.data) {
      return NextResponse.json({ products: [] });
    }

    let products: SkulyticsProductSummary[] = json.data.map((p) => ({
      productId: p.product_id,
      sku: p.sku,
      name: p.name,
      brand: p.brand.brand_name,
      image: p.image,
      status: p.status,
    }));

    return NextResponse.json({ products });
  } catch (err) {
    console.error("Skulytics product search failed:", err);
    return NextResponse.json({ products: [] });
  }
}
