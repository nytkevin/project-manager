import { apiRequest } from "./client";
import type { ProjectMemberResponse } from "@/types/team";

export function getProjectMembers(
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectMemberResponse[]> {
  return apiRequest(
    `/projects/${encodeURIComponent(projectId)}/members`,
    { signal },
  );
}

export function updateProjectMembership(
  projectId: string,
  userId: string,
  roles = "developer",
): Promise<{ message: string }> {
  const query = new URLSearchParams({ user_id: userId, roles });
  return apiRequest(
    `/projects/${encodeURIComponent(projectId)}/memberships?${query}`,
    { method: "POST" },
  );
}

export function removeProjectMembership(
  projectId: string,
  userId: string,
): Promise<void> {
  return apiRequest(
    `/projects/${encodeURIComponent(projectId)}/memberships/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}
