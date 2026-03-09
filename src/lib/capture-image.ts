const BUCKET = "home-asset-images";

/**
 * Check if a URL is already a Supabase storage URL (already captured).
 */
export function isSupabaseStorageUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.startsWith(supabaseUrl) && url.includes("/storage/");
}

/**
 * Extract the storage path from a Supabase public URL (for cleanup).
 */
export function storagePathFromUrl(url: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const prefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  return null;
}

/**
 * Downloads an external image URL, uploads to Supabase storage,
 * and returns the permanent public URL.
 * If the URL is already a Supabase URL, returns it unchanged.
 * Falls back to the original URL on failure.
 */
export async function captureImageUrl(
  externalUrl: string,
  assetId: string,
  oldImageUrl?: string
): Promise<string> {
  // Skip if already in our storage
  if (isSupabaseStorageUrl(externalUrl)) {
    return externalUrl;
  }

  const oldStoragePath = oldImageUrl ? storagePathFromUrl(oldImageUrl) : null;

  try {
    const res = await fetch("/api/capture-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: externalUrl,
        assetId,
        oldStoragePath,
      }),
    });

    if (!res.ok) {
      console.warn("Image capture failed, using external URL as fallback");
      return externalUrl;
    }

    const data = await res.json();
    return data.publicUrl;
  } catch {
    console.warn("Image capture failed, using external URL as fallback");
    return externalUrl;
  }
}
