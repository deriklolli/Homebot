import { NextRequest, NextResponse } from "next/server";

function resolveUrl(src: string, base: string): string {
  try {
    return new URL(src, base).href;
  } catch {
    return src;
  }
}

/**
 * Detect if a URL is an Amazon search page (e.g. /s?k=...).
 * These pages return the Amazon logo for og:image, so we need
 * a different strategy to extract actual product thumbnails.
 */
function isAmazonSearchUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("amazon.com") &&
      parsed.pathname === "/s"
    );
  } catch {
    return false;
  }
}

/**
 * Extract the first product image from an Amazon search results page.
 * Amazon product images in search results use the class "s-image"
 * and are hosted on m.media-amazon.com/images/I/.
 */
function extractAmazonProductImage(html: string): string | null {
  // Match <img> tags with class="s-image" and extract src
  const sImageMatch = html.match(
    /<img[^>]+class="s-image"[^>]+src="([^"]+)"/i
  );
  if (sImageMatch?.[1]) return sImageMatch[1];

  // Fallback: look for any media-amazon product image in search results
  // These are typically in the format: https://m.media-amazon.com/images/I/...
  const mediaMatch = html.match(
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9._%-]+\.(?:jpg|png|webp)/i
  );
  if (mediaMatch?.[0]) return mediaMatch[0];

  return null;
}

export async function POST(req: NextRequest) {
  const { url } = (await req.json()) as { url?: string };

  if (!url || typeof url !== "string") {
    return NextResponse.json({ thumbnailUrl: "", logoUrl: "" });
  }

  // Build Google favicon fallback from domain
  let faviconFallback = "";
  try {
    const domain = new URL(url).hostname;
    faviconFallback = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    // invalid URL
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ thumbnailUrl: "", logoUrl: faviconFallback });
    }

    const html = await res.text();

    // --- Title: og:title > <title> ---
    const ogTitleMatch =
      html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i
      );
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = ogTitleMatch?.[1] ?? titleTagMatch?.[1]?.trim() ?? "";

    // --- Amazon search pages: extract product images directly ---
    if (isAmazonSearchUrl(url)) {
      const productImage = extractAmazonProductImage(html);
      return NextResponse.json({
        thumbnailUrl: productImage || "",
        logoUrl: faviconFallback,
        title,
      });
    }

    // --- Thumbnail: og:image or twitter:image ---
    const ogMatch =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
      );

    const thumbnailUrl = ogMatch?.[1] ?? "";

    if (!thumbnailUrl) {
      const twMatch =
        html.match(
          /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
        ) ??
        html.match(
          /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
        );
      if (twMatch) {
        return NextResponse.json({
          thumbnailUrl: twMatch[1],
          logoUrl: twMatch[1],
          title,
        });
      }
    }

    // --- Logo: apple-touch-icon > icon > Google favicon fallback ---
    let logoUrl = thumbnailUrl;

    const touchIconMatch = html.match(
      /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i
    );
    if (touchIconMatch) {
      logoUrl = resolveUrl(touchIconMatch[1], url);
    } else {
      const iconMatch = html.match(
        /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i
      );
      if (iconMatch) {
        logoUrl = resolveUrl(iconMatch[1], url);
      } else if (faviconFallback) {
        logoUrl = faviconFallback;
      }
    }

    return NextResponse.json({
      thumbnailUrl: thumbnailUrl || logoUrl,
      logoUrl,
    });
  } catch {
    return NextResponse.json({ thumbnailUrl: "", logoUrl: faviconFallback });
  }
}
