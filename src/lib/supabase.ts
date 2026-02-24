import { createBrowserClient } from "@supabase/ssr";

export interface DbContractor {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  specialty: string;
  rating: number;
  notes: string;
  website: string;
  logo_url: string;
  created_at: string;
}

export interface DbProject {
  id: string;
  name: string;
  description: string;
  contractor_id: string | null;
  home_asset_id: string | null;
  notes: string;
  status: string;
  total_cost: number | null;
  contractor_rating: number | null;
  completed_at: string | null;
  created_at: string;
}

export interface DbProjectEvent {
  id: string;
  project_id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  created_at: string;
}

export interface DbProjectNote {
  id: string;
  project_id: string;
  content: string;
  created_at: string;
}

export interface DbInventoryItem {
  id: string;
  name: string;
  description: string;
  frequency_months: number;
  last_ordered_date: string | null;
  next_reminder_date: string;
  purchase_url: string;
  thumbnail_url: string;
  notes: string;
  cost: number | null;
  created_at: string;
}

export interface DbService {
  id: string;
  name: string;
  provider: string;
  contractor_id: string | null;
  cost: number | null;
  frequency_months: number;
  last_service_date: string | null;
  next_service_date: string;
  home_asset_id: string | null;
  phone: string;
  notes: string;
  created_at: string;
}

export interface DbProjectImage {
  id: string;
  project_id: string;
  storage_path: string;
  caption: string;
  created_at: string;
}

export interface DbProjectInvoice {
  id: string;
  project_id: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  created_at: string;
}

export interface DbTask {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface DbHomeAsset {
  id: string;
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
  created_at: string;
}

export interface DbHomeSnapshot {
  id: string;
  user_id: string;
  redfin_url: string;
  address: string | null;
  photo_url: string | null;
  estimated_value: number | null;
  value_trend: "up" | "down" | null;
  last_scraped_at: string;
  created_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
