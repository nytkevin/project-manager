"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { createProject, listProjects, updateProject } from "@/lib/api/projects";
import { getProjectMembers } from "@/lib/api/teams";
import { listTasks } from "@/lib/api/tasks";
import type { ProjectCreate, ProjectResponse, ProjectUpdate } from "@/types/project";

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("project");
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [counts, setCounts] = useState<Record<string, { members: number; tasks: number; completed: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [editing, setEditing] = useState<ProjectResponse | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    listProjects(controller.signal)
      .then(async (items) => {
        setProjects(items);
        const details = await Promise.all(items.map(async (project) => {
          const [members, tasks] = await Promise.all([
            getProjectMembers(project.id, controller.signal),
            listTasks(project.id, controller.signal),
          ]);
          return [project.id, {
            members: members.length,
            tasks: tasks.length,
            completed: tasks.filter((task) => task.stage === "Completed").length,
          }] as const;
        }));
        if (!controller.signal.aborted) setCounts(Object.fromEntries(details));
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Could not load projects.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const visible = useMemo(() => projects.filter((project) =>
    `${project.name} ${project.description}`.toLowerCase().includes(search.toLowerCase())
    && (status === "All" || project.status === status)
    && (priority === "All" || project.priority === priority),
  ), [projects, search, status, priority]);

  async function saveProject(payload: ProjectCreate | ProjectUpdate, projectId?: string) {
    const saved = projectId
      ? await updateProject(projectId, payload)
      : await createProject(payload as ProjectCreate);
    setProjects((current) => projectId
      ? current.map((project) => project.id === projectId ? saved : project)
      : [saved, ...current]);
    setEditing(null);
    setCreating(false);
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold text-slate-400">Workspace</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">Projects</h1></div>
        <button type="button" onClick={() => setCreating(true)} className="flex h-10 items-center gap-2 rounded-lg bg-[#263875] px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />New project</button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <label className="flex h-10 min-w-64 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects" className="w-full text-sm outline-none" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option>All</option><option>Active</option><option>Completed</option><option>On Hold</option></select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option>All</option><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select>
      </div>
      {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading projects…</p> : error ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => {
            const count = counts[project.id] ?? { members: 0, tasks: 0, completed: 0 };
            const progress = count.tasks ? Math.round((count.completed / count.tasks) * 100) : 0;
            return (
              <article key={project.id} className={`rounded-xl border bg-white p-5 ${selectedId === project.id ? "border-[#263875]" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{project.name}</h2><p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.description || "No description"}</p></div><button type="button" onClick={() => setEditing(project)} className="text-xs font-semibold text-[#263875]">Edit</button></div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2 py-1">{project.status}</span><span className="rounded-full bg-slate-100 px-2 py-1">{project.priority}</span></div>
                <div className="mt-5"><div className="flex justify-between text-xs text-slate-500"><span>{count.members} members</span><span>{progress}% complete</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#263875]" style={{ width: `${progress}%` }} /></div></div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{project.deadline ? `Due ${new Date(project.deadline).toLocaleDateString()}` : "No deadline"}</span><Link href={`/dashboard?project=${encodeURIComponent(project.id)}`} className="font-semibold text-[#263875]">Open Kanban</Link></div>
              </article>
            );
          })}
          {visible.length === 0 && <p className="col-span-full rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">No projects match these filters.</p>}
        </div>
      )}
      {(creating || editing) && <ProjectModal project={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={saveProject} />}
    </div>
  );
}

function ProjectModal({ project, onClose, onSave }: { project: ProjectResponse | null; onClose: () => void; onSave: (payload: ProjectCreate | ProjectUpdate, projectId?: string) => Promise<void> }) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState(project?.status ?? "Active");
  const [priority, setPriority] = useState(project?.priority ?? "Medium");
  const [deadline, setDeadline] = useState(project?.deadline ? project.deadline.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Inline submit is kept local to the modal so it can preserve field-level loading state.
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/25 p-4" role="dialog" aria-modal="true">
      <form onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError("");
        try { await onSave(project ? { name, description, status, priority, deadline: deadline ? new Date(`${deadline}T00:00:00`).toISOString() : null } : { name, description, status, priority, deadline: deadline ? new Date(`${deadline}T00:00:00`).toISOString() : null }, project?.id); }
        catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not save project."); }
        finally { setSaving(false); }
      }} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900">{project ? "Edit project" : "Create project"}</h2>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium">Name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
          <label className="block text-sm font-medium">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 p-3" /></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"><option>Active</option><option>Completed</option><option>On Hold</option></select></label><label className="text-sm font-medium">Priority<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label></div>
          <label className="block text-sm font-medium">Deadline<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm">Cancel</button><button disabled={saving} className="h-10 rounded-lg bg-[#263875] px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div>
      </form>
    </div>
  );
}
