"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { listProjects } from "@/lib/api/projects";
import { getProjectMembers, removeProjectMembership, updateProjectMembership } from "@/lib/api/teams";
import { listTasks } from "@/lib/api/tasks";
import type { ProjectResponse } from "@/types/project";
import type { ProjectMemberResponse } from "@/types/team";

export default function TeamPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get("project");
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectId, setProjectId] = useState("");
  const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, { active: number; completed: number; total: number }>>({});
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listProjects().then((items) => {
      setProjects(items);
      const initial = items.find((item) => item.id === selectedId)?.id ?? items[0]?.id ?? "";
      setProjectId(initial);
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load projects."));
  }, [selectedId]);

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    Promise.all([getProjectMembers(projectId, controller.signal), listTasks(projectId, controller.signal)])
      .then(([memberItems, tasks]) => {
        setMembers(memberItems);
        setTaskCounts(Object.fromEntries(memberItems.map((member) => {
          const assigned = tasks.filter((task) => task.assignee_id === member.user_id);
          return [member.user_id, {
            total: assigned.length,
            active: assigned.filter((task) => task.stage === "Active").length,
            completed: assigned.filter((task) => task.stage === "Completed").length,
          }];
        })));
      })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Could not load team."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId]);

  const visible = useMemo(() => members.filter((member) =>
    `${member.fullname} ${member.email}`.toLowerCase().includes(search.toLowerCase())
    && (role === "All" || member.roles.toLowerCase().includes(role.toLowerCase())),
  ), [members, search, role]);

  async function changeRole(member: ProjectMemberResponse, value: string) {
    await updateProjectMembership(projectId, member.user_id, value);
    setMembers((current) => current.map((item) => item.user_id === member.user_id ? { ...item, roles: value } : item));
  }

  async function removeMember(member: ProjectMemberResponse) {
    await removeProjectMembership(projectId, member.user_id);
    setMembers((current) => current.filter((item) => item.user_id !== member.user_id));
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-slate-400">Project workspace</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">Team Members</h1></div><select value={projectId} onChange={(event) => { setProjectId(event.target.value); router.replace(`/dashboard/team?project=${encodeURIComponent(event.target.value)}`, { scroll: false }); }} className="h-10 max-w-72 rounded-lg border border-slate-200 bg-white px-3 text-sm">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
      <div className="mt-6 flex flex-wrap gap-2"><label className="flex h-10 min-w-64 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" className="w-full text-sm outline-none" /></label><select value={role} onChange={(event) => setRole(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option>All</option><option>Owner</option><option>Manager</option><option>Developer</option><option>Reviewer</option></select></div>
      {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading team…</p> : error ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((member) => {
          const counts = taskCounts[member.user_id] ?? { active: 0, completed: 0, total: 0 };
          return (
            <article key={member.user_id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#263875] text-xs font-semibold text-white">{member.fullname.split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase()}</span><div className="min-w-0"><h2 className="truncate font-semibold text-slate-900">{member.fullname}</h2><p className="truncate text-xs text-slate-500">{member.email}</p></div></div><button type="button" aria-label={`Remove ${member.fullname}`} onClick={() => void removeMember(member).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not remove member."))} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
              <label className="mt-4 block text-xs font-medium text-slate-500">Project role<select value={member.roles} onChange={(event) => void changeRole(member, event.target.value).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not update role."))} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800"><option value="owner,manager">Owner / Manager</option><option value="manager">Manager</option><option value="developer">Developer</option><option value="senior developer,reviewer">Senior Developer / Reviewer</option><option value="reviewer">Reviewer</option></select></label>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-semibold text-slate-900">{counts.total}</p><p className="text-[11px] text-slate-500">Assigned</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-semibold text-slate-900">{counts.active}</p><p className="text-[11px] text-slate-500">Active</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-semibold text-slate-900">{counts.completed}</p><p className="text-[11px] text-slate-500">Completed</p></div></div>
            </article>
          );
        })}{visible.length === 0 && <p className="col-span-full rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">No team members match these filters.</p>}</div>
      )}
    </div>
  );
}
