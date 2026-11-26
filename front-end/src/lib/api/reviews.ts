import { apiRequest } from "./client";
import type { ReviewCreate, ReviewResponse } from "@/types/review";
import type { TaskResponse, TaskSubmission } from "@/types/task";

function taskPath(projectId: string, taskId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`;
}

export function submitTaskForReview(
  projectId: string,
  taskId: string,
  payload: TaskSubmission,
): Promise<TaskResponse> {
  return apiRequest(`${taskPath(projectId, taskId)}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTaskReviews(
  projectId: string,
  taskId: string,
  signal?: AbortSignal,
): Promise<ReviewResponse[]> {
  return apiRequest(`${taskPath(projectId, taskId)}/reviews`, { signal });
}

export function reviewTask(
  projectId: string,
  taskId: string,
  payload: ReviewCreate,
): Promise<TaskResponse> {
  return apiRequest(`${taskPath(projectId, taskId)}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
