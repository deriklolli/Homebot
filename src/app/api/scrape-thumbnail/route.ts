import { NextRequest, NextResponse } from "next/server";

function resolveUrl(src: string, base: string): string {
  try {
    return new URL(src, base).href;
  } catch {
    return src;
  }
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
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ thumbnailUrl: "", logoUrl: faviconFallback });
    }

    const html = await res.text();

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
