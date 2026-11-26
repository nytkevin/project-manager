import type { Priority } from "@/types/task";
import type { Project } from "@/types/project";
import type { TeamMember } from "@/types/team";

export type {
  PipelineTask,
  TaskStage,
  Priority,
  TaskCategory,
} from "@/types/task";
export type { Project, ProjectStatus } from "@/types/project";
export type { TeamMember } from "@/types/team";

export type TaskStatus = "To Do" | "In Progress" | "Review" | "Completed";

export interface Task {
  id: string;
  title: string;
  project: string;
  assignee: TeamMember;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
}

export interface Deadline {
  id: string;
  title: string;
  project: string;
  dueDate: string;
  remaining: string;
  priority: Priority;
  overdue?: boolean;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  subject: string;
  time: string;
  type: "project" | "task" | "member" | "deadline";
}

export type DashboardProject = Project;
