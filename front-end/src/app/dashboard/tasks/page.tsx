"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock3, Search } from "lucide-react";
import { listProjects } from "@/lib/api/projects";
import { listTasks } from "@/lib/api/tasks";
import { getTaskWorkSessions, startTaskWork, stopTaskWork } from "@/lib/api/work-sessions";
import { submitTaskForReview } from "@/lib/api/reviews";
import { useProtectedUser } from "@/app/route/protected-route";
import type { TaskResponse, WorkSessionSummary } from "@/types/task";
import type { ProjectResponse } from "@/types/project";

export default function MyTasksPage() {
  const user = useProtectedUser();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [summaries, setSummaries] = useState<Record<string, WorkSessionSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("All");
  const [priority, setPriority] = useState("All");
  const [sort, setSort] = useState("due");

  useEffect(() => {
    const controller = new AbortController();
    listProjects(controller.signal)
      .then(async (projectItems) => {
        setProjects(projectItems);
        const groups = await Promise.all(projectItems.map(async (project) => {
          const projectTasks = await listTasks(project.id, controller.signal);
          const mine = projectTasks.filter((task) => task.assignee_id === user?.id);
          const sessionPairs = await Promise.all(mine.map(async (task) => [
            task.id,
            await getTaskWorkSessions(project.id, task.id, controller.signal),
          ] as const));
          return { tasks: mine, sessions: Object.fromEntries(sessionPairs) };
        }));
        if (controller.signal.aborted) return;
        setTasks(groups.flatMap((group) => group.tasks));
        setSummaries(Object.assign({}, ...groups.map((group) => group.sessions)));
      })
      .catch((requestError: unknown) => { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Could not load tasks."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id]);

  const visible = useMemo(() => {
    const items = tasks.filter((task) =>
      task.title.toLowerCase().includes(search.toLowerCase())
      && (stage === "All" || task.stage === stage)
      && (priority === "All" || task.priority === priority),
    );
    return [...items].sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title);
      if (sort === "priority") return left.priority.localeCompare(right.priority);
      const leftDue = left.due_date ? new Date(left.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDue = right.due_date ? new Date(right.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      return leftDue - rightDue;
    });
  }, [tasks, search, stage, priority, sort]);

  async function refreshTask(projectId: string, taskId: string) {
    const [task, summary] = await Promise.all([
      listTasks(projectId).then((items) => items.find((item) => item.id === taskId)),
      getTaskWorkSessions(projectId, taskId),
    ]);
    if (task) setTasks((current) => current.map((item) => item.id === taskId ? task : item));
    setSummaries((current) => ({ ...current, [taskId]: summary }));
  }

  async function startOrPause(task: TaskResponse) {
    const project = projects.find((item) => item.id === task.project_id);
    if (!project) return;
    if (task.active_started_at) await stopTaskWork(project.id, task.id);
    else await startTaskWork(project.id, task.id);
    await refreshTask(project.id, task.id);
  }

  async function submit(task: TaskResponse) {
    await submitTaskForReview(task.project_id, task.id, { notes: "Submitted from My Tasks", git_reference: "", testing_notes: "" });
    await refreshTask(task.project_id, task.id);
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <div><p className="text-xs font-semibold text-slate-400">Assigned work</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">My Tasks</h1></div>
      <div className="mt-6 flex flex-wrap gap-2">
        <label className="flex h-10 min-w-64 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assigned tasks" className="w-full text-sm outline-none" /></label>
        <select value={stage} onChange={(event) => setStage(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option>All</option>{["Backlog","Assigned","Ready","Active","In Review","Completed"].map((value) => <option key={value}>{value}</option>)}</select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option>All</option><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="due">Sort: due date</option><option value="title">Sort: title</option><option value="priority">Sort: priority</option></select>
      </div>
      {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading tasks…</p> : error ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {visible.map((task) => {
            const summary = summaries[task.id];
            const project = projects.find((item) => item.id === task.project_id);
            return (
              <article key={task.id} className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-0 md:flex-row md:items-center">
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-400">{task.display_id}</span><span className="text-xs text-slate-400">{project?.name}</span></div><h2 className="mt-1 truncate font-semibold text-slate-900">{task.title}</h2></div>
                <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 md:w-72"><span>{task.priority} priority</span><span>{task.stage}</span><span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}</span><span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatSeconds(summary?.active_seconds ?? 0)}</span></div>
                <div className="flex gap-2"><Link href={`/dashboard?project=${encodeURIComponent(task.project_id)}&task=${encodeURIComponent(task.id)}#board`} className="h-9 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Details</Link>{task.stage === "Active" && <button onClick={() => void startOrPause(task).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Work action failed"))} className="h-9 rounded-lg bg-[#263875] px-3 text-xs font-semibold text-white">{task.active_started_at ? "Pause" : "Start"}</button>}{task.stage === "Active" && <button onClick={() => void submit(task).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Submit failed"))} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold">Submit</button>}</div>
              </article>
            );
          })}
          {visible.length === 0 && <p className="py-16 text-center text-sm text-slate-500">No tasks assigned to you match these filters.</p>}
        </div>
      )}
    </div>
  );
}

function formatSeconds(value: number) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}
