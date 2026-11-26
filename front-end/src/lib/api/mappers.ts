import type { Project, ProjectResponse } from "@/types/project";
import type { ProjectMemberResponse, TeamMember } from "@/types/team";
import type { ReviewRecord, ReviewResponse } from "@/types/review";
import type {
  PipelineTask,
  TaskResponse,
  WorkSessionSummary,
} from "@/types/task";

const avatarColors = [
  "bg-[#233876]",
  "bg-[#7c5caa]",
  "bg-[#287d71]",
  "bg-[#ba7143]",
  "bg-[#5265a7]",
];

export function mapProjectMember(member: ProjectMemberResponse): TeamMember {
  const colorIndex = Array.from(member.user_id).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % avatarColors.length;
  const initials = member.fullname
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return {
    ...member,
    id: member.user_id,
    name: member.fullname,
    initials,
    color: avatarColors[colorIndex],
    role: member.roles,
  };
}

export function mapProject(
  project: ProjectResponse,
  members: TeamMember[],
): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    startDate: project.start_date,
    deadline: project.deadline,
    members,
  };
}

export function mapTask(
  task: TaskResponse,
  previous?: PipelineTask,
): PipelineTask {
  return {
    id: task.id,
    displayId: task.display_id,
    projectId: task.project_id,
    title: task.title,
    description: task.description,
    acceptanceCriteria: task.acceptance_criteria,
    category: task.category,
    priority: task.priority,
    estimatedEffort: task.estimated_effort,
    dueDate: task.due_date,
    stage: task.stage,
    assigneeId: task.assignee_id,
    assignedAt: task.assigned_at,
    assignedBy: task.assigned_by,
    createdAt: task.created_at,
    firstStartedAt: task.first_started_at,
    lastActivityAt: task.last_activity_at,
    activeStartedAt: task.active_started_at,
    blockedReason: task.blocked_reason,
    submission: task.submitted_at
      ? {
          notes: task.submission_notes ?? "",
          gitReference: task.git_reference ?? "",
          testingNotes: task.testing_notes ?? "",
          submittedAt: task.submitted_at,
        }
      : null,
    reviews: previous?.reviews ?? [],
    workSessions: previous?.workSessions ?? [],
    activeSeconds: previous?.activeSeconds ?? 0,
    timeSyncedAt: previous?.timeSyncedAt ?? null,
  };
}

export function applyWorkSessionSummary(
  task: PipelineTask,
  summary: WorkSessionSummary,
): PipelineTask {
  return {
    ...task,
    activeSeconds: summary.active_seconds,
    timeSyncedAt: Date.now(),
    workSessions: summary.sessions,
  };
}

export function mapReview(
  review: ReviewResponse,
  members: TeamMember[],
): ReviewRecord {
  const reviewer = members.find((member) => member.id === review.reviewer_id);
  return {
    id: review.id,
    reviewerId: review.reviewer_id,
    reviewerName: reviewer?.name ?? review.reviewer_id,
    result: review.result,
    comments: review.comments,
    createdAt: review.created_at,
  };
}

export function mapReviews(
  reviews: ReviewResponse[],
  members: TeamMember[],
): ReviewRecord[] {
  return reviews.map((review) => mapReview(review, members));
}
