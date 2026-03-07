import { NextResponse } from "next/server";

/** Domains to skip — forums, video, social media won't have good product info */
const SKIP_DOMAINS = [
  "youtube.com",
  "reddit.com",
  "facebook.com",
  "twitter.com",
  "instagram.com",
  "pinterest.com",
  "tiktok.com",
  "quora.com",
  "bing.com",
];

/** Domains more likely to have good product pages */
const PREFERRED_DOMAINS = [
  "homedepot.com",
  "lowes.com",
  "ajmadison.com",
  "build.com",
  "subzero-wolf.com",
  "samsung.com",
  "lg.com",
  "whirlpool.com",
  "ge.com",
  "bosch-home.com",
  "thermador.com",
  "kitchenaid.com",
  "maytag.com",
  "frigidaire.com",
  "electrolux.com",
];

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

interface EnrichResult {
  name: string;
  productUrl: string;
  imageUrl: string;
  dimensions: {
    width: string;
    height: string;
    depth: string;
    weight: string;
  } | null;
  warrantyYears: number | null;
  documents: { label: string; url: string }[];
}

const EMPTY_RESULT: EnrichResult = {
  name: "",
  productUrl: "",
  imageUrl: "",
  dimensions: null,
  warrantyYears: null,
  documents: [],
};

function shouldSkipUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SKIP_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return true;
  }
}

function isPreferredDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return PREFERRED_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return false;
  }
}

function resolveUrl(src: string, base: string): string {
  try {
    return new URL(src, base).href;
  } catch {
    return src;
  }
}

/** Decode common HTML entities in URLs and text */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x26;/g, "&")
    .replace(/&#x22;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Extract og:image or twitter:image from HTML */
function extractImage(html: string): string {
  const ogMatch =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    ) ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
    );
  if (ogMatch?.[1]) return decodeHtmlEntities(ogMatch[1]);

  const twMatch =
    html.match(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
    ) ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
    );
  return twMatch?.[1] ? decodeHtmlEntities(twMatch[1]) : "";
}

/** Extract and clean page title */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!match?.[1]) return "";
  return decodeHtmlEntities(
    match[1]
      .replace(/\s*[|\-–—]\s*(Home Depot|Lowe's|Amazon|Best Buy|Walmart|Wayfair).*$/i, "")
      .replace(/\s*[|\-–—]\s*Official Site.*$/i, "")
      .replace(/\*{1,2}/g, "")  // strip markdown bold markers
      .trim()
  );
}

/** Extract JSON-LD Product structured data */
function extractJsonLd(html: string): {
  name?: string;
  image?: string;
  dimensions?: { width: string; height: string; depth: string; weight: string };
  warrantyYears?: number;
} {
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const products = findProducts(data);

      for (const product of products) {
        const result: ReturnType<typeof extractJsonLd> = {};

        if (product.name) result.name = String(product.name);

        if (product.image) {
          if (typeof product.image === "string") {
            result.image = product.image;
          } else if (Array.isArray(product.image)) {
            const first = product.image[0];
            result.image = typeof first === "string"
              ? first
              : (first as Record<string, unknown>)?.url as string ?? (first as Record<string, unknown>)?.contentUrl as string;
          } else if (typeof product.image === "object") {
            const img = product.image as Record<string, unknown>;
            result.image = (img.url as string) || (img.contentUrl as string);
          }
        }

        const dims = extractDimensionsFromJsonLd(product);
        if (dims) result.dimensions = dims;

        const warrantyYears = extractWarrantyFromJsonLd(product);
        if (warrantyYears) result.warrantyYears = warrantyYears;

        if (Object.keys(result).length > 0) return result;
      }
    } catch {
      // Invalid JSON — skip
    }
  }

  return {};
}

/** Recursively find Product objects in JSON-LD (can be nested or in @graph) */
function findProducts(data: unknown): Record<string, unknown>[] {
  const products: Record<string, unknown>[] = [];

  if (!data || typeof data !== "object") return products;

  if (Array.isArray(data)) {
    for (const item of data) {
      products.push(...findProducts(item));
    }
    return products;
  }

  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"]) {
      products.push(...findProducts(item));
    }
  }

  const type = obj["@type"];
  if (
    type === "Product" ||
    (Array.isArray(type) && type.includes("Product"))
  ) {
    products.push(obj);
  }

  return products;
}

