import type { DbContractor, DbProject, DbProjectEvent, DbProjectNote, DbProjectImage, DbProjectInvoice, DbInventoryItem, DbService, DbHomeSnapshot, DbHomeAsset } from "./supabase";
import type { Contractor } from "./contractors-data";
import type { Project, ProjectEvent, ProjectNote, ProjectImage, ProjectInvoice } from "./projects-data";
import type { InventoryItem } from "./inventory-data";
import type { Service } from "./services-data";
import type { HomeAsset } from "./home-assets-data";

export function dbToContractor(row: DbContractor): Contractor {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    phone: row.phone,
    email: row.email,
    specialty: row.specialty as Contractor["specialty"],
    rating: row.rating,
    notes: row.notes,
    website: row.website,
    logoUrl: row.logo_url,
    createdAt: row.created_at,
  };
}

export function contractorToDb(
  data: Omit<Contractor, "id" | "createdAt">
): Omit<DbContractor, "id" | "user_id" | "created_at"> {
  return {
    name: data.name,
    company: data.company,
    phone: data.phone,
    email: data.email,
    specialty: data.specialty,
    rating: data.rating,
    notes: data.notes,
    website: data.website,
    logo_url: data.logoUrl,
  };
}

export function dbToProject(row: DbProject): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    contractorId: row.contractor_id,
    homeAssetId: row.home_asset_id,
    notes: row.notes,
    status: row.status as Project["status"],
    totalCost: row.total_cost,
    contractorRating: row.contractor_rating,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export function dbToProjectEvent(row: DbProjectEvent): ProjectEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    eventDate: row.event_date,
    eventTime: row.event_time,
    eventEndTime: row.event_end_time,
    createdAt: row.created_at,
  };
}

export function dbToProjectNote(row: DbProjectNote): ProjectNote {
  return {
    id: row.id,
    projectId: row.project_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function projectToDb(
  data: Omit<
    Project,
    "id" | "createdAt" | "totalCost" | "contractorRating" | "completedAt"
  >
): {
  name: string;
  description: string;
  contractor_id: string | null;
  home_asset_id: string | null;
  notes: string;
  status: string;
} {
  return {
    name: data.name,
    description: data.description,
    contractor_id: data.contractorId,
    home_asset_id: data.homeAssetId,
    notes: data.notes,
    status: data.status,
  };
}

export function dbToProjectImage(row: DbProjectImage): ProjectImage {
  return {
    id: row.id,
    projectId: row.project_id,
    storagePath: row.storage_path,
    caption: row.caption,
    createdAt: row.created_at,
  };
}

export function dbToProjectInvoice(row: DbProjectInvoice): ProjectInvoice {
  return {
    id: row.id,
    projectId: row.project_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    fileType: row.file_type,
    amount: row.amount,
    createdAt: row.created_at,
  };
}

export function dbToInventoryItem(row: DbInventoryItem): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    frequencyMonths: row.frequency_months,
    lastOrderedDate: row.last_ordered_date,
    nextReminderDate: row.next_reminder_date,
    purchaseUrl: row.purchase_url,
    thumbnailUrl: row.thumbnail_url,
    notes: row.notes,
    cost: row.cost,
    homeAssetId: row.home_asset_id,
    createdAt: row.created_at,
  };
}

export function inventoryItemToDb(
  data: Omit<InventoryItem, "id" | "createdAt">
): Omit<DbInventoryItem, "id" | "user_id" | "created_at"> {
  return {
    name: data.name,
    description: data.description,
    frequency_months: data.frequencyMonths,
    last_ordered_date: data.lastOrderedDate,
    next_reminder_date: data.nextReminderDate,
    purchase_url: data.purchaseUrl,
    thumbnail_url: data.thumbnailUrl,
    notes: data.notes,
    cost: data.cost,
    home_asset_id: data.homeAssetId,
  };
}

export function dbToService(row: DbService): Service {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    contractorId: row.contractor_id,
    cost: row.cost,
    frequencyMonths: row.frequency_months,
    lastServiceDate: row.last_service_date,
    nextServiceDate: row.next_service_date,
    homeAssetId: row.home_asset_id,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function serviceToDb(
  data: Omit<Service, "id" | "createdAt">
): Omit<DbService, "id" | "user_id" | "created_at"> {
  return {
    name: data.name,
    provider: data.provider,
    contractor_id: data.contractorId,
    cost: data.cost,
    frequency_months: data.frequencyMonths,
    last_service_date: data.lastServiceDate,
    next_service_date: data.nextServiceDate,
    home_asset_id: data.homeAssetId,
    phone: data.phone,
    notes: data.notes,
  };
}

/* ----- Home Snapshot ----- */

export interface HomeSnapshot {
  id: string;
  userId: string;
  redfinUrl: string;
  address: string | null;
  photoUrl: string | null;
  estimatedValue: number | null;
  valueTrend: "up" | "down" | null;
  lastScrapedAt: string;
  createdAt: string;
}

export function dbToHomeAsset(row: DbHomeAsset): HomeAsset {
  return {
    id: row.id,
    name: row.name,
    category: row.category as HomeAsset["category"],
    make: row.make,
    model: row.model,
    serialNumber: row.serial_number,
    purchaseDate: row.purchase_date,
    warrantyExpiration: row.warranty_expiration,
    location: row.location,
    notes: row.notes,
    productUrl: row.product_url,
    createdAt: row.created_at,
  };
}

export function homeAssetToDb(
  data: Omit<HomeAsset, "id" | "createdAt">
): {
  name: string;
  category: string;
  make: string;
  model: string;
  serial_number: string;
  purchase_date: string | null;
  warranty_expiration: string | null;
  location: string;
  notes: string;
  product_url: string;
} {
  return {
    name: data.name,
    category: data.category,
    make: data.make,
    model: data.model,
    serial_number: data.serialNumber,
    purchase_date: data.purchaseDate,
    warranty_expiration: data.warrantyExpiration,
    location: data.location,
    notes: data.notes,
    product_url: data.productUrl,
  };
}

export function dbToHomeSnapshot(row: DbHomeSnapshot): HomeSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    redfinUrl: row.redfin_url,
    address: row.address,
    photoUrl: row.photo_url,
    estimatedValue: row.estimated_value,
    valueTrend: row.value_trend,
    lastScrapedAt: row.last_scraped_at,
    createdAt: row.created_at,
  };
}
