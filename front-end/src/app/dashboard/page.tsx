"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardHeader from "./components/dashboard-header";
import PipelineBoard from "./components/pipeline-board";
import {
  addTaskComment,
  assignTask as assignTaskRequest,
  createTask as createTaskApiRequest,
  downloadTaskReport,
  getTask as getTaskRequest,
  listTasks,
  transitionTask as transitionTaskRequest,
  updateTask as updateTaskRequest,
} from "@/lib/api/tasks";
import {
  createProject as createProjectRequest,
  getProject,
  listProjects,
} from "@/lib/api/projects";
import { getProjectMembers } from "@/lib/api/teams";
import {
  getTaskReviews,
  reviewTask as reviewTaskRequest,
  submitTaskForReview,
} from "@/lib/api/reviews";
import {
  getTaskWorkSessions,
  startTaskWork,
  stopTaskWork,
} from "@/lib/api/work-sessions";
import {
  applyWorkSessionSummary,
  mapProject,
  mapProjectMember,
  mapReviews,
  mapTask,
} from "@/lib/api/mappers";
import { useProtectedUser } from "@/app/route/protected-route";
import type { Project, ProjectCreate, ProjectResponse } from "@/types/project";
import type { TeamMember } from "@/types/team";
import type { ReviewResponse } from "@/types/review";
import type {
  PipelineTask,
  TaskCreate,
  TaskResponse,
  TaskStage,
  TaskSubmission,
  TaskUpdate,
  WorkSessionSummary,
} from "@/types/task";

interface WorkspaceData {
  project: Project;
  tasks: PipelineTask[];
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function DashboardWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useProtectedUser();
  const projectId = searchParams.get("project");

