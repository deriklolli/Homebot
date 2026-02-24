export const PROJECT_STATUSES = [
  "In Progress",
  "Completed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectEvent {
  id: string;
  projectId: string;
  title: string;
  eventDate: string;
  eventTime: string | null;
  createdAt: string;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  content: string;
  createdAt: string;
}

export interface ProjectImage {
  id: string;
  projectId: string;
  storagePath: string;
  caption: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  contractorId: string | null;
  notes: string;
  status: ProjectStatus;
  totalCost: number | null;
  contractorRating: number | null;
  completedAt: string | null;
  createdAt: string;
}
