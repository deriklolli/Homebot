import { NextRequest, NextResponse } from "next/server";

interface ScrapeResult {
  address: string | null;
  photoUrl: string | null;
  estimatedValue: number | null;
  valueTrend: "up" | "down" | null;
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function extractMeta(html: string, property: string): string | null {
  const re1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const m1 = html.match(re1);
  if (m1) return m1[1];

  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i"
  );
  const m2 = html.match(re2);
  return m2 ? m2[1] : null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function parseAddress(ogTitle: string | null, pageTitle: string | null): string | null {
  const raw = ogTitle || pageTitle;
  if (!raw) return null;
  return raw
    .replace(/\s*[|–—-]\s*Redfin.*$/i, "")       // strip "| Redfin" suffix
    .replace(/\s*[|·]\s*\d+\s*beds?.*$/i, "")     // strip "| 3 beds ..." or "· 3 beds ..."
    .replace(/\s*[|·]\s*\d+\s*baths?.*$/i, "")    // strip "| 2 baths ..." or "· 2 baths ..."
    .replace(/\s*[|·]\s*[\d,]+\s*sq\s*ft.*$/i, "") // strip sqft info
    .trim() || null;
}

/**
 * Extract the Redfin property ID from a URL.
 * Patterns: /home/31548018 or /apartment/12345
 */
function extractPropertyId(url: string): string | null {
  const m = url.match(/\/(?:home|apartment)\/(\d+)/);
  return m ? m[1] : null;
}

/**
 * Try Redfin's internal AVM (Automated Valuation Model) API
 * to get the Redfin Estimate (predicted sale price).
 */
async function fetchRedfinEstimate(
  propertyId: string
): Promise<{ estimatedValue: number | null; valueTrend: "up" | "down" | null }> {
  try {
    // Redfin's stingray API — note: parameter is "propertyId" (camelCase)
    const avmUrl = `https://www.redfin.com/stingray/api/home/details/avm?propertyId=${propertyId}&accessLevel=1`;

    const res = await fetch(avmUrl, {
      headers: {
        ...BROWSER_HEADERS,
        Accept: "*/*",
        Referer: "https://www.redfin.com/",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { estimatedValue: null, valueTrend: null };

    const text = await res.text();
    // Redfin wraps JSON responses with {}&&{ ... } — strip the prefix
    const jsonStr = text.replace(/^\s*\{\}\s*&&\s*/, "");
    const data = JSON.parse(jsonStr);

    const payload = data?.payload;
    if (!payload) return { estimatedValue: null, valueTrend: null };

    // predictedValue is the Redfin Estimate (estimated sale price)
    const predictedValue = payload.predictedValue ?? null;
    const estimatedValue = predictedValue ? Math.round(predictedValue) : null;

    // Determine trend: compare estimate vs last sold price
    // If the estimate is higher than what the home last sold for, it's trending up
    let valueTrend: "up" | "down" | null = null;
    const lastSoldPrice = payload.priceInfo?.amount;
    if (estimatedValue && lastSoldPrice) {
      if (estimatedValue > lastSoldPrice) valueTrend = "up";
      else if (estimatedValue < lastSoldPrice) valueTrend = "down";
    }

    return { estimatedValue, valueTrend };
  } catch {
    return { estimatedValue: null, valueTrend: null };
  }
}

/**
 * Fallback: parse a dollar amount from text (og:description, etc.)
 */
function parseValue(text: string | null): number | null {
  if (!text) return null;
  const m = text.match(/\$[\d,]+/);
  if (!m) return null;
  const num = parseInt(m[0].replace(/[$,]/g, ""), 10);
  return isNaN(num) ? null : num;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!parsed.hostname.includes("redfin.com")) {
      return NextResponse.json({ error: "Please provide a Redfin URL" }, { status: 400 });
    }

    // Scrape the property page for photo + address
    const pageRes = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!pageRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page (${pageRes.status})` },
        { status: 502 }
      );
    }

    const html = await pageRes.text();

    const ogImage = extractMeta(html, "og:image");
    const ogTitle = extractMeta(html, "og:title");
    const ogDescription = extractMeta(html, "og:description");
    const pageTitle = extractTitle(html);

    // Try the Redfin AVM API for the estimated sale price
    const propertyId = extractPropertyId(url);
    let estimatedValue: number | null = null;
    let valueTrend: "up" | "down" | null = null;

    if (propertyId) {
      const avm = await fetchRedfinEstimate(propertyId);
      estimatedValue = avm.estimatedValue;
      valueTrend = avm.valueTrend;
    }

    // Fallback: try parsing value from meta tags
    if (!estimatedValue) {
      estimatedValue = parseValue(ogDescription) || parseValue(ogTitle);
    }

    const result: ScrapeResult = {
      address: parseAddress(ogTitle, pageTitle),
      photoUrl: ogImage,
      estimatedValue,
      valueTrend,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("scrape-home error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
