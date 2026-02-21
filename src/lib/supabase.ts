import { createClient } from "@supabase/supabase-js";

export interface DbContractor {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  specialty: string;
  rating: number;
  notes: string;
  created_at: string;
}

export interface DbProject {
  id: string;
  name: string;
  description: string;
  contractor_id: string | null;
  scheduled_date: string;
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
  phone: string;
  notes: string;
  created_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
