"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { listProjects } from "@/lib/api/projects";
import { listTasks, updateTask } from "@/lib/api/tasks";
import { getProjectMembers } from "@/lib/api/teams";
import type { ProjectResponse } from "@/types/project";
import type { TaskResponse } from "@/types/task";
import type { ProjectMemberResponse } from "@/types/team";

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get("project");
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectId, setProjectId] = useState("");
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
  const [assignee, setAssignee] = useState("All");
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<TaskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listProjects().then((items) => {
      setProjects(items);
      setProjectId(items.find((item) => item.id === selectedId)?.id ?? items[0]?.id ?? "");
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load projects."));
  }, [selectedId]);

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    Promise.all([listTasks(projectId, controller.signal), getProjectMembers(projectId, controller.signal)])
      .then(([taskItems, memberItems]) => { setTasks(taskItems); setMembers(memberItems); })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Could not load calendar."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId]);

  const filtered = useMemo(() => tasks.filter((task) =>
    assignee === "All" || task.assignee_id === assignee,
  ), [tasks, assignee]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - startOffset + 1;
    return day >= 1 && day <= daysInMonth ? new Date(year, monthIndex, day) : null;
  });
  function eventsFor(date: Date) {
    return filtered.filter((task) => {
      const value = task.due_date ? new Date(task.due_date) : null;
      return value && value.getFullYear() === date.getFullYear() && value.getMonth() === date.getMonth() && value.getDate() === date.getDate();
    });
  }
  const projectDeadline = projects.find((project) => project.id === projectId)?.deadline;

  async function editDeadline(task: TaskResponse, value: string) {
    const updated = await updateTask(projectId, task.id, { due_date: value ? new Date(`${value}T00:00:00`).toISOString() : null });
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelected(updated);
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-slate-400">Schedule</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">Calendar</h1></div><div className="flex gap-2"><select value={projectId} onChange={(event) => { setProjectId(event.target.value); router.replace(`/dashboard/calendar?project=${encodeURIComponent(event.target.value)}`, { scroll: false }); }} className="h-10 max-w-72 rounded-lg border border-slate-200 bg-white px-3 text-sm">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="All">All assignees</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.fullname}</option>)}</select></div></div>
      {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading calendar…</p> : error ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="rounded-lg border border-slate-200 p-2"><ChevronLeft className="h-4 w-4" /></button><h2 className="font-semibold text-slate-900">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="rounded-lg border border-slate-200 p-2"><ChevronRight className="h-4 w-4" /></button></div>
          {projectDeadline && <p className="mb-3 text-xs text-slate-500">Project deadline: {new Date(projectDeadline).toLocaleDateString()}</p>}
          <div className="grid grid-cols-7 border-l border-t border-slate-200">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <div key={day} className="border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-500">{day}</div>)}{cells.map((date, index) => <div key={index} className="min-h-28 border-b border-r border-slate-200 p-2">{date && <><span className="text-xs font-medium text-slate-500">{date.getDate()}</span><div className="mt-1 space-y-1">{eventsFor(date).map((task) => { const overdue = task.stage !== "Completed" && new Date(task.due_date as string) < new Date(); return <button key={task.id} type="button" onClick={() => setSelected(task)} className={`block w-full truncate rounded px-1.5 py-1 text-left text-[11px] font-semibold ${overdue ? "bg-red-50 text-red-700" : "bg-[#eef1fb] text-[#263875]"}`}>{task.display_id} · {task.title}</button>; })}</div></>}</div>)}</div>
        </div>
      )}
      {selected && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/25 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-400">{selected.display_id}</p><h2 className="mt-1 text-lg font-semibold">{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} className="text-slate-400">Close</button></div><p className="mt-3 text-sm text-slate-600">{selected.description || "No description"}</p><label className="mt-5 block text-sm font-medium">Deadline<input type="date" defaultValue={selected.due_date ? selected.due_date.slice(0,10) : ""} onChange={(event) => void editDeadline(selected, event.target.value).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not update deadline."))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" /></label></div></div>}
    </div>
  );
}
