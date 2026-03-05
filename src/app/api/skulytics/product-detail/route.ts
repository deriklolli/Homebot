import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { SkulyticsProductDetail, SkulyticsApiProductResponse } from "@/lib/skulytics";

const BASE_URL = "https://api.skulytics.io";

// In-memory cache: sku → { product, expiry }
const detailCache = new Map<string, { data: SkulyticsProductDetail; expiry: number }>();
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
  if (!sku) {
    return NextResponse.json({ product: null });
  }

  const apiKey = process.env.SKULYTICS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ product: null });
  }

  // Check cache
  const cached = detailCache.get(sku);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json({ product: cached.data });
  }

  try {
    // Try exact match first
    const url = new URL(`${BASE_URL}/product`);
    url.searchParams.set("sku", sku);
    url.searchParams.set("matching_rule", "exact");

    let res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ product: null });
    }

    let json: SkulyticsApiProductResponse = await res.json();
    let item = json.data?.[0];

    // Fallback: try "contains" matching if exact didn't find anything
    if (!item) {
      const fallbackUrl = new URL(`${BASE_URL}/product`);
      fallbackUrl.searchParams.set("sku", sku);
      fallbackUrl.searchParams.set("matching_rule", "contains");
      fallbackUrl.searchParams.set("per_page", "5");

      const fallbackRes = await fetch(fallbackUrl.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });

      if (fallbackRes.ok) {
        json = await fallbackRes.json();
        item = json.data?.[0];
      }
    }

    if (!item) {
      return NextResponse.json({ product: null });
    }

    // Extract warranty months from specs if available
    let warrantyMonths: number | null = null;
    if (item.product_spec) {
      const warrantySpec = item.product_spec.find(
        (s) =>
          s.category.toLowerCase().includes("warranty") ||
          s.spec.toLowerCase().includes("warranty")
      );
      if (warrantySpec) {
        const match = warrantySpec.spec.match(/(\d+)\s*(?:month|year)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          warrantyMonths = warrantySpec.spec.toLowerCase().includes("year")
            ? num * 12
            : num;
        }
      }
    }

    // Find manual/user guide document
    const manualDoc = item.product_documents?.find(
      (d) =>
        d.role.toLowerCase().includes("manual") ||
        d.role.toLowerCase().includes("guide") ||
        d.role.toLowerCase().includes("owner")
    );

    // Extract dimensions from product_spec
    const dimSpecs = (item.product_spec ?? []).filter(
      (s) => s.section.toLowerCase().includes("dimension") || s.section.toLowerCase().includes("weight")
    );
    function findSpec(keywords: string[]): string | null {
      const spec = dimSpecs.find((s) =>
        keywords.some((k) => s.category.toLowerCase().includes(k))
      );
      return spec?.spec ?? null;
    }

    // Collect all product documents
    const productDocuments = (item.product_documents ?? []).map((d) => ({
      role: d.role,
      url: d.url,
    }));

    const product: SkulyticsProductDetail = {
      productId: item.product_id,
      sku: item.sku,
      name: item.name,
      brand: item.brand.brand_name,
      image: item.image,
      productUrl: item.link || "",
      warrantyMonths,
      manualUrl: manualDoc?.url ?? null,
      dimensions: {
        width: findSpec(["width"]),
        height: findSpec(["height"]),
        depth: findSpec(["depth"]),
        weight: findSpec(["weight", "net weight"]),
      },
      productDocuments,
    };

    // Cache
    detailCache.set(sku, { data: product, expiry: Date.now() + CACHE_TTL });

    return NextResponse.json({ product });
  } catch (err) {
    console.error("Skulytics product detail fetch failed:", err);
    return NextResponse.json({ product: null });
  }
}