/** Extract dimensions from JSON-LD Product */
function extractDimensionsFromJsonLd(
  product: Record<string, unknown>
): { width: string; height: string; depth: string; weight: string } | undefined {
  let width = "";
  let height = "";
  let depth = "";
  let weight = "";

  if (Array.isArray(product.additionalProperty)) {
    for (const prop of product.additionalProperty) {
      if (!prop || typeof prop !== "object") continue;
      const p = prop as Record<string, unknown>;
      const name = String(p.name ?? "").toLowerCase();
      const value = String(p.value ?? "");
      if (name.includes("width")) width = value;
      else if (name.includes("height")) height = value;
      else if (name.includes("depth")) depth = value;
      else if (name.includes("weight")) weight = value;
    }
  }

  if (product.width && typeof product.width === "object") {
    width = String((product.width as Record<string, unknown>).value ?? "") +
      " " + String((product.width as Record<string, unknown>).unitCode ?? "");
  }
  if (product.height && typeof product.height === "object") {
    height = String((product.height as Record<string, unknown>).value ?? "") +
      " " + String((product.height as Record<string, unknown>).unitCode ?? "");
  }
  if (product.depth && typeof product.depth === "object") {
    depth = String((product.depth as Record<string, unknown>).value ?? "") +
      " " + String((product.depth as Record<string, unknown>).unitCode ?? "");
  }
  if (product.weight && typeof product.weight === "object") {
    weight = String((product.weight as Record<string, unknown>).value ?? "") +
      " " + String((product.weight as Record<string, unknown>).unitCode ?? "");
  }

  if (width || height || depth || weight) {
    return { width: width.trim(), height: height.trim(), depth: depth.trim(), weight: weight.trim() };
  }
  return undefined;
}

/** Extract warranty years from JSON-LD */
function extractWarrantyFromJsonLd(product: Record<string, unknown>): number | undefined {
  if (product.warranty && typeof product.warranty === "object") {
    const w = product.warranty as Record<string, unknown>;
    const duration = w.durationOfWarranty as Record<string, unknown> | undefined;
    if (duration?.value) {
      const years = parseInt(String(duration.value), 10);
      if (!isNaN(years) && years > 0) return years;
    }
  }

  return undefined;
}

/** Extract warranty years from page text via regex */
function extractWarrantyFromText(html: string): number | null {
  const match = html.match(/(\d+)\s*[-–]?\s*year\s+(?:limited\s+)?warranty/i);
  if (match?.[1]) {
    const years = parseInt(match[1], 10);
    if (years > 0 && years <= 25) return years;
  }
  return null;
}

