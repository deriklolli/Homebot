import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { execFile } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 80;

/**
 * Convert using sharp (works on Linux/Vercel where HEIF is built in).
 */
async function convertWithSharp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

/**
 * Convert using macOS `sips` command (built-in, handles all HEIC variants).
 */
async function convertWithSips(buffer: Buffer): Promise<Buffer> {
  const id = randomUUID();
  const inputPath = join(tmpdir(), `${id}-input`);
  const outputPath = join(tmpdir(), `${id}-output.jpg`);

  await writeFile(inputPath, buffer);

  await new Promise<void>((resolve, reject) => {
    execFile(
      "sips",
      [
        "-s", "format", "jpeg",
        "-s", "formatOptions", String(JPEG_QUALITY),
        "--resampleWidth", String(MAX_WIDTH),
        inputPath,
        "--out", outputPath,
      ],
      (err) => (err ? reject(err) : resolve())
    );
  });

  const jpeg = await readFile(outputPath);

  // Clean up temp files
  await Promise.all([unlink(inputPath), unlink(outputPath)]).catch(() => {});

  return Buffer.from(jpeg);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let jpeg: Buffer;
    try {
      jpeg = await convertWithSharp(buffer);
    } catch {
      // sharp failed (likely missing HEIF codec on macOS) — try sips
      jpeg = await convertWithSips(buffer);
    }

    return new NextResponse(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("convert-image error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
