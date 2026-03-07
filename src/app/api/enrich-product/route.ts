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
];

interface EnrichResult {
  name: string;
  productUrl: string;
  imageUrl: string;
  description: string;
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
  description: "",
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

function resolveUrl(src: string, base: string): string {
  try {
    return new URL(src, base).href;
  } catch {
    return src;
  }
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
  if (ogMatch?.[1]) return ogMatch[1];

  const twMatch =
    html.match(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
    ) ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
    );
  return twMatch?.[1] ?? "";
}

/** Extract meta description */
function extractDescription(html: string): string {
  const match =
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    ) ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i
    ) ??
    html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
    ) ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i
    );
  return match?.[1]?.trim() ?? "";
}

/** Extract and clean page title */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!match?.[1]) return "";
  return match[1]
    .replace(/\s*[|\-–—]\s*(Home Depot|Lowe's|Amazon|Best Buy|Walmart|Wayfair).*$/i, "")
    .replace(/\s*[|\-–—]\s*Official Site.*$/i, "")
    .trim();
}

/** Extract JSON-LD Product structured data */
function extractJsonLd(html: string): {
  name?: string;
  image?: string;
  description?: string;
  dimensions?: { width: string; height: string; depth: string; weight: string };
  warrantyYears?: number;
} {
  // Find all JSON-LD script blocks
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const products = findProducts(data);

      for (const product of products) {
        const result: ReturnType<typeof extractJsonLd> = {};

        if (product.name) result.name = String(product.name);
        if (product.description) result.description = String(product.description);

        // Image — can be string, array of strings, or ImageObject
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

        // Dimensions — look in additionalProperty, or direct fields
        const dims = extractDimensionsFromJsonLd(product);
        if (dims) result.dimensions = dims;

        // Warranty — look in warranty field or offers
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

  // Check @graph array
  if (Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"]) {
      products.push(...findProducts(item));
    }
  }

  // Check if this object is a Product
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

  // Check additionalProperty array (common in manufacturer sites)
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

  // Check direct dimension fields
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
  // Check warranty field
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
  // Match patterns like "2-year warranty", "5 year limited warranty", etc.
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
  // Match patterns like '30" W x 18" H x 20" D' or '30 x 18 x 20 inches'
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

  // Match <a> tags with .pdf hrefs
  const regex = /<a[^>]+href=["']([^"']*\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const url = resolveUrl(match[1], baseUrl);
    if (seen.has(url.toLowerCase())) continue;
    seen.add(url.toLowerCase());

    // Clean the link text
    let label = match[2]
      .replace(/<[^>]+>/g, "") // strip inner HTML tags
      .replace(/\s+/g, " ")
      .trim();

    // Guess label from URL if link text is empty or generic
    if (!label || label.length < 3) {
      const filename = url.split("/").pop()?.replace(/\.pdf$/i, "").replace(/[-_]/g, " ") ?? "Document";
      label = filename;
    }

    // Categorize the document
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

  return docs.slice(0, 10); // Cap at 10 documents
}

export async function POST(req: Request) {
  const { make, model } = await req.json();

  if (!make || !model) {
    return NextResponse.json(EMPTY_RESULT);
  }

  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    return NextResponse.json(EMPTY_RESULT);
  }

  const result: EnrichResult = { ...EMPTY_RESULT, documents: [] };

  try {
    // Step 1: Google CSE web search
    const searchUrl = new URL("https://www.googleapis.com/customsearch/v1");
    searchUrl.searchParams.set("key", apiKey);
    searchUrl.searchParams.set("cx", cseId);
    searchUrl.searchParams.set("q", `${make} ${model}`);
    searchUrl.searchParams.set("num", "5");

    const searchRes = await fetch(searchUrl.toString(), {
      signal: AbortSignal.timeout(8000),
    });
    const searchData = await searchRes.json();

    const items: { link: string; title?: string; pagemap?: { cse_image?: { src: string }[] } }[] =
      searchData.items ?? [];

    // Pick the best result (skip forums/social media)
    const bestItem = items.find((item) => !shouldSkipUrl(item.link));

    if (bestItem) {
      result.productUrl = bestItem.link;

      // Google CSE sometimes includes images in pagemap
      if (bestItem.pagemap?.cse_image?.[0]?.src) {
        result.imageUrl = bestItem.pagemap.cse_image[0].src;
      }

      // Step 2: Scrape the product page
      try {
        const pageRes = await fetch(result.productUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (pageRes.ok) {
          const html = await pageRes.text();

          // Extract from meta tags
          const scraped = extractImage(html);
          if (scraped) result.imageUrl = scraped;
          const title = extractTitle(html);
          if (title) result.name = title;
          result.description = extractDescription(html);

          // Extract from JSON-LD (higher quality structured data)
          const jsonLd = extractJsonLd(html);
          if (jsonLd.name) result.name = jsonLd.name;
          if (jsonLd.image) result.imageUrl = jsonLd.image;
          if (jsonLd.description) result.description = jsonLd.description;
          if (jsonLd.dimensions) result.dimensions = jsonLd.dimensions;
          if (jsonLd.warrantyYears) result.warrantyYears = jsonLd.warrantyYears;

          // Fallback: extract dimensions and warranty from page text
          if (!result.dimensions) {
            result.dimensions = extractDimensionsFromText(html);
          }
          if (!result.warrantyYears) {
            result.warrantyYears = extractWarrantyFromText(html);
          }

          // Extract PDF document links
          result.documents = extractPdfLinks(html, result.productUrl);
        }
      } catch {
        // Page scrape failed — use what we have from search results
        if (bestItem.title) result.name = bestItem.title;
      }

      // Use search result title as fallback name
      if (!result.name && bestItem.title) {
        result.name = bestItem.title;
      }
    }

    // Step 3: If still no image, fall back to Google CSE image search
    if (!result.imageUrl) {
      try {
        const imgUrl = new URL("https://www.googleapis.com/customsearch/v1");
        imgUrl.searchParams.set("key", apiKey);
        imgUrl.searchParams.set("cx", cseId);
        imgUrl.searchParams.set("q", `${make} ${model}`);
        imgUrl.searchParams.set("searchType", "image");
        imgUrl.searchParams.set("num", "1");

        const imgRes = await fetch(imgUrl.toString(), {
          signal: AbortSignal.timeout(8000),
        });
        const imgData = await imgRes.json();
        result.imageUrl = imgData.items?.[0]?.link ?? "";
      } catch {
        // Image search failed — continue with what we have
      }
    }

    // Step 4: If no PDF docs from the main page, check other search results for PDFs
    if (result.documents.length === 0) {
      // Search specifically for manuals/specs
      try {
        const docSearchUrl = new URL("https://www.googleapis.com/customsearch/v1");
        docSearchUrl.searchParams.set("key", apiKey);
        docSearchUrl.searchParams.set("cx", cseId);
        docSearchUrl.searchParams.set("q", `${make} ${model} manual OR brochure OR specifications filetype:pdf`);
        docSearchUrl.searchParams.set("num", "5");

        const docRes = await fetch(docSearchUrl.toString(), {
          signal: AbortSignal.timeout(8000),
        });
        const docData = await docRes.json();
        const docItems: { link: string; title?: string }[] = docData.items ?? [];

        for (const item of docItems) {
          if (item.link?.toLowerCase().endsWith(".pdf")) {
            result.documents.push({
              label: item.title ?? "Document",
              url: item.link,
            });
          }
        }
      } catch {
        // Document search failed — continue
      }
    }
  } catch {
    // Entire enrichment failed — return empty
  }

  return NextResponse.json(result);
}
