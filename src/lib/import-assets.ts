import Papa from "papaparse";
import { CATEGORY_OPTIONS, type AssetCategory, type HomeAsset } from "./home-assets-data";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ImportRowError {
  field: string;
  message: string;
}

export interface ValidatedRow {
  rowIndex: number;
  data: Omit<HomeAsset, "id" | "createdAt">;
  errors: ImportRowError[];
  selected: boolean;
}

type RawRow = Record<string, string>;

/* ------------------------------------------------------------------ */
/*  Header mapping                                                     */
/* ------------------------------------------------------------------ */

type AssetField = keyof Omit<HomeAsset, "id" | "createdAt">;

const HEADER_MAP: Record<string, AssetField> = {
  name: "name",
  "asset name": "name",
  category: "category",
  make: "make",
  brand: "make",
  manufacturer: "make",
  model: "model",
  "model number": "model",
  "serial number": "serialNumber",
  serial: "serialNumber",
  serial_number: "serialNumber",
  "purchase date": "purchaseDate",
  purchase_date: "purchaseDate",
  purchased: "purchaseDate",
  "install date": "purchaseDate",
  "warranty expiration": "warrantyExpiration",
  warranty_expiration: "warrantyExpiration",
  warranty: "warrantyExpiration",
  location: "location",
  notes: "notes",
  "product url": "productUrl",
  product_url: "productUrl",
  url: "productUrl",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

/* ------------------------------------------------------------------ */
/*  Category matching                                                  */
/* ------------------------------------------------------------------ */

function matchCategory(raw: string): AssetCategory | null {
  const lower = raw.trim().toLowerCase();
  if (!lower) return null;

  // Exact match (case-insensitive)
  for (const cat of CATEGORY_OPTIONS) {
    if (cat.toLowerCase() === lower) return cat;
  }

  // Partial / keyword match
  for (const cat of CATEGORY_OPTIONS) {
    const catLower = cat.toLowerCase();
    if (catLower.includes(lower) || lower.includes(catLower)) return cat;
  }

  // Common abbreviations
  const abbrevMap: Record<string, AssetCategory> = {
    hvac: "HVAC & Climate",
    climate: "HVAC & Climate",
    water: "Water Systems",
    electrical: "Electrical & Safety",
    safety: "Electrical & Safety",
    outdoor: "Outdoor / Exterior",
    exterior: "Outdoor / Exterior",
    plumbing: "Plumbing Fixtures",
    entertainment: "Entertainment / Tech",
    tech: "Entertainment / Tech",
  };

  return abbrevMap[lower] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Date parsing                                                       */
/* ------------------------------------------------------------------ */

function parseDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // MM/DD/YYYY
  const mdyFull = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyFull) {
    const [, m, d, y] = mdyFull;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // MM/DD/YY
  const mdyShort = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mdyShort) {
    const [, m, d, y] = mdyShort;
    const fullYear = parseInt(y) > 50 ? `19${y}` : `20${y}`;
    return `${fullYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Excel serial number (5-digit integer)
  if (/^\d{5}$/.test(trimmed)) {
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + parseInt(trimmed) * 86400000);
    return date.toISOString().split("T")[0];
  }

  // Fallback: native Date parse
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

  return null;
}

/* ------------------------------------------------------------------ */
/*  File parsing                                                       */
/* ------------------------------------------------------------------ */

export async function parseFile(file: File): Promise<RawRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
      defval: "",
      raw: false,
    });
    return rows;
  }

  // CSV
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => resolve(result.data),
      error: (err) => reject(err),
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Row mapping & validation                                           */
/* ------------------------------------------------------------------ */

function mapRow(raw: RawRow): Record<AssetField, string> {
  const mapped: Partial<Record<AssetField, string>> = {};

  for (const [rawKey, value] of Object.entries(raw)) {
    const normalized = normalizeHeader(rawKey);
    const field = HEADER_MAP[normalized];
    if (field && !mapped[field]) {
      mapped[field] = typeof value === "string" ? value : String(value ?? "");
    }
  }

  return {
    name: mapped.name ?? "",
    category: mapped.category ?? "",
    make: mapped.make ?? "",
    model: mapped.model ?? "",
    serialNumber: mapped.serialNumber ?? "",
    purchaseDate: mapped.purchaseDate ?? "",
    warrantyExpiration: mapped.warrantyExpiration ?? "",
    location: mapped.location ?? "",
    notes: mapped.notes ?? "",
    productUrl: mapped.productUrl ?? "",
  };
}

export function validateRows(rawRows: RawRow[]): ValidatedRow[] {
  return rawRows.map((raw, i) => {
    const mapped = mapRow(raw);
    const errors: ImportRowError[] = [];

    // Name (required)
    const name = mapped.name.trim();
    if (!name) {
      errors.push({ field: "name", message: "Name is required" });
    }

    // Category (required, fuzzy-matched)
    const category = matchCategory(mapped.category);
    if (!category) {
      errors.push({
        field: "category",
        message: mapped.category.trim()
          ? `"${mapped.category.trim()}" is not a valid category`
          : "Category is required",
      });
    }

    // Dates
    let purchaseDate: string | null = null;
    if (mapped.purchaseDate.trim()) {
      purchaseDate = parseDate(mapped.purchaseDate);
      if (!purchaseDate) {
        errors.push({ field: "purchaseDate", message: "Invalid date format" });
      }
    }

    let warrantyExpiration: string | null = null;
    if (mapped.warrantyExpiration.trim()) {
      warrantyExpiration = parseDate(mapped.warrantyExpiration);
      if (!warrantyExpiration) {
        errors.push({ field: "warrantyExpiration", message: "Invalid date format" });
      }
    }

    const data: Omit<HomeAsset, "id" | "createdAt"> = {
      name,
      category: category ?? ("Kitchen" as AssetCategory),
      make: mapped.make.trim(),
      model: mapped.model.trim(),
      serialNumber: mapped.serialNumber.trim(),
      purchaseDate,
      warrantyExpiration,
      location: mapped.location.trim(),
      notes: mapped.notes.trim(),
      productUrl: mapped.productUrl.trim(),
    };

    return {
      rowIndex: i + 1,
      data,
      errors,
      selected: errors.length === 0,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Template generation                                                */
/* ------------------------------------------------------------------ */

export function generateTemplate(): string {
  const headers = [
    "Name",
    "Category",
    "Make",
    "Model",
    "Serial Number",
    "Purchase Date",
    "Warranty Expiration",
    "Location",
    "Notes",
    "Product URL",
  ];
  const example = [
    "Refrigerator",
    "Kitchen",
    "Samsung",
    "RF28R7351SR",
    "ABC123456",
    "2023-06-15",
    "2028-06-15",
    "Kitchen",
    "French door model",
    "",
  ];
  return [headers.join(","), example.join(",")].join("\n");
}
