"use client";

import { useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Flag,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useProtectedUser } from "@/app/route/protected-route";
import type { ProjectCreate, Project } from "@/types/project";
import type { TeamMember } from "@/types/team";

interface Props {
  search: string;
  onSearch: (value: string) => void;
  projects: Project[];
  selectedProject: Project | null;
  onProjectChange: (projectId: string) => void;
  onCreateProject: (payload: ProjectCreate) => Promise<void>;
  onAddTask: () => void;
}

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Completed: "bg-slate-100 text-slate-600",
  "On Hold": "bg-amber-50 text-amber-700",
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No deadline";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function DashboardHeader({
  search,
  onSearch,
  projects,
  selectedProject,
  onProjectChange,
  onCreateProject,
  onAddTask,
}: Props) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectOpen, setProjectOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const user = useProtectedUser();

  const visibleProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(projectSearch.toLowerCase()),
  );
  const profileName = user?.fullname || "Signed in user";
  const profileInitials = initials(profileName);

  const submitProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      await onCreateProject({
        name: projectName.trim(),
        description: projectDescription.trim(),
      });
      setProjectName("");
      setProjectDescription("");
      setCreateOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not create project.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <header className="relative z-30 border-b border-slate-200 bg-white">
        <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          {selectedProject ? (
            <div className="relative">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={projectOpen}
                onClick={() => setProjectOpen((open) => !open)}
                className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 text-left hover:bg-slate-50"
              >
                <span className="hidden text-xs text-slate-400 sm:block">Projects /</span>
                <span className="max-w-44 truncate text-sm font-semibold text-slate-800 sm:max-w-56">
                  {selectedProject.name}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
              {projectOpen && (
                <div className="absolute left-0 top-12 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <label className="mx-1 flex h-9 items-center gap-2 rounded-lg bg-slate-50 px-3">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      value={projectSearch}
                      onChange={(event) => setProjectSearch(event.target.value)}
                      placeholder="Find a project"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </label>
                  <div className="mt-2 max-h-64 overflow-y-auto">
                    {visibleProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          onProjectChange(project.id);
                          setProjectOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left ${
                          project.id === selectedProject.id ? "bg-[#eef1fb]" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate text-sm font-medium text-slate-800">{project.name}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyles[project.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {project.status}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="mt-2 flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-3 text-sm font-semibold text-[#263875]"
                  >
                    <Plus className="h-4 w-4" /> Create new project
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 text-sm font-semibold text-[#263875]"
            >
              <Plus className="h-4 w-4" />
              Create a project
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <label className="hidden h-10 w-52 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 lg:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Search tasks"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
            <div className="relative">
              <button
                aria-label="Notifications"
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setProfileOpen(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <Bell className="h-[18px] w-[18px]" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notifications</p>
                  <p className="mt-3 text-slate-600">No new notifications for this project.</p>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
                className="flex h-10 items-center gap-2 rounded-lg px-1"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#263875] text-xs font-semibold text-white">
                  {profileInitials}
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate font-semibold text-slate-800">{profileName}</p>
                    <p className="truncate text-xs text-slate-400">{user?.email}</p>
                  </div>
                  <button className="mt-1 w-full rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-50">Account settings</button>
                  <button className="w-full rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50">Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {selectedProject && (
        <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{selectedProject.name}</h1>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[selectedProject.status]}`}>
                  {selectedProject.status}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{selectedProject.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Due {formatDate(selectedProject.deadline)}</span>
                <span className="flex items-center gap-1.5"><Flag className="h-4 w-4" />{selectedProject.priority} priority</span>
                <span className="flex items-center gap-2"><Users className="h-4 w-4" />{selectedProject.members.length} members
                  <span className="flex -space-x-2">
                    {selectedProject.members.slice(0, 4).map((member: TeamMember) => (
                      <span key={member.id} title={`${member.name} · ${member.roles}`} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-semibold text-white ${member.color}`}>
                        {member.initials}
                      </span>
                    ))}
                  </span>
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => document.getElementById("team")?.scrollIntoView({ behavior: "smooth" })}>Manage Project</button>
              <button type="button" onClick={onAddTask} className="h-10 rounded-lg bg-[#263875] px-4 text-sm font-semibold text-white hover:bg-[#1e2e60]">Add Task</button>
            </div>
          </div>
        </section>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={() => setCreateOpen(false)}>
          <form onMouseDown={(event) => event.stopPropagation()} onSubmit={submitProject} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Create project</h2>
            <label className="mt-5 block text-sm font-medium text-slate-700">Project name<input required maxLength={255} value={projectName} onChange={(event) => setProjectName(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-[#263875]" /></label>
            <label className="mt-4 block text-sm font-medium text-slate-700">Description<textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} className="mt-2 h-20 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[#263875]" /></label>
            {createError && <p role="alert" className="mt-3 text-sm text-red-600">{createError}</p>}
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600">Cancel</button><button type="submit" disabled={creating || !projectName.trim()} className="h-10 rounded-lg bg-[#263875] px-4 text-sm font-semibold text-white disabled:opacity-50">{creating ? "Creating..." : "Create"}</button></div>
          </form>
        </div>
      )}
    </>
  );
}
