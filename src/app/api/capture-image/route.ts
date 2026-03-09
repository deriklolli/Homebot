import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

const MAX_WIDTH = 800;
const JPEG_QUALITY = 80;
const BUCKET = "home-asset-images";
const FETCH_TIMEOUT = 10_000;

export async function POST(req: NextRequest) {
  try {
    const { url, assetId, oldStoragePath } = await req.json();

    if (!url || !assetId) {
      return NextResponse.json({ error: "Missing url or assetId" }, { status: 400 });
    }

    // Download image from external URL
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HOMEBOT/1.0)",
        Accept: "image/*",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "URL did not return an image" }, { status: 400 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // Compress with sharp
    const jpeg = await sharp(buffer)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    // Upload to Supabase storage
    const supabase = await createClient();
    const storagePath = `${assetId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, jpeg, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
      });

    if (uploadError) {
      console.error("Storage upload failed:", uploadError);
      return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
    }

    // Clean up old stored image if provided
    if (oldStoragePath) {
      await supabase.storage.from(BUCKET).remove([oldStoragePath]).catch(() => {});
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      publicUrl: publicUrlData.publicUrl,
      storagePath,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("capture-image error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
