import { apiDownload, apiRequest } from "./client";
import type {
  TaskAssignment,
  TaskCreate,
  TaskResponse,
  TaskStage,
  TaskUpdate,
} from "@/types/task";

function taskPath(projectId: string, taskId?: string): string {
  const path = `/projects/${encodeURIComponent(projectId)}/tasks`;
  return taskId ? `${path}/${encodeURIComponent(taskId)}` : path;
}

export function listTasks(
  projectId: string,
  signal?: AbortSignal,
): Promise<TaskResponse[]> {
  return apiRequest(taskPath(projectId), { signal });
}

export function getTask(
  projectId: string,
  taskId: string,
  signal?: AbortSignal,
): Promise<TaskResponse> {
  return apiRequest(taskPath(projectId, taskId), { signal });
}

export function createTask(
  projectId: string,
  payload: TaskCreate,
): Promise<TaskResponse> {
  return apiRequest(taskPath(projectId), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTask(
  projectId: string,
  taskId: string,
  payload: TaskUpdate,
): Promise<TaskResponse> {
  return apiRequest(taskPath(projectId, taskId), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function assignTask(
  projectId: string,
  taskId: string,
  payload: TaskAssignment,
): Promise<TaskResponse> {
  return apiRequest(`${taskPath(projectId, taskId)}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function transitionTask(
  projectId: string,
  taskId: string,
  stage: TaskStage,
): Promise<TaskResponse> {
  return apiRequest(`${taskPath(projectId, taskId)}/transition`, {
    method: "POST",
    body: JSON.stringify({ stage }),
  });
}

export function addTaskComment(
  projectId: string,
  taskId: string,
  body: string,
): Promise<{ message: string }> {
  return apiRequest(`${taskPath(projectId, taskId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function downloadTaskReport(
  projectId: string,
  taskId: string,
  signal?: AbortSignal,
) {
  return apiDownload(
    `${taskPath(projectId, taskId)}/report`,
    signal,
  );
}

export interface TaskAnalytics {
  start: string;
  end: string;
  completed: number;
  started: number;
  submitted: number;
  currently_active: number;
  overdue: number;
  unfinished: number;
  cumulative_completed_before_period: number;
  timeline: Array<{
    date: string;
    started: number;
    completed: number;
    submitted: number;
    cumulative_completed: number;
  }>;
  pipeline: Record<string, number>;
}

export function getTaskAnalytics(
  projectId: string,
  start: Date,
  end: Date,
  signal?: AbortSignal,
): Promise<TaskAnalytics> {
  const query = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
  });
  return apiRequest(`/projects/${encodeURIComponent(projectId)}/analytics?${query}`, { signal });
}
