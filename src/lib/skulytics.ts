import type { AssetCategory } from "./home-assets-data";
export type { AssetCategory } from "./home-assets-data";

// --- Normalized types for client consumption ---

export interface SkulyticsBrand {
  id: number;
  name: string;
  slug: string;
  image: string;
}

export interface SkulyticsProductSummary {
  productId: number;
  sku: string;
  name: string;
  brand: string;
  image: string;
  status: string;
}

export interface SkulyticsProductDetail {
  productId: number;
  sku: string;
  name: string;
  brand: string;
  image: string;
  productUrl: string;
  warrantyMonths: number | null;
  manualUrl: string | null;
  dimensions: {
    width: string | null;
    height: string | null;
    depth: string | null;
    weight: string | null;
  };
  productDocuments: Array<{ role: string; url: string }>;
}

// --- Category mapping ---

interface SkulyticsMapping {
  supported: boolean;
  categories: string[];
  subcategories?: string[];
}

export const SKULYTICS_CATEGORY_MAP: Record<AssetCategory, SkulyticsMapping> = {
  Kitchen: {
    supported: true,
    categories: ["Cooking", "Dishwashers", "Refrigeration"],
  },
  Laundry: {
    supported: true,
    categories: ["Washers & Dryers"],
  },
  "HVAC & Climate": {
    supported: true,
    categories: ["Other"],
    subcategories: ["Air Conditioners", "Dehumidifiers"],
  },
  "Water Systems": {
    supported: true,
    categories: ["Other"],
    subcategories: ["Water Heaters", "Water Dispensers"],
  },
  "Electrical & Safety": {
    supported: false,
    categories: [],
  },
  "Outdoor / Exterior": {
    supported: true,
    categories: ["Outdoor"],
  },
  "Plumbing Fixtures": {
    supported: true,
    categories: ["Sinks & Faucets"],
  },
  "Entertainment / Tech": {
    supported: false,
    categories: [],
  },
};

export function isSkulyticsSupported(category: AssetCategory): boolean {
  return SKULYTICS_CATEGORY_MAP[category]?.supported ?? false;
}

// --- Raw API response types ---

export interface SkulyticsApiBrandResponse {
  code: string;
  message: string;
  data: Array<{
    id: number;
    name: string;
    slug: string;
    image: string;
    banner: string;
  }> | null;
  meta: unknown;
  errors: unknown;
}

export interface SkulyticsApiProductResponse {
  code: string;
  message: string;
  data: Array<{
    product_id: number;
    sku: string;
    name: string;
    image: string;
    status: string;
    link: string;
    brand: {
      brand_id: number;
      brand_name: string;
      brand_slug: string;
      brand_image: string;
    };
    product_documents?: Array<{
      id: number;
      url: string;
      role: string;
      priority: number;
    }>;
    product_spec?: Array<{
      section: string;
      category: string;
      spec: string;
    }>;
  }> | null;
  meta: {
    current_page: number;
    total: number;
    per_page: number;
    last_page: number;
  } | null;
  errors: unknown;
}
