import type { TeamMember } from "./team";

export type ProjectStatus = string;

export interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  start_date: string | null;
  deadline: string | null;
  created_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  start_date?: string | null;
  deadline?: string | null;
}

export type ProjectUpdate = Partial<ProjectCreate>;

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | null;
  deadline: string | null;
  members: TeamMember[];
}