  const [projectResponses, setProjectResponses] = useState<ProjectResponse[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [projectsAttempt, setProjectsAttempt] = useState(0);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const [workspaceErrorProjectId, setWorkspaceErrorProjectId] = useState<string | null>(null);
  const [workspaceAttempt, setWorkspaceAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [createTaskOpenRequest, setCreateTaskOpenRequest] = useState(0);

  const activeProjectId = useRef<string | null>(null);
  const workspaceRef = useRef<WorkspaceData | null>(null);

  const updateWorkspace = useCallback(
    (update: (current: WorkspaceData | null) => WorkspaceData | null) => {
      setWorkspace((current) => {
        const next = update(current);
        workspaceRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void listProjects(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setProjectsError("");
          setProjectResponses(response);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setProjectsError(errorText(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setProjectsLoading(false);
      });
    return () => controller.abort();
  }, [projectsAttempt]);

  useEffect(() => {
    if (projectsLoading || projectsError) return;
    const selected = projectResponses.find((project) => project.id === projectId);
    if (selected) return;
    if (projectResponses.length > 0) {
      router.replace(`/dashboard?project=${encodeURIComponent(projectResponses[0].id)}`, {
        scroll: false,
      });
    } else if (projectId) {
      router.replace("/dashboard", { scroll: false });
    }
  }, [projectId, projectResponses, projectsError, projectsLoading, router]);

  useEffect(() => {
    const projectResponse = projectResponses.find((project) => project.id === projectId);
    if (!projectResponse || projectsLoading || projectsError) {
      activeProjectId.current = null;
      workspaceRef.current = null;
      return;
    }

    const controller = new AbortController();
    activeProjectId.current = projectResponse.id;
    workspaceRef.current = null;

    void Promise.all([
      getProject(projectResponse.id, controller.signal),
      getProjectMembers(projectResponse.id, controller.signal),
      listTasks(projectResponse.id, controller.signal),
    ])
      .then(async ([project, memberResponses, taskResponses]) => {
        const members = memberResponses.map(mapProjectMember);
        const tasks = taskResponses.map((task) => mapTask(task));
        const summaries = await Promise.all(
          tasks.map(async (task) => {
            const summary = await getTaskWorkSessions(
              projectResponse.id,
              task.id,
              controller.signal,
            );
            return [task.id, summary] as const;
          }),
        );
        if (controller.signal.aborted) return;

        const summariesByTask = new Map<string, WorkSessionSummary>(summaries);
        const result: WorkspaceData = {
          project: mapProject(project, members),
          tasks: tasks.map((task) => {
            const summary = summariesByTask.get(task.id);
            return summary ? applyWorkSessionSummary(task, summary) : task;
          }),
        };
        workspaceRef.current = result;
        setWorkspace(result);
        setWorkspaceError("");
        setWorkspaceErrorProjectId(null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setWorkspaceError(errorText(error));
          setWorkspaceErrorProjectId(projectResponse.id);
        }
      });

    return () => controller.abort();
  }, [projectId, projectResponses, projectsError, projectsLoading, workspaceAttempt]);

  const activeWorkspace = workspace?.project.id === projectId ? workspace : null;
  const selectedProject = activeWorkspace?.project ?? null;
  const projectOptions = useMemo(
    () =>
      projectResponses.map((project) =>
        mapProject(
          project,
          project.id === selectedProject?.id ? selectedProject.members : [],
        ),
      ),
    [projectResponses, selectedProject],
  );

  const replaceTask = useCallback(
    (targetProjectId: string, taskResponse: TaskResponse) => {
      if (activeProjectId.current !== targetProjectId) return;
      updateWorkspace((current) => {
        if (!current || current.project.id !== targetProjectId) return current;
        const previous = current.tasks.find((task) => task.id === taskResponse.id);
        const nextTask = mapTask(taskResponse, previous);
        const exists = current.tasks.some((task) => task.id === nextTask.id);
        const tasks = exists
          ? current.tasks.map((task) => (task.id === nextTask.id ? nextTask : task))
          : [...current.tasks, nextTask];
        return { ...current, tasks };
      });
    },
    [updateWorkspace],
  );

  const replaceTaskSummary = useCallback(
    (
      targetProjectId: string,
      taskId: string,
      summary: WorkSessionSummary,
      reviews?: ReviewResponse[],
    ) => {
      if (activeProjectId.current !== targetProjectId) return;
      updateWorkspace((current) => {
        if (!current || current.project.id !== targetProjectId) return current;
        const tasks = current.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const updated = applyWorkSessionSummary(task, summary);
          if (reviews) updated.reviews = mapReviews(reviews, current.project.members);
          return updated;
        });
        return { ...current, tasks };
      });
    },
    [updateWorkspace],
  );

  const refreshTaskExtras = useCallback(
    async (targetProjectId: string, taskId: string, includeReviews = false) => {
      const [summary, reviews] = await Promise.all([
        getTaskWorkSessions(targetProjectId, taskId),
        includeReviews ? getTaskReviews(targetProjectId, taskId) : Promise.resolve(undefined),
      ]);
      if (activeProjectId.current !== targetProjectId) return;
      replaceTaskSummary(targetProjectId, taskId, summary, reviews);
    },
    [replaceTaskSummary],
  );

  const refreshTaskDetails = useCallback(
    async (taskId: string, signal: AbortSignal) => {
      const targetProjectId = activeProjectId.current;
      if (!targetProjectId) return;
      const [task, summary, reviews] = await Promise.all([
        getTaskRequest(targetProjectId, taskId, signal),
        getTaskWorkSessions(targetProjectId, taskId, signal),
        getTaskReviews(targetProjectId, taskId, signal),
      ]);
      if (signal.aborted || activeProjectId.current !== targetProjectId) return;
      replaceTask(targetProjectId, task);
      replaceTaskSummary(targetProjectId, taskId, summary, reviews);
    },
    [replaceTask, replaceTaskSummary],
  );

  const createTask = useCallback(
    async (payload: TaskCreate) => {
      const targetProjectId = activeProjectId.current;
      if (!targetProjectId) throw new Error("Select a project before creating a task.");
      const response = await createTaskApiRequest(targetProjectId, payload);
      replaceTask(targetProjectId, response);
    },
    [replaceTask],
  );

  const updateTask = useCallback(
    async (taskId: string, payload: TaskUpdate) => {
      const targetProjectId = activeProjectId.current;
      if (!targetProjectId) throw new Error("Select a project before updating a task.");
      const response = await updateTaskRequest(targetProjectId, taskId, payload);
      replaceTask(targetProjectId, response);
    },
    [replaceTask],
  );

  const assignTask = useCallback(
    async (taskId: string, userId: string) => {
      const targetProjectId = activeProjectId.current;
      if (!targetProjectId) throw new Error("Select a project before assigning a task.");
      const response = await assignTaskRequest(targetProjectId, taskId, {
        assignee_id: userId,
      });
      replaceTask(targetProjectId, response);
    },
    [replaceTask],
  );

  const transitionTask = useCallback(
    async (taskId: string, stage: TaskStage) => {
      const targetProjectId = activeProjectId.current;
      if (!targetProjectId) throw new Error("Select a project before moving a task.");
      const response = await transitionTaskRequest(targetProjectId, taskId, stage);
      replaceTask(targetProjectId, response);
      try {
        await refreshTaskExtras(targetProjectId, taskId);
      } catch (error) {
        throw new Error(`Task moved, but work-time data could not refresh: ${errorText(error)}`);
      }
    },
    [refreshTaskExtras, replaceTask],
  );

  const startWork = useCallback(
    async (taskId: string) => {
      const targetProjectId = activeProjectId.current;
      if (!targetProjectId) throw new Error("Select a project before starting work.");
      const session = await startTaskWork(targetProjectId, taskId);
      const currentTask = workspaceRef.current?.tasks.find((task) => task.id === taskId);
      if (currentTask) {
        replaceTask(targetProjectId, {
          ...({
            id: currentTask.id,
            display_id: currentTask.displayId,
            project_id: currentTask.projectId,
            title: currentTask.title,
            description: currentTask.description,
            acceptance_criteria: currentTask.acceptanceCriteria,
            category: currentTask.category,
            priority: currentTask.priority,
            estimated_effort: currentTask.estimatedEffort,
            due_date: currentTask.dueDate,
            stage: "Active",
            assignee_id: currentTask.assigneeId,
            assigned_at: currentTask.assignedAt,
            assigned_by: currentTask.assignedBy,
            first_started_at: currentTask.firstStartedAt ?? session.started_at,
            active_started_at: session.started_at,
            submitted_at: currentTask.submission?.submittedAt ?? null,
            submission_notes: currentTask.submission?.notes ?? null,
            git_reference: currentTask.submission?.gitReference ?? null,
            testing_notes: currentTask.submission?.testingNotes ?? null,
            completed_at: null,
            approved_by: null,
            blocked_reason: currentTask.blockedReason,
            created_at: currentTask.createdAt,
            last_activity_at: session.started_at,
          } satisfies TaskResponse),
        });
      }
      try {
        await refreshTaskExtras(targetProjectId, taskId);
      } catch (error) {
        throw new Error(`Work started, but recorded time could not refresh: ${errorText(error)}`);
      }
    },
    [refreshTaskExtras, replaceTask],
  );

  const stopWork = useCallback(
    async (taskId: string) => {
      const targetProjectId = activeProjectId.current;
      if (!targetProjectId) throw new Error("Select a project before pausing work.");
      const session = await stopTaskWork(targetProjectId, taskId);
      updateWorkspace((current) => {
        if (!current || current.project.id !== targetProjectId) return current;
        const tasks = current.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                activeStartedAt: null,
                lastActivityAt: session.ended_at ?? task.lastActivityAt,
                workSessions: task.workSessions.map((item) =>
                  item.id === session.id ? session : item,
                ),
                timeSyncedAt: null,
              }
            : task,
        );
        return { ...current, tasks };
      });
      try {
        await refreshTaskExtras(targetProjectId, taskId);
      } catch (error) {
        throw new Error(`Work paused, but recorded time could not refresh: ${errorText(error)}`);
      }
    },
    [refreshTaskExtras, updateWorkspace],
  );

  const submitForReview = useCallback(
    async (taskId: string, payload: TaskSubmission) => {
      const targetProjectId = activeProjectId.current;
      if (!targetProjectId) throw new Error("Select a project before submitting work.");
      const response = await submitTaskForReview(targetProjectId, taskId, payload);
      replaceTask(targetProjectId, response);
      try {
        await refreshTaskExtras(targetProjectId, taskId);
      } catch (error) {
        throw new Error(`Submission saved, but work-time data could not refresh: ${errorText(error)}`);
      }
    },
    [refreshTaskExtras, replaceTask],
  );

  const reviewTask = useCallback(
    async (taskId: string, payload: { result: "Approved" | "Changes Requested"; comments: string }) => {
      const targetProjectId = activeProjectId.current;
      if (!targetProjectId) throw new Error("Select a project before reviewing a task.");
      const response = await reviewTaskRequest(targetProjectId, taskId, payload);
      replaceTask(targetProjectId, response);
      try {
        await refreshTaskExtras(targetProjectId, taskId, true);
      } catch (error) {
        throw new Error(`Review saved, but review history could not refresh: ${errorText(error)}`);
      }
    },
    [refreshTaskExtras, replaceTask],
  );

  const addComment = useCallback(async (taskId: string, body: string) => {
    const targetProjectId = activeProjectId.current;
    if (!targetProjectId) throw new Error("Select a project before commenting.");
    await addTaskComment(targetProjectId, taskId, body);
  }, []);

  const downloadReport = useCallback(async (taskId: string) => {
    const targetProjectId = activeProjectId.current;
    if (!targetProjectId) throw new Error("Select a project before downloading a report.");
    const { blob, filename } = await downloadTaskReport(targetProjectId, taskId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename ?? "task-completion-report.txt";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const actions = useMemo(
    () => ({
      createTask,
      updateTask,
      assignTask,
      transitionTask,
      startWork,
      stopWork,
      submitForReview,
      reviewTask,
      addComment,
      refreshTask: refreshTaskDetails,
      downloadReport,
    }),
    [
      addComment,
      assignTask,
      createTask,
      downloadReport,
      refreshTaskDetails,
      reviewTask,
      startWork,
      stopWork,
      submitForReview,
      transitionTask,
      updateTask,
    ],
  );

  const createProject = useCallback(
    async (payload: ProjectCreate) => {
      const created = await createProjectRequest(payload);
      setProjectResponses((current) => [
        created,
        ...current.filter((project) => project.id !== created.id),
      ]);
      router.replace(`/dashboard?project=${encodeURIComponent(created.id)}`, {
        scroll: false,
      });
    },
    [router],
  );

  const projectChange = (nextProjectId: string) => {
    router.replace(`/dashboard?project=${encodeURIComponent(nextProjectId)}`, {
      scroll: false,
    });
  };

  const header = (
    <DashboardHeader
      search={search}
      onSearch={setSearch}
      projects={projectOptions}
      selectedProject={selectedProject}
      onProjectChange={projectChange}
      onCreateProject={createProject}
      onAddTask={() => setCreateTaskOpenRequest((current) => current + 1)}
    />
  );

  if (projectsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500" role="status">Loading your projects…</p>
      </div>
    );
  }

  if (projectsError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-center">
          <h1 className="font-semibold text-slate-900">Projects could not be loaded</h1>
          <p className="mt-2 text-sm text-red-700">{projectsError}</p>
          <button type="button" onClick={() => {
            setProjectsError("");
            setProjectsLoading(true);
            setProjectsAttempt((value) => value + 1);
          }} className="mt-4 rounded-lg bg-[#263875] px-4 py-2 text-sm font-semibold text-white">
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (projectResponses.length === 0) {
    return (
      <div className="min-h-screen">
        {header}
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-slate-900">No projects available</h1>
          <p className="mt-2 text-sm text-slate-500">You are not a member of any projects yet. Create one to get started.</p>
        </main>
      </div>
    );
  }

  const selectedProjectIsAccessible = projectResponses.some((project) => project.id === projectId);
  const selectedWorkspaceError = workspaceErrorProjectId === projectId ? workspaceError : "";
  if (!selectedProjectIsAccessible) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500" role="status">Loading project workspace…</p>
      </div>
    );
  }

  if (selectedWorkspaceError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-center">
          <h1 className="font-semibold text-slate-900">Project workspace could not be loaded</h1>
          <p className="mt-2 text-sm text-red-700">{selectedWorkspaceError}</p>
          <button type="button" onClick={() => {
            setWorkspaceError("");
            setWorkspaceErrorProjectId(null);
            setWorkspaceAttempt((value) => value + 1);
          }} className="mt-4 rounded-lg bg-[#263875] px-4 py-2 text-sm font-semibold text-white">
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500" role="status">Loading project workspace…</p>
      </div>
    );
  }

  const currentWorkspace = activeWorkspace;
  const assignedMember = currentWorkspace.project.members.find(
    (member: TeamMember) => member.id === currentUser?.id,
  );

  return (
    <div className="min-h-screen">
      {header}
      <main className="space-y-6 px-3 pb-8 pt-4 sm:px-5 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-400">
              {currentWorkspace.project.id.slice(0, 8).toUpperCase()} · Development workspace
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{currentWorkspace.project.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">{currentWorkspace.project.description}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>{currentWorkspace.tasks.length} tasks</span>
            <span>Due {currentWorkspace.project.deadline ? new Date(currentWorkspace.project.deadline).toLocaleDateString() : "No deadline"}</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">{currentWorkspace.project.status}</span>
          </div>
        </div>

        <PipelineBoard
          key={currentWorkspace.project.id}
          project={currentWorkspace.project}
          tasks={currentWorkspace.tasks}
          search={search}
          onSearch={setSearch}
          currentUserId={currentUser?.id ?? ""}
          currentUserRoles={assignedMember?.roles ?? ""}
          actions={actions}
          createTaskRequest={createTaskOpenRequest}
        />

        <section id="team" className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Project team</h2>
              <p className="mt-1 text-sm text-slate-500">Members and roles are loaded from this project’s membership list.</p>
            </div>
            <span className="text-xs text-slate-400">{currentWorkspace.project.members.length} members</span>
          </div>
          {currentWorkspace.project.members.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No members found for this project.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currentWorkspace.project.members.map((member) => (
                <li key={member.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-100 p-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${member.color}`}>
                    {member.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{member.name}</span>
                    <span className="block truncate text-xs text-slate-500">{member.roles}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-400">
            The backend can add memberships by user ID, but does not yet expose a directory or invitation workflow for discovering users.
          </p>
        </section>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500" role="status">Loading project workspace…</p>
        </div>
      }
    >
      <DashboardWorkspace />
    </Suspense>
  );
}
