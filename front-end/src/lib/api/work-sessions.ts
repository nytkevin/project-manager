import { apiRequest } from "./client";
import type { WorkSessionResponse, WorkSessionSummary } from "@/types/task";

function sessionPath(projectId: string, taskId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/work-sessions`;
}

export function getTaskWorkSessions(
  projectId: string,
  taskId: string,
  signal?: AbortSignal,
): Promise<WorkSessionSummary> {
  return apiRequest(sessionPath(projectId, taskId), { signal });
}

export function startTaskWork(
  projectId: string,
  taskId: string,
): Promise<WorkSessionResponse> {
  return apiRequest(sessionPath(projectId, taskId), { method: "POST" });
}

export function stopTaskWork(
  projectId: string,
  taskId: string,
): Promise<WorkSessionResponse> {
  return apiRequest(`${sessionPath(projectId, taskId)}/stop`, {
    method: "POST",
  });
}
