"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Priority, Task, TaskStatus } from "../data/dashboard-data";

const priorityStyles: Record<Priority, string> = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-blue-50 text-blue-700",
  High: "bg-orange-50 text-orange-700",
  Urgent: "bg-red-50 text-red-700",
};
const statusStyles: Record<TaskStatus, string> = {
  "To Do": "bg-slate-100 text-slate-600",
  "In Progress": "bg-blue-50 text-blue-700",
  Review: "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

export default function RecentTasks({ tasks, search }: { tasks: Task[]; search: string }) {
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const visible = tasks.filter((task) =>
    (status === "All" || task.status === status) &&
    (priority === "All" || task.priority === priority) &&
    `${task.title} ${task.assignee.name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section id="tasks" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Project Tasks</h2>
        <div className="flex gap-2">
          <label className="relative"><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-600 outline-none"><option>All</option><option>To Do</option><option>In Progress</option><option>Review</option><option>Completed</option></select><ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-400" /></label>
          <label className="relative"><select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-600 outline-none"><option>All</option><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select><ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-400" /></label>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead><tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400"><th className="px-5 py-3 font-semibold">Task</th><th className="px-4 py-3 font-semibold">Assignee</th><th className="px-4 py-3 font-semibold">Priority</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Due Date</th></tr></thead>
          <tbody>{visible.map((task) => (
            <tr key={task.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
              <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{task.title}</td>
              <td className="px-4 py-3.5"><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-semibold text-white ${task.assignee.color}`}>{task.assignee.initials}</span><span className="text-xs text-slate-600">{task.assignee.name}</span></div></td>
              <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityStyles[task.priority]}`}>{task.priority}</span></td>
              <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[task.status]}`}>{task.status}</span></td>
              <td className="px-5 py-3.5 text-xs text-slate-500">{task.dueDate}</td>
            </tr>
          ))}</tbody>
        </table>
        {visible.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No tasks match your filters.</p>}
      </div>
    </section>
  );
}
