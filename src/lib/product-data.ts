import type { AssetCategory } from "./home-assets-data";
export type { AssetCategory } from "./home-assets-data";

// --- Normalized types (provider-agnostic) ---

export interface ProductBrand {
  id: number;
  name: string;
  slug: string;
  image: string;
}

export interface ProductSummary {
  productId: number;
  sku: string;
  name: string;
  brand: string;
  image: string;
  status: string;
}

export interface ProductDetail {
  productId: number;
  sku: string;
  name: string;
  brand: string;
  image: string;
  productUrl: string;
  warrantyMonths: number | null;
  manualUrl: string | null;
  dimensions?: {
    width: string | null;
    height: string | null;
    depth: string | null;
    weight: string | null;
  };
}

// --- ENERGY STAR Dataset Configuration ---

export interface DatasetConfig {
  /** SODA dataset identifier (e.g., "p5st-her9") */
  datasetId: string;
  /** The field name that contains the brand (varies by dataset) */
  brandField: string;
  /** Human-readable label for this appliance type */
  label: string;
}

interface CategoryMapping {
  supported: boolean;
  datasets: DatasetConfig[];
}

export const ENERGYSTAR_DATASET_MAP: Record<AssetCategory, CategoryMapping> = {
  Kitchen: {
    supported: true,
    datasets: [
      { datasetId: "p5st-her9", brandField: "brand_name", label: "Refrigerators" },
      { datasetId: "58b3-559d", brandField: "brand_name", label: "Dishwashers" },
    ],
  },
  Laundry: {
    supported: true,
    datasets: [
      { datasetId: "bghd-e2wd", brandField: "brand_name", label: "Clothes Washers" },
      { datasetId: "t9u7-4d2j", brandField: "brand_name", label: "Clothes Dryers" },
    ],
  },
  "HVAC & Climate": {
    supported: true,
    datasets: [
      { datasetId: "i97v-e8au", brandField: "brand_name", label: "Furnaces" },
      { datasetId: "6rww-hpns", brandField: "brand_name", label: "Boilers" },
      { datasetId: "w7cv-9xjt", brandField: "outdoor_unit_brand_name", label: "Air-Source Heat Pumps" },
      { datasetId: "akti-mt5s", brandField: "outdoor_unit_brand_name", label: "Mini-Split Heat Pumps" },
      { datasetId: "2te3-nmxp", brandField: "brand_name", label: "Ceiling Fans" },
      { datasetId: "mgiu-hu4z", brandField: "brand_name", label: "Dehumidifiers" },
      { datasetId: "5xn2-dv4h", brandField: "brand_name", label: "Room Air Conditioners" },
    ],
  },
  "Water Systems": {
    supported: true,
    datasets: [
      { datasetId: "pbpq-swnu", brandField: "brand_name", label: "Water Heaters" },
      { datasetId: "v7jr-74b4", brandField: "brand_name", label: "Heat Pump Water Heaters" },
    ],
  },
  "Electrical & Safety": { supported: false, datasets: [] },
  "Outdoor / Exterior": { supported: false, datasets: [] },
  "Plumbing Fixtures": { supported: false, datasets: [] },
  "Entertainment / Tech": { supported: false, datasets: [] },
};

export function isProductLookupSupported(category: AssetCategory): boolean {
  return ENERGYSTAR_DATASET_MAP[category]?.supported ?? false;
}

// --- SODA API helper ---

const SODA_BASE = "https://data.energystar.gov/resource";

export function buildSodaUrl(datasetId: string, params: Record<string, string>): string {
  const url = new URL(`${SODA_BASE}/${datasetId}.json`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
