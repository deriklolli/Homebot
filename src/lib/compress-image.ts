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

/**
 * Send the file to the server for conversion via sharp.
 * Handles HEIC and any other format the browser can't decode.
 */
async function serverConvert(file: File): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/convert-image", { method: "POST", body: form });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server conversion failed: ${res.status}`);
  }

  return res.blob();
}

/**
 * Compresses an image file to JPEG.
 *   1. Try client-side canvas (works for JPEG/PNG/WebP and HEIC on Safari)
 *   2. Fall back to server-side sharp conversion (handles all formats including HEIC)
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.8
): Promise<Blob> {
  // Try native browser decoding first
  try {
    return await resizeToJpeg(file, maxWidth, quality);
  } catch {
    // Browser can't decode this format (e.g. HEIC on Chrome)
  }

  // Fall back to server-side conversion via sharp
  return serverConvert(file);
}
