export const FREQUENCY_OPTIONS = [
  { value: 0.25, label: "Weekly" },
  { value: 0.5, label: "Bi-weekly" },
  { value: 1, label: "Every month" },
  { value: 2, label: "Every 2 months" },
  { value: 3, label: "Every 3 months" },
  { value: 6, label: "Every 6 months" },
  { value: 12, label: "Every year" },
  { value: 24, label: "Every 2 years" },
] as const;

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  frequencyMonths: number;
  lastOrderedDate: string | null;
  nextReminderDate: string;
  purchaseUrl: string;
  thumbnailUrl: string;
  notes: string;
  cost: number | null;
  homeAssetId: string | null;
  createdAt: string;
}
