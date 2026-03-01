import { FREQUENCY_OPTIONS } from "./inventory-data";

export { FREQUENCY_OPTIONS };

export interface Service {
  id: string;
  name: string;
  provider: string;
  contractorId: string | null;
  cost: number | null;
  frequencyMonths: number;
  lastServiceDate: string | null;
  nextServiceDate: string;
  homeAssetId: string | null;
  phone: string;
  notes: string;
  remindersEnabled: boolean;
  createdAt: string;
}

export interface ServiceHistory {
  id: string;
  serviceId: string;
  serviceDate: string;
  contractorName: string;
  invoicePath: string;
  invoiceFileName: string;
  invoiceFileType: string;
  createdAt: string;
}
