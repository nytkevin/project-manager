import type { ReviewRecord } from "./review";

export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type TaskCategory = "Feature" | "Bug" | "Improvement" | "Documentation" | "Other";
export type TaskStage =
  | "Backlog"
  | "Assigned"
  | "Ready"
  | "Active"
  | "In Review"
  | "Completed";

export interface TaskResponse {
  id: string;
  display_id: string;
  project_id: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  category: string;
  priority: string;
  estimated_effort: string;
  due_date: string | null;
  stage: TaskStage;
  assignee_id: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  first_started_at: string | null;
  active_started_at: string | null;
  submitted_at: string | null;
  submission_notes: string | null;
  git_reference: string | null;
  testing_notes: string | null;
  completed_at: string | null;
  approved_by: string | null;
  blocked_reason: string | null;
  created_at: string;
  last_activity_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  acceptance_criteria?: string;
  category?: string;
  priority?: string;
  estimated_effort?: string;
  due_date?: string | null;
}

export type TaskUpdate = Partial<TaskCreate>;

export interface TaskAssignment {
  assignee_id: string;
}

export interface TaskSubmission {
  notes: string;
  git_reference?: string;
  testing_notes?: string;
  limitations?: string;
}

export interface WorkSessionResponse {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
}

export interface WorkSessionSummary {
  active_seconds: number;
  sessions: WorkSessionResponse[];
}

export interface PipelineTask {
  id: string;
  displayId: string;
  projectId: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  category: string;
  priority: string;
  estimatedEffort: string;
  dueDate: string | null;
  stage: TaskStage;
  assigneeId: string | null;
  assignedAt: string | null;
  assignedBy: string | null;
  createdAt: string;
  firstStartedAt: string | null;
  lastActivityAt: string;
  activeStartedAt: string | null;
  blockedReason: string | null;
  submission: {
    notes: string;
    gitReference: string;
    testingNotes: string;
    submittedAt: string;
  } | null;
  reviews: ReviewRecord[];
  workSessions: WorkSessionResponse[];
  activeSeconds: number;
  timeSyncedAt: number | null;
}
