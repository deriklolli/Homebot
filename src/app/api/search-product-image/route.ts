import { NextResponse } from "next/server";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function POST(req: Request) {
  const { make, model, category } = await req.json();

  if (!make || !model) {
    return NextResponse.json({ imageUrl: "" });
  }

  try {
    const query = category
      ? `${make} ${model} ${category}`
      : `${make} ${model}`;

    const bingUrl = new URL("https://www.bing.com/images/search");
    bingUrl.searchParams.set("q", query);
    bingUrl.searchParams.set("first", "1");
    bingUrl.searchParams.set("count", "10");

    const res = await fetch(bingUrl.toString(), {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ imageUrl: "" });
    }

    const html = await res.text();
    const murls = [...html.matchAll(/murl&quot;:&quot;(https?:\/\/[^&]+)/g)].map((m) => m[1]);

    return NextResponse.json({ imageUrl: murls[0] ?? "" });
  } catch (err) {
    console.error("Bing image search failed:", err);
    return NextResponse.json({ imageUrl: "" });
  }
}
