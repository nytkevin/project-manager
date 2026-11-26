import { CalendarDays, Flag } from "lucide-react";
import type { Project, Task } from "../data/dashboard-data";

export default function ProjectOverview({
  project,
  tasks,
}: {
  project: Project;
  tasks: Task[];
}) {
  const completed = tasks.filter((task) => task.status === "Completed").length;
  const progress = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

  return (
    <section id="overview" className="grid min-w-0 gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <article className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Project Progress</h2>
          <span className="text-sm font-semibold text-[#263875]">{progress}%</span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#263875]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{completed}</span> of {tasks.length} tasks completed
        </p>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Project Details</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-400">Status</dt>
            <dd className="mt-1 font-medium text-slate-700">{project.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Priority</dt>
            <dd className="mt-1 flex items-center gap-1 font-medium text-slate-700"><Flag className="h-3.5 w-3.5" />{project.priority}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Start date</dt>
            <dd className="mt-1 font-medium text-slate-700">{project.startDate}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Deadline</dt>
            <dd className="mt-1 flex items-center gap-1 font-medium text-slate-700"><CalendarDays className="h-3.5 w-3.5" />{project.deadline}</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}
