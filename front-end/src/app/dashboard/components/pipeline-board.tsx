"use client";

import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock3,
  Download,
  Flag,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import type { Project } from "@/types/project";
import type {
  PipelineTask,
  TaskCreate,
  TaskStage,
  TaskSubmission,
  TaskUpdate,
} from "@/types/task";
import type { ReviewCreate } from "@/types/review";

const stages: TaskStage[] = [
  "Backlog",
  "Assigned",
  "Ready",
  "Active",
  "In Review",
  "Completed",
];

const stageColors: Record<TaskStage, string> = {
  Backlog: "bg-slate-400",
  Assigned: "bg-violet-500",
  Ready: "bg-blue-500",
  Active: "bg-[#263875]",
  "In Review": "bg-amber-500",
  Completed: "bg-emerald-500",
};

const priorityStyles: Record<string, string> = {
  Low: "text-slate-500",
  Medium: "text-blue-600",
  High: "text-orange-600",
  Urgent: "text-red-600",
};

interface Actions {
  createTask: (payload: TaskCreate) => Promise<void>;
  updateTask: (taskId: string, payload: TaskUpdate) => Promise<void>;
  assignTask: (taskId: string, userId: string) => Promise<void>;
  transitionTask: (taskId: string, stage: TaskStage) => Promise<void>;
  startWork: (taskId: string) => Promise<void>;
  stopWork: (taskId: string) => Promise<void>;
  submitForReview: (taskId: string, payload: TaskSubmission) => Promise<void>;
  reviewTask: (taskId: string, payload: ReviewCreate) => Promise<void>;
  addComment: (taskId: string, body: string) => Promise<void>;
  refreshTask: (taskId: string, signal: AbortSignal) => Promise<void>;
  downloadReport: (taskId: string) => Promise<void>;
}

interface Props {
  project: Project;
  tasks: PipelineTask[];
  search: string;
  onSearch: (value: string) => void;
  currentUserId: string;
  currentUserRoles: string;
  actions: Actions;
  createTaskRequest: number;
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function activeDuration(task: PipelineTask, now: number): number {
  const elapsedSinceSync =
    task.activeStartedAt && task.timeSyncedAt
      ? Math.max(0, now - task.timeSyncedAt)
      : 0;
  return Math.max(0, task.activeSeconds * 1000 + elapsedSinceSync);
}

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "No due date";
}

function dateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function displayError(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function hasRole(roles: string, accepted: string[]): boolean {
  const assigned = new Set(roles.split(",").map((role) => role.trim().toLowerCase()));
  return accepted.some((role) => assigned.has(role));
}

export default function PipelineBoard({
  project,
  tasks,
  search,
  onSearch,
  currentUserId,
  currentUserRoles,
  actions,
  createTaskRequest,
}: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<TaskStage | null>(null);
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(0);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (createTaskRequest === 0) return;
    const timer = window.setTimeout(() => setCreateOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [createTaskRequest]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const canAssign = hasRole(currentUserRoles, ["owner", "manager"]);
  const canReview = hasRole(currentUserRoles, [
    "owner",
    "manager",
    "senior developer",
    "reviewer",
  ]);

  const visibleTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          `${task.title} ${task.displayId}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (priorityFilter === "All" || task.priority === priorityFilter) &&
          (assigneeFilter === "All" ||
            (assigneeFilter === "Unassigned"
              ? !task.assigneeId
              : task.assigneeId === assigneeFilter)),
      ),
    [assigneeFilter, priorityFilter, search, tasks],
  );

  const runAction = async (taskId: string, action: () => Promise<void>) => {
    setError("");
    setSuccess("");
    setPendingTaskIds((current) => new Set(current).add(taskId));
    try {
      await action();
    } catch (actionError) {
      setError(displayError(actionError));
    } finally {
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  };

  const moveTask = (taskId: string, stage: TaskStage) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.stage === stage || pendingTaskIds.has(taskId)) return;
    if (stage === "In Review") {
      setError("Submit the task with work notes from its Review panel.");
      return;
    }
    if (stage === "Completed") {
      setError("A task can be completed only after an authorized reviewer approves it.");
      return;
    }
    void runAction(taskId, () => actions.transitionTask(taskId, stage));
  };

  const handleDrop = (event: DragEvent<HTMLElement>, stage: TaskStage) => {
    event.preventDefault();
    if (draggedId) moveTask(draggedId, stage);
    setDraggedId(null);
    setDragOverStage(null);
  };

  const assigneeFor = (task: PipelineTask) =>
    project.members.find((member) => member.id === task.assigneeId);

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-52 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 sm:max-w-xs">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search tasks"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none"
          aria-label="Filter by assignee"
        >
          <option value="All">All members</option>
          <option value="Unassigned">Unassigned</option>
          {project.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} · {member.roles}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none"
          aria-label="Filter by priority"
        >
          <option>All</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Urgent</option>
        </select>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="ml-auto flex h-9 items-center gap-2 rounded-lg bg-[#263875] px-3 text-sm font-semibold text-white hover:bg-[#1e2e60]"
        >
          <Plus className="h-4 w-4" />
          Create task
        </button>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="grid min-w-[1320px] grid-cols-6 gap-3">
          {stages.map((stage) => {
            const stageTasks = visibleTasks.filter((task) => task.stage === stage);
            return (
              <section
                key={stage}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverStage(stage);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(event) => handleDrop(event, stage)}
                className={`min-h-[560px] rounded-xl border p-2 transition ${
                  dragOverStage === stage
                    ? "border-[#263875] bg-[#eef1fb]"
                    : "border-slate-200 bg-slate-100/70"
                }`}
              >
                <header className="flex h-10 items-center gap-2 px-1">
                  <span className={`h-2 w-2 rounded-full ${stageColors[stage]}`} />
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {stage}
                  </h2>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    {stageTasks.length}
                  </span>
                </header>
                <div className="space-y-2">
                  {stageTasks.map((task) => {
                    const assignee = assigneeFor(task);
                    return (
                      <article
                        key={task.id}
                        draggable={!pendingTaskIds.has(task.id)}
                        onDragStart={(event) => {
                          setDraggedId(task.id);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDragOverStage(null);
                        }}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,.04)] transition hover:border-slate-300 hover:shadow-sm ${
                          pendingTaskIds.has(task.id) ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {task.displayId}
                          </span>
                          <button
                            type="button"
                            aria-label={`Open ${task.title}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedTaskId(task.id);
                            }}
                            className="text-slate-400"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                        <h3 className="mt-2 text-sm font-semibold leading-5 text-slate-800">
                          {task.title}
                        </h3>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                            {task.category}
                          </span>
                          <span
                            className={`flex items-center gap-1 text-[11px] font-semibold ${
                              priorityStyles[task.priority] ?? "text-slate-500"
                            }`}
                          >
                            <Flag className="h-3 w-3" />
                            {task.priority}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          {assignee ? (
                            <span className="flex min-w-0 items-center gap-1.5" title={`${assignee.name} · ${assignee.roles}`}>
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ${assignee.color}`}>
                                {assignee.initials}
                              </span>
                              <span className="max-w-20 truncate text-[10px] text-slate-500">
                                {assignee.name}
                              </span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              aria-label="Assign a project member"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedTaskId(task.id);
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <div className="flex items-center gap-2">
                            {task.blockedReason && (
                              <span title={task.blockedReason} className="text-amber-600">
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {task.stage === "Active" && task.timeSyncedAt !== null && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#263875]">
                                <Clock3 className="h-3 w-3" />
                                {formatDuration(activeDuration(task, now))}
                              </span>
                            )}
                            {task.stage === "In Review" && (
                              <span className="flex h-5 items-center rounded-full bg-amber-50 px-2 text-[10px] font-semibold text-amber-700">
                                Review
                              </span>
                            )}
                            {task.stage === "Completed" && <Check className="h-4 w-4 text-emerald-600" />}
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <CalendarDays className="h-3 w-3" />
                                {task.dueDate.slice(5, 10)}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {selectedTask && (
        <TaskDrawer
          key={selectedTask.id}
          task={selectedTask}
          project={project}
          now={now}
          currentUserId={currentUserId}
          canAssign={canAssign}
          canReview={canReview}
          pending={pendingTaskIds.has(selectedTask.id)}
          actions={actions}
          onClose={() => setSelectedTaskId(null)}
          onSuccess={setSuccess}
        />
      )}

      {createOpen && (
        <CreateTaskModal
          project={project}
          onClose={() => setCreateOpen(false)}
          onCreate={async (payload) => {
            await actions.createTask(payload);
            setCreateOpen(false);
            setSuccess("Task created.");
          }}
        />
      )}
    </div>
  );
}

interface DrawerProps {
  task: PipelineTask;
  project: Project;
  now: number;
  currentUserId: string;
  canAssign: boolean;
  canReview: boolean;
  pending: boolean;
  actions: Actions;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function TaskDrawer({
  task,
  project,
  now,
  currentUserId,
  canAssign,
  canReview,
  pending,
  actions,
  onClose,
  onSuccess,
}: DrawerProps) {
  const [tab, setTab] = useState<"Details" | "Comments" | "History" | "Review">("Details");
  const [comment, setComment] = useState("");
  const [commentSaved, setCommentSaved] = useState(false);
  const [reviewComments, setReviewComments] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [gitReference, setGitReference] = useState("");
  const [testingNotes, setTestingNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerBusy, setDrawerBusy] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(task.acceptanceCriteria);
  const [category, setCategory] = useState(task.category);
  const [priority, setPriority] = useState(task.priority);
  const [estimatedEffort, setEstimatedEffort] = useState(task.estimatedEffort);
  const [dueDate, setDueDate] = useState(dateInputValue(task.dueDate));
  const [nextStage, setNextStage] = useState("");
  const assignee = project.members.find((member) => member.id === task.assigneeId);
  const canWork = task.assigneeId === currentUserId;

  useEffect(() => {
    const controller = new AbortController();
    void actions
      .refreshTask(task.id, controller.signal)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setDrawerError(displayError(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailsLoading(false);
      });
    return () => controller.abort();
  }, [actions, task.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTitle(task.title);
      setDescription(task.description);
      setAcceptanceCriteria(task.acceptanceCriteria);
      setCategory(task.category);
      setPriority(task.priority);
      setEstimatedEffort(task.estimatedEffort);
      setDueDate(dateInputValue(task.dueDate));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    task.id,
    task.title,
    task.description,
    task.acceptanceCriteria,
    task.category,
    task.priority,
    task.estimatedEffort,
    task.dueDate,
  ]);

  const runDrawerAction = async (action: () => Promise<void>) => {
    setDrawerError("");
    setDrawerBusy(true);
    try {
      await action();
    } catch (error) {
      setDrawerError(displayError(error));
    } finally {
      setDrawerBusy(false);
    }
  };

  const saveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setDrawerError("");
    try {
      await actions.updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        acceptance_criteria: acceptanceCriteria.trim(),
        category,
        priority,
        estimated_effort: estimatedEffort.trim(),
        due_date: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null,
      });
      setEditing(false);
      onSuccess("Task details saved.");
    } catch (error) {
      setDrawerError(displayError(error));
    } finally {
      setSaving(false);
    }
  };

  const saveComment = async () => {
    if (!comment.trim()) return;
    setCommentSaved(false);
    await runDrawerAction(async () => {
      await actions.addComment(task.id, comment.trim());
      setComment("");
      setCommentSaved(true);
    });
  };

  const submit = async () => {
    if (!submissionNotes.trim()) {
      setDrawerError("Add work summary notes before submitting for review.");
      return;
    }
    await runDrawerAction(() =>
      actions.submitForReview(task.id, {
        notes: submissionNotes.trim(),
        git_reference: gitReference.trim(),
        testing_notes: testingNotes.trim(),
      }),
    );
  };

  const review = async (result: ReviewCreate["result"]) => {
    if (result === "Changes Requested" && !reviewComments.trim()) {
      setDrawerError("Reviewer comments are required when requesting changes.");
      return;
    }
    await runDrawerAction(async () => {
      await actions.reviewTask(task.id, {
        result,
        comments: reviewComments.trim(),
      });
      setReviewComments("");
    });
  };

  const transition = async (stage: TaskStage) => {
    setNextStage("");
    await runDrawerAction(() => actions.transitionTask(task.id, stage));
  };

  const workSessions = task.workSessions;
  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close task details"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/25"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold text-slate-400">{task.displayId}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{task.title}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex border-b border-slate-200 px-6">
          {(["Details", "Comments", "History", "Review"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`border-b-2 px-3 py-3 text-xs font-semibold ${
                tab === item
                  ? "border-[#263875] text-[#263875]"
                  : "border-transparent text-slate-400"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {drawerError && (
            <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {drawerError}
            </p>
          )}
          {detailsLoading && (
            <p className="mb-4 text-sm text-slate-500" role="status">
              Refreshing task details…
            </p>
          )}

          {tab === "Details" && (
            <div className="space-y-5">
              {editing ? (
                <form onSubmit={saveDetails} className="space-y-4">
                  <label className="block text-xs font-medium text-slate-500">
                    Title
                    <input required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700" />
                  </label>
                  <label className="block text-xs font-medium text-slate-500">
                    Description
                    <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 h-24 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm text-slate-700" />
                  </label>
                  <label className="block text-xs font-medium text-slate-500">
                    Acceptance criteria
                    <textarea value={acceptanceCriteria} onChange={(event) => setAcceptanceCriteria(event.target.value)} className="mt-2 h-20 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm text-slate-700" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium text-slate-500">
                      Category
                      <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700">
                        {["Feature", "Bug", "Improvement", "Documentation", "Other"].map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-slate-500">
                      Priority
                      <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700">
                        {["Low", "Medium", "High", "Urgent"].map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-slate-500">
                      Estimated effort
                      <input value={estimatedEffort} onChange={(event) => setEstimatedEffort(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700" />
                    </label>
                    <label className="text-xs font-medium text-slate-500">
                      Due date
                      <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700" />
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing(false)} className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-600">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving || pending || drawerBusy} className="h-9 rounded-lg bg-[#263875] px-3 text-sm font-semibold text-white disabled:opacity-50">
                      {saving ? "Saving…" : "Save details"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{task.description || "No description provided."}</p>
                    </div>
                    <button type="button" onClick={() => setEditing(true)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                      Edit
                    </button>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Acceptance criteria</h3>
                    <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{task.acceptanceCriteria || "No acceptance criteria provided."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="text-xs font-medium text-slate-500">
                      Assignee
                      <select
                        disabled={!canAssign || pending || drawerBusy}
                        value={task.assigneeId ?? ""}
                        onChange={(event) => {
                          if (event.target.value) {
                            void runDrawerAction(() => actions.assignTask(task.id, event.target.value));
                          }
                        }}
                        className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 disabled:bg-slate-50"
                      >
                        {!task.assigneeId && <option value="" disabled>Unassigned</option>}
                        {project.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name} · {member.roles}
                          </option>
                        ))}
                      </select>
                      {!canAssign && <span className="mt-1 block text-[11px] text-slate-400">A project owner or manager can assign tasks.</span>}
                    </label>
                    <label className="text-xs font-medium text-slate-500">
                      Move to
                      <select
                        value={nextStage}
                        disabled={pending || drawerBusy || task.stage === "Completed"}
                        onChange={(event) => {
                          const stage = event.target.value as TaskStage;
                          if (stage) void transition(stage);
                        }}
                        className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 disabled:bg-slate-50"
                      >
                        <option value="">Keep {task.stage}</option>
                        {stages
                          .filter((stage) => !["In Review", "Completed", task.stage].includes(stage))
                          .map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-xs text-slate-400">Priority</p><p className="mt-1 font-medium text-slate-700">{task.priority}</p></div>
                    <div><p className="text-xs text-slate-400">Due date</p><p className="mt-1 font-medium text-slate-700">{displayDate(task.dueDate)}</p></div>
                    <div><p className="text-xs text-slate-400">Effort</p><p className="mt-1 font-medium text-slate-700">{task.estimatedEffort || "Not estimated"}</p></div>
                    <div><p className="text-xs text-slate-400">Assigned</p><p className="mt-1 font-medium text-slate-700">{assignee?.name ?? "Unassigned"}</p>{assignee && <p className="text-xs text-slate-400">{assignee.roles}</p>}</div>
                  </div>
                  {task.blockedReason && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Blocked reason</h3>
                      <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{task.blockedReason}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recorded work</h3>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {formatDuration(activeDuration(task, now))}
                      {task.activeStartedAt ? " · in progress" : " · paused"}
                    </p>
                    {workSessions.map((session) => (
                      <p key={session.id} className="mt-1 text-xs text-slate-500">
                        {new Date(session.started_at).toLocaleString()} – {session.ended_at ? new Date(session.ended_at).toLocaleString() : "Active"}
                      </p>
                    ))}
                    {!workSessions.length && <p className="mt-1 text-xs text-slate-400">No work sessions recorded.</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "Comments" && (
            <div>
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Comments can be added, but the backend does not currently provide a comments-list endpoint.
              </p>
              {commentSaved && <p role="status" className="mt-3 text-sm text-emerald-700">Comment saved.</p>}
              <div className="mt-4 flex gap-2">
                <input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Add a comment"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
                  aria-label="Comment"
                />
                <button
                  type="button"
                  disabled={!comment.trim() || pending}
                  onClick={() => void saveComment()}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#263875] text-white disabled:opacity-50"
                  aria-label="Save comment"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {tab === "History" && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Task history is not available yet: the backend has no audit-event retrieval endpoint.
            </p>
          )}

          {tab === "Review" && (
            <div className="space-y-4">
              {task.submission ? (
                <div className="rounded-lg border border-slate-200 p-4 text-sm">
                  <p className="font-semibold text-slate-800">Submission</p>
                  <p className="mt-2 text-slate-600">{task.submission.notes}</p>
                  {task.submission.gitReference && <p className="mt-2 text-xs text-slate-500">Git reference: {task.submission.gitReference}</p>}
                  {task.submission.testingNotes && <p className="mt-2 text-xs text-slate-500">Testing: {task.submission.testingNotes}</p>}
                  <p className="mt-2 text-xs text-slate-400">{new Date(task.submission.submittedAt).toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No work submission recorded.</p>
              )}
              {task.reviews.map((review) => (
                <article key={review.id} className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-800">{review.result}</p>
                  <p className="mt-1 text-sm text-slate-600">{review.comments || "No comments provided."}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {review.reviewerName} · {new Date(review.createdAt).toLocaleString()}
                  </p>
                </article>
              ))}
              {task.stage === "Active" && canWork && (
                <div className="space-y-3">
                  <textarea
                    value={submissionNotes}
                    onChange={(event) => setSubmissionNotes(event.target.value)}
                    placeholder="Work summary (required)"
                    className="h-24 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm"
                  />
                  <input value={gitReference} onChange={(event) => setGitReference(event.target.value)} placeholder="Git reference (optional)" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                  <textarea value={testingNotes} onChange={(event) => setTestingNotes(event.target.value)} placeholder="Testing notes (optional)" className="h-20 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm" />
                  <button
                    type="button"
                    disabled={pending || drawerBusy}
                    onClick={() => void submit()}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#263875] text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" /> Submit for review
                  </button>
                </div>
              )}
              {task.stage === "In Review" && canReview && (
                <div className="space-y-3">
                  <textarea
                    value={reviewComments}
                    onChange={(event) => setReviewComments(event.target.value)}
                    placeholder="Review feedback (required when requesting changes)"
                    className="h-24 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm"
                  />
                  <div className="flex gap-2">
                    <button type="button" disabled={pending || drawerBusy} onClick={() => void review("Changes Requested")} className="h-10 flex-1 rounded-lg border border-amber-300 text-sm font-semibold text-amber-700 disabled:opacity-50">
                      Request changes
                    </button>
                    <button type="button" disabled={pending || drawerBusy} onClick={() => void review("Approved")} className="h-10 flex-1 rounded-lg bg-[#263875] text-sm font-semibold text-white disabled:opacity-50">
                      Approve
                    </button>
                  </div>
                </div>
              )}
              {task.stage === "In Review" && !canReview && (
                <p className="text-sm text-slate-500">A project owner, manager, senior developer, or reviewer must review this task.</p>
              )}
              {task.stage === "Completed" && (
                <p className="text-sm text-emerald-700">This task was completed after review approval.</p>
              )}
              {detailsLoading && <p className="text-xs text-slate-400">Loading review history…</p>}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-slate-200 px-6 py-4">
          {task.stage === "Active" && canWork && (
            <button
              type="button"
              disabled={pending || drawerBusy}
              onClick={() => void runDrawerAction(() => task.activeStartedAt ? actions.stopWork(task.id) : actions.startWork(task.id))}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              {task.activeStartedAt ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {task.activeStartedAt ? "Pause work" : "Resume work"}
            </button>
          )}
          {task.stage === "Completed" && (
            <button
              type="button"
              disabled={pending || drawerBusy}
              onClick={() => void runDrawerAction(() => actions.downloadReport(task.id))}
              className="ml-auto flex h-10 items-center gap-2 rounded-lg bg-[#263875] px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Completion report
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

interface CreateTaskProps {
  project: Project;
  onClose: () => void;
  onCreate: (payload: TaskCreate) => Promise<void>;
}

function CreateTaskModal({ project, onClose, onCreate }: CreateTaskProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [category, setCategory] = useState("Feature");
  const [effort, setEffort] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        acceptance_criteria: criteria.trim(),
        priority,
        category,
        estimated_effort: effort.trim(),
        due_date: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null,
      });
    } catch (createError) {
      setError(displayError(createError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">{project.name}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Create task</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400" aria-label="Close create task">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            Task title
            <input required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 h-24 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm font-normal" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Acceptance criteria
            <textarea value={criteria} onChange={(event) => setCriteria(event.target.value)} className="mt-2 h-20 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm font-normal" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                {["Feature", "Bug", "Improvement", "Documentation", "Other"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                {["Low", "Medium", "High", "Urgent"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Estimated effort
              <input value={effort} onChange={(event) => setEffort(event.target.value)} placeholder="5 points" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Due date
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal" />
            </label>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600">
            Cancel
          </button>
          <button type="submit" disabled={saving || !title.trim()} className="h-10 rounded-lg bg-[#263875] px-4 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Creating…" : "Create in backlog"}
          </button>
        </div>
      </form>
    </div>
  );
}
