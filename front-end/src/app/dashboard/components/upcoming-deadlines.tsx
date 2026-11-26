import { Clock3, Flag } from "lucide-react";
import type { Deadline } from "../data/dashboard-data";

export default function UpcomingDeadlines({ deadlines }: { deadlines: Deadline[] }) {
  return (
    <section id="calendar">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">Upcoming & Overdue</h2><button className="text-xs font-semibold text-[#263875]">View Calendar</button></div>
      <div className="rounded-xl border border-slate-200 bg-white px-4">
        {deadlines.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">No upcoming deadlines for this project.</p>
        )}
        {deadlines.map((deadline) => (
          <article key={deadline.id} className="flex items-start gap-3 border-b border-slate-100 py-4 last:border-0">
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${deadline.overdue ? "bg-red-500" : "bg-amber-400"}`} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{deadline.title}</p><p className={`mt-2 flex items-center gap-1 text-xs ${deadline.overdue ? "font-semibold text-red-600" : "text-slate-500"}`}><Clock3 className="h-3.5 w-3.5" />{deadline.remaining}</p></div>
            <div className="text-right"><p className="text-xs font-medium text-slate-600">{deadline.dueDate}</p><p className="mt-2 flex justify-end items-center gap-1 text-[11px] text-slate-400"><Flag className="h-3 w-3" />{deadline.priority}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}
