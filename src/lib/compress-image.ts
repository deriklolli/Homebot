import heic2any from "heic2any";

/**
 * Resize a blob via canvas and export as JPEG.
 */
function resizeToJpeg(blob: Blob, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (out) => {
          if (out) resolve(out);
          else reject(new Error("Compression failed"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(blob);
  });
}

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

/**
 * Compresses an image file to JPEG.
 *   1. Try client-side canvas (works for JPEG/PNG/WebP and HEIC on Safari)
 *   2. For HEIC on non-Safari browsers, convert client-side via heic2any
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.8
): Promise<Blob> {
  // Try native browser decoding first (handles most formats + HEIC on Safari)
  try {
    return await resizeToJpeg(file, maxWidth, quality);
  } catch {
    // Browser can't decode this format
  }

  // For HEIC/HEIF, convert client-side with heic2any
  if (isHeic(file)) {
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality,
    });
    const jpeg = Array.isArray(converted) ? converted[0] : converted;
    return resizeToJpeg(jpeg, maxWidth, quality);
  }

  throw new Error(`Unsupported image format: ${file.name}`);
}
