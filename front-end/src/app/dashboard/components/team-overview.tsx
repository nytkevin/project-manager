import type { Task, TeamMember } from "../data/dashboard-data";

export default function TeamOverview({
  members,
  tasks,
}: {
  members: TeamMember[];
  tasks: Task[];
}) {
  return (
    <section id="team">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">Project Team</h2><button className="text-xs font-semibold text-[#263875]">Manage</button></div>
      <div className="rounded-xl border border-slate-200 bg-white px-4">
        {members.map((member) => (
          <article key={member.id} className="flex items-center gap-3 border-b border-slate-100 py-3.5 last:border-0">
            <div className="relative"><span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${member.color}`}>{member.initials}</span><span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${member.online ? "bg-emerald-500" : "bg-slate-300"}`} /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{member.name}</p><p className="mt-0.5 text-xs text-slate-400">{member.projectRole ?? member.role}</p></div>
            <p className="text-right"><span className="block text-sm font-semibold text-slate-700">{tasks.filter((task) => task.assignee.id === member.id && task.status !== "Completed").length}</span><span className="text-[10px] text-slate-400">active</span></p>
          </article>
        ))}
      </div>
    </section>
  );
}
