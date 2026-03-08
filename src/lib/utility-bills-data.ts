export type UtilityCategory =
  | "electric"
  | "gas"
  | "water"
  | "internet"
  | "trash"
  | "sewer"
  | "phone"
  | "other";

export interface UtilityProvider {
  id: string;
  name: string;
  category: UtilityCategory;
  accountNumber: string | null;
  senderEmail: string | null;
  logoUrl: string | null;
  createdAt: string;
}

export interface UtilityBill {
  id: string;
  providerId: string | null;
  providerName: string;
  category: UtilityCategory;
  amount: number;
  dueDate: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  accountNumber: string | null;
  gmailMessageId: string | null;
  source: "gmail_scan" | "manual";
  notes: string;
  createdAt: string;
}

export const UTILITY_CATEGORIES: {
  value: UtilityCategory;
  label: string;
  color: string;
}[] = [
  { value: "electric", label: "Electric", color: "bg-yellow-500" },
  { value: "gas", label: "Gas", color: "bg-orange-500" },
  { value: "water", label: "Water", color: "bg-blue-500" },
  { value: "internet", label: "Internet", color: "bg-purple-500" },
  { value: "trash", label: "Trash", color: "bg-green-600" },
  { value: "sewer", label: "Sewer", color: "bg-teal" },
  { value: "phone", label: "Phone", color: "bg-pink-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
];

export function getCategoryLabel(cat: UtilityCategory): string {
  return UTILITY_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

export function getCategoryColor(cat: UtilityCategory): string {
  return UTILITY_CATEGORIES.find((c) => c.value === cat)?.color ?? "bg-gray-500";
}
