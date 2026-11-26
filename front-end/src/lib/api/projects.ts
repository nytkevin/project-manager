import { apiRequest } from "./client";
import type {
  ProjectCreate,
  ProjectResponse,
  ProjectUpdate,
} from "@/types/project";

export function listProjects(signal?: AbortSignal): Promise<ProjectResponse[]> {
  return apiRequest("/projects", { signal });
}

export function getProject(
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectResponse> {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}`, { signal });
}

export function createProject(payload: ProjectCreate): Promise<ProjectResponse> {
  return apiRequest("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProject(
  projectId: string,
  payload: ProjectUpdate,
): Promise<ProjectResponse> {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
