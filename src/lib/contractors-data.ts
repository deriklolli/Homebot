export const SPECIALTIES = [
  "Plumber",
  "Electrician",
  "HVAC",
  "General Contractor",
  "Roofer",
  "Painter",
  "Flooring",
  "Landscaper",
  "Handyman",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export interface Contractor {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  specialty: Specialty;
  rating: number;
  notes: string;
  website: string;
  logoUrl: string;
  createdAt: string;
}
