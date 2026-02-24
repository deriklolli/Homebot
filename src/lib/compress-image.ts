/**
 * Resize a blob via canvas and export as JPEG.
 * Includes a timeout to prevent hanging on unsupported formats.
 */
function resizeToJpeg(blob: Blob, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Image decode timed out"));
    }, 5000);

    const img = new Image();
    img.onload = () => {
      clearTimeout(timeout);
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
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Failed to load image"));
    };
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
 *   1. For HEIC files, skip canvas and go straight to heic2any
 *   2. For other formats, use client-side canvas
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.8
): Promise<Blob> {
  // For HEIC/HEIF, convert client-side with heic2any (skip canvas — most browsers can't decode it)
  if (isHeic(file)) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality,
    });
    const jpeg = Array.isArray(converted) ? converted[0] : converted;
    return resizeToJpeg(jpeg, maxWidth, quality);
  }

  // For standard formats, use canvas directly
  return resizeToJpeg(file, maxWidth, quality);
}
