import type { DbContractor, DbProject, DbProjectEvent, DbProjectNote, DbProjectImage, DbInventoryItem, DbService, DbHomeSnapshot } from "./supabase";
import type { Contractor } from "./contractors-data";
import type { Project, ProjectEvent, ProjectNote, ProjectImage } from "./projects-data";
import type { InventoryItem } from "./inventory-data";
import type { Service } from "./services-data";

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
): Omit<DbContractor, "id" | "created_at"> {
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
    scheduledDate: row.scheduled_date,
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
  scheduled_date: string;
  notes: string;
  status: string;
} {
  return {
    name: data.name,
    description: data.description,
    contractor_id: data.contractorId,
    scheduled_date: data.scheduledDate,
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
    createdAt: row.created_at,
  };
}

export function inventoryItemToDb(
  data: Omit<InventoryItem, "id" | "createdAt">
): Omit<DbInventoryItem, "id" | "created_at"> {
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
    phone: row.phone,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function serviceToDb(
  data: Omit<Service, "id" | "createdAt">
): Omit<DbService, "id" | "created_at"> {
  return {
    name: data.name,
    provider: data.provider,
    contractor_id: data.contractorId,
    cost: data.cost,
    frequency_months: data.frequencyMonths,
    last_service_date: data.lastServiceDate,
    next_service_date: data.nextServiceDate,
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
