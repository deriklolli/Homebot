export type UserRole = "homeowner" | "manager" | "superadmin";

export type ClientStatus = "pending" | "invited" | "activated";

export type ManagerStatus = "pending" | "active";

export interface Organization {
  id: string;
  name: string;
  managerCount: number;
  clientCount: number;
  createdAt: string;
}

export interface ManagedManager {
  id: string;
  email: string;
  fullName: string | null;
  organizationId: string;
  organizationName: string;
  clientCount: number;
  status: ManagerStatus;
  createdAt: string;
}

export interface ManagedClient {
  id: string;
  email: string;
  fullName: string | null;
  propertyName: string | null;
  status: ClientStatus;
  activatedAt: string | null;
  createdAt: string;
  assetCount: number;
  inventoryCount: number;
}

export interface Profile {
  id: string;
  role: UserRole;
  organizationId: string | null;
  managedBy: string | null;
  activatedAt: string | null;
  createdAt: string;
}
