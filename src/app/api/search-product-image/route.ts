import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { make, model } = await req.json();

  if (!make || !model) {
    return NextResponse.json({ imageUrl: "" });
  }

  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    console.error("Missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_ID");
    return NextResponse.json({ imageUrl: "" });
  }

  try {
    const query = `${make} ${model}`;
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", cseId);
    url.searchParams.set("q", query);
    url.searchParams.set("searchType", "image");
    url.searchParams.set("num", "1");

    const res = await fetch(url.toString());
    const data = await res.json();

    const imageUrl = data.items?.[0]?.link ?? "";
    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("Google CSE image search failed:", err);
    return NextResponse.json({ imageUrl: "" });
  }
}