/** Extract dimensions from page text via regex */
function extractDimensionsFromText(html: string): {
  width: string; height: string; depth: string; weight: string;
} | null {
  const dimMatch = html.match(
    /(\d+[\d./\s]*(?:"|in\.?|inches?))\s*[Ww]?\s*[x×]\s*(\d+[\d./\s]*(?:"|in\.?|inches?))\s*[Hh]?\s*[x×]\s*(\d+[\d./\s]*(?:"|in\.?|inches?))/
  );
  if (dimMatch) {
    return {
      width: dimMatch[1].trim(),
      height: dimMatch[2].trim(),
      depth: dimMatch[3].trim(),
      weight: "",
    };
  }
  return null;
}

/** Find PDF document links in HTML */
function extractPdfLinks(html: string, baseUrl: string): { label: string; url: string }[] {
  const docs: { label: string; url: string }[] = [];
  const seen = new Set<string>();

  const regex = /<a[^>]+href=["']([^"']*\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const url = resolveUrl(match[1], baseUrl);
    if (seen.has(url.toLowerCase())) continue;
    seen.add(url.toLowerCase());

    let label = match[2]
      .replace(/<[^>]+>/g, "")  // strip HTML tags
      .replace(/\s+/g, " ")
      .trim();

    // Clean up labels that captured data attributes or are too long/noisy
    if (label.includes('"') || label.includes("data-")) {
      const lastSegment = label.split(">").pop()?.trim() ?? "";
      label = lastSegment || label;
    }

    if (!label || label.length < 3 || label.toLowerCase() === "download") {
      const filename = url.split("/").pop()?.split("?")[0]?.replace(/\.pdf$/i, "").replace(/[-_]/g, " ") ?? "Document";
      label = filename.length > 3 ? filename : "Document";
    }

    // Truncate overly long labels
    if (label.length > 80) {
      label = label.slice(0, 77) + "...";
    }

    const lowerLabel = label.toLowerCase();
    const lowerUrl = url.toLowerCase();
    const combined = lowerLabel + " " + lowerUrl;

    if (combined.includes("manual") || combined.includes("guide") || combined.includes("owner")) {
      label = label.startsWith("Owner") || label.startsWith("User") || label.startsWith("Manual")
        ? label : `Manual: ${label}`;
    } else if (combined.includes("warranty")) {
      label = label.startsWith("Warranty") ? label : `Warranty: ${label}`;
    } else if (combined.includes("brochure") || combined.includes("catalog")) {
      label = label.startsWith("Brochure") ? label : `Brochure: ${label}`;
    } else if (combined.includes("spec") || combined.includes("dimension")) {
      label = label.startsWith("Spec") ? label : `Spec Sheet: ${label}`;
    } else if (combined.includes("install")) {
      label = label.startsWith("Install") ? label : `Installation: ${label}`;
    }

    docs.push({ label, url });
  }

  return docs.slice(0, 10);
}

// ─── Bing Search (no API key needed) ────────────────────────────────

interface BingSearchResult {
  url: string;
  title: string;
  imageUrl?: string;
}

/**
 * Use Bing Image Search to find product pages and images.
 * Bing image search returns both image URLs (murl) and the source page URLs (purl),
 * making it an effective web search proxy that also provides product images.
 * Unlike Bing web search, the image search endpoint doesn't trigger CAPTCHAs.
 */
async function bingImageSearchFull(query: string): Promise<{
  pages: BingSearchResult[];
  bestImage: string;
}> {
  const bingUrl = new URL("https://www.bing.com/images/search");
  bingUrl.searchParams.set("q", query);
  bingUrl.searchParams.set("first", "1");
  bingUrl.searchParams.set("count", "20");

  const res = await fetch(bingUrl.toString(), {
    headers: { ...FETCH_HEADERS, Accept: "text/html" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return { pages: [], bestImage: "" };

  const html = await res.text();

  // Extract page URLs, image URLs, and descriptions from Bing's embedded data
  const purls = [...html.matchAll(/purl&quot;:&quot;(https?:\/\/[^&]+)/g)].map((m) => m[1]);
  const murls = [...html.matchAll(/murl&quot;:&quot;(https?:\/\/[^&]+)/g)].map((m) => m[1]);
  const descs = [...html.matchAll(/desc&quot;:&quot;(.*?)&quot;/g)].map((m) =>
    m[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  );

  // Deduplicate page URLs, keeping first occurrence
  const seen = new Set<string>();
  const pages: BingSearchResult[] = [];

  for (let i = 0; i < purls.length; i++) {
    const url = purls[i];
    const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
    if (seen.has(host) || shouldSkipUrl(url)) continue;
    seen.add(host);

    pages.push({
      url,
      title: descs[i] ?? "",
      imageUrl: murls[i] ?? "",
    });
  }

  return {
    pages,
    bestImage: murls[0] ?? "",
  };
}

// ─── Scrape a product page for all enrichment data ──────────────────

async function scrapePage(url: string): Promise<{
  imageUrl: string;
  name: string;
  dimensions: EnrichResult["dimensions"];
  warrantyYears: number | null;
  documents: { label: string; url: string }[];
}> {
  const pageRes = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(10000),
    redirect: "follow",
  });

  if (!pageRes.ok) {
    return { imageUrl: "", name: "", dimensions: null, warrantyYears: null, documents: [] };
  }

  const html = await pageRes.text();

  let imageUrl = extractImage(html);
  let name = extractTitle(html);
  let dimensions: EnrichResult["dimensions"] = null;
  let warrantyYears: number | null = null;

  // JSON-LD takes priority (higher quality structured data)
  const jsonLd = extractJsonLd(html);
  if (jsonLd.name) name = jsonLd.name;
  if (jsonLd.image) imageUrl = jsonLd.image;
  if (jsonLd.dimensions) dimensions = jsonLd.dimensions;
  if (jsonLd.warrantyYears) warrantyYears = jsonLd.warrantyYears;

  // Fallback: extract dimensions and warranty from page text
  if (!dimensions) dimensions = extractDimensionsFromText(html);
  if (!warrantyYears) warrantyYears = extractWarrantyFromText(html);

  // Extract PDF document links
  const documents = extractPdfLinks(html, url);

  return { imageUrl, name, dimensions, warrantyYears, documents };
}

// ─── Main handler ───────────────────────────────────────────────────

export async function POST(req: Request) {
  const { make, model } = await req.json();

  if (!make || !model) {
    return NextResponse.json(EMPTY_RESULT);
  }

  const query = `${make} ${model}`;
  const result: EnrichResult = { ...EMPTY_RESULT, documents: [] };

  // ─── Step 1: Bing image search (returns page URLs + images) ─────
  let searchResults: BingSearchResult[] = [];

  try {
    const bing = await bingImageSearchFull(query);
    searchResults = bing.pages;
    if (bing.bestImage) {
      result.imageUrl = bing.bestImage;
    }
  } catch {
    console.warn("[enrich-product] Bing image search failed");
  }

  // Sort results: prefer retailer/manufacturer domains
  searchResults.sort((a, b) => {
    const aPreferred = isPreferredDomain(a.url) ? 0 : 1;
    const bPreferred = isPreferredDomain(b.url) ? 0 : 1;
    return aPreferred - bPreferred;
  });

  // ─── Step 2: Scrape top result pages (try up to 3) ──────────────
  for (const searchResult of searchResults.slice(0, 3)) {
    try {
      const scraped = await scrapePage(searchResult.url);

      // Use first URL as product URL
      if (!result.productUrl) result.productUrl = searchResult.url;

      // Merge scraped data (first non-empty value wins)
      if (scraped.imageUrl && !result.imageUrl) result.imageUrl = scraped.imageUrl;
      if (scraped.name && !result.name) result.name = scraped.name;
      if (scraped.dimensions && !result.dimensions) result.dimensions = scraped.dimensions;
      if (scraped.warrantyYears && !result.warrantyYears) result.warrantyYears = scraped.warrantyYears;

      // Accumulate PDF documents from all pages
      for (const doc of scraped.documents) {
        if (!result.documents.some((d) => d.url.toLowerCase() === doc.url.toLowerCase())) {
          result.documents.push(doc);
        }
      }

      // If we got a good image and product URL from a preferred domain, stop early
      if (result.imageUrl && result.name && isPreferredDomain(searchResult.url)) {
        result.productUrl = searchResult.url;
        break;
      }
    } catch {
      // Scrape failed — try next result
    }
  }

  // Use search result title as fallback name
  if (!result.name && searchResults.length > 0) {
    result.name = searchResults[0].title;
    if (!result.productUrl) result.productUrl = searchResults[0].url;
  }

  // ─── Step 3: Image fallback ──────────────────────────────────────
  if (!result.imageUrl) {
    const withImage = searchResults.find((r) => r.imageUrl);
    if (withImage?.imageUrl) result.imageUrl = withImage.imageUrl;
  }

  // ─── Step 4: PDF document search fallback ───────────────────────
  if (result.documents.length === 0) {
    try {
      const docQuery = `${make} ${model} manual OR brochure OR specifications pdf`;
      const bing = await bingImageSearchFull(docQuery);
      for (const item of bing.pages) {
        if (item.url.toLowerCase().endsWith(".pdf")) {
          result.documents.push({
            label: item.title || "Document",
            url: item.url,
          });
        }
      }
    } catch { /* continue */ }
  }

  // Cap documents
  result.documents = result.documents.slice(0, 10);

  return NextResponse.json(result);
}
