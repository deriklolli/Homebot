import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AMAZON_ASSOCIATE_ID = "homebot0d-20";

/**
 * Appends the Amazon Associates affiliate tag to Amazon URLs.
 * Non-Amazon URLs are returned unchanged.
 */
export function affiliateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("amazon.com")) {
      parsed.searchParams.set("tag", AMAZON_ASSOCIATE_ID);
      return parsed.toString();
    }
  } catch {
    // invalid URL — return as-is
  }
  return url;
}

/**
 * Returns a purchase URL for an inventory item.
 * - If a purchaseUrl is provided, returns it (with affiliate tag if Amazon).
 * - If no purchaseUrl, returns an Amazon search for the item name with affiliate tag.
 */
export function buyNowUrl(itemName: string, purchaseUrl?: string): string {
  if (purchaseUrl) {
    return affiliateUrl(purchaseUrl);
  }
  const searchUrl = new URL("https://www.amazon.com/s");
  searchUrl.searchParams.set("k", itemName);
  searchUrl.searchParams.set("tag", AMAZON_ASSOCIATE_ID);
  return searchUrl.toString();
}
