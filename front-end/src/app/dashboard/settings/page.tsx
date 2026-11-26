"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProtectedUser } from "@/app/route/protected-route";
import { getProject, listProjects, updateProject } from "@/lib/api/projects";
import { getProjectMembers } from "@/lib/api/teams";
import { updateCurrentUser } from "@/lib/api/user";
import type { ProjectResponse } from "@/types/project";
import type { ProjectMemberResponse } from "@/types/team";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get("project");
  const user = useProtectedUser();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");
  const [priority, setPriority] = useState("Medium");
  const [deadline, setDeadline] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setFullname(user?.fullname ?? "");
      setUsername(user?.username ?? "");
    });
  }, [user]);

  useEffect(() => {
    listProjects().then((items) => {
      setProjects(items);
      setProjectId(items.find((item) => item.id === selectedId)?.id ?? items[0]?.id ?? "");
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load projects."));
  }, [selectedId]);

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    Promise.all([getProject(projectId, controller.signal), getProjectMembers(projectId, controller.signal)])
      .then(([projectItem, memberItems]) => {
        setProject(projectItem);
        setMembers(memberItems);
        setName(projectItem.name);
        setDescription(projectItem.description);
        setStatus(projectItem.status);
        setPriority(projectItem.priority);
        setDeadline(projectItem.deadline ? projectItem.deadline.slice(0,10) : "");
      })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Could not load settings."); });
    return () => controller.abort();
  }, [projectId]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setMessage("");
    try { await updateCurrentUser({ fullname, username }); setMessage("Profile updated."); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not update profile."); }
  }

  async function saveProject(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setMessage("");
    try {
      const updated = await updateProject(projectId, { name, description, status, priority, deadline: deadline ? new Date(`${deadline}T00:00:00`).toISOString() : null });
      setProject(updated); setMessage("Project settings updated.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not update project."); }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <p className="text-xs font-semibold text-slate-400">Workspace preferences</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">Settings</h1>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6"><h2 className="font-semibold text-slate-900">Account</h2><form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Full name<input required value={fullname} onChange={(event) => setFullname(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" /></label><label className="text-sm font-medium">Username<input required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" /></label><div className="sm:col-span-2 flex items-center justify-between"><p className="text-xs text-slate-500">{user?.email}</p><button className="h-10 rounded-lg bg-[#263875] px-4 text-sm font-semibold text-white">Save profile</button></div></form></section>
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Project settings</h2>
          <select value={projectId} onChange={(event) => { setProjectId(event.target.value); router.replace(`/dashboard/settings?project=${encodeURIComponent(event.target.value)}`, { scroll: false }); }} className="h-10 max-w-72 rounded-lg border border-slate-200 px-3 text-sm">
            {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        {project && (
          <form onSubmit={saveProject} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Project name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
            <label className="text-sm font-medium">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"><option>Active</option><option>Completed</option><option>On Hold</option></select></label>
            <label className="text-sm font-medium sm:col-span-2">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 p-3" /></label>
            <label className="text-sm font-medium">Priority<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label>
            <label className="text-sm font-medium">Deadline<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
            <div className="sm:col-span-2 flex justify-end"><button className="h-10 rounded-lg bg-[#263875] px-4 text-sm font-semibold text-white">Save project</button></div>
          </form>
        )}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-800">Project members and permissions</h3>
          <div className="mt-3 space-y-2">{members.map((member) => <div key={member.user_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{member.fullname}</span><span className="text-xs text-slate-500">{member.roles}</span></div>)}</div>
        </div>
      </section>
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6"><h2 className="font-semibold text-slate-900">Workflow rules</h2><p className="mt-3 text-sm leading-6 text-slate-600">Backlog → Assigned → Ready → Active → In Review → Completed. Tasks require an assignee and complete requirements before Ready. Only assigned developers can start and submit work. Reviewers approve or return tasks for changes.</p></section>
    </div>
  );
}
