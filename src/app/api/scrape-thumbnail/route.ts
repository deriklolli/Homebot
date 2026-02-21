import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = (await req.json()) as { url?: string };

  if (!url || typeof url !== "string") {
    return NextResponse.json({ thumbnailUrl: "" });
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
      return NextResponse.json({ thumbnailUrl: "" });
    }

    const html = await res.text();

    // Try og:image first, then twitter:image
    const ogMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
      );

    if (ogMatch) {
      return NextResponse.json({ thumbnailUrl: ogMatch[1] });
    }

    const twMatch = html.match(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
    ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
      );

    if (twMatch) {
      return NextResponse.json({ thumbnailUrl: twMatch[1] });
    }

    return NextResponse.json({ thumbnailUrl: "" });
  } catch {
    return NextResponse.json({ thumbnailUrl: "" });
  }
}
