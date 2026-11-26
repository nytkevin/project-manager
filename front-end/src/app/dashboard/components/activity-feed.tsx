import { CheckSquare2, CalendarClock, FolderPlus, UserPlus, CircleDot } from "lucide-react";
import type { Activity } from "../data/dashboard-data";

const icons = { task: CheckSquare2, deadline: CalendarClock, project: FolderPlus, member: UserPlus };

export default function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">Recent Activity</h2><button className="text-xs font-semibold text-[#263875]">View All</button></div>
      <div className="rounded-xl border border-slate-200 bg-white px-4">
        {activities.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">No recent activity for this project.</p>
        )}
        {activities.map((activity) => {
          const Icon = icons[activity.type] || CircleDot;
          return (
            <article key={activity.id} className="flex gap-3 border-b border-slate-100 py-3.5 last:border-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Icon className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">{activity.user}</span> {activity.action} <span className="font-medium text-slate-700">{activity.subject}</span></p><p className="mt-0.5 text-[11px] text-slate-400">{activity.time}</p></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
