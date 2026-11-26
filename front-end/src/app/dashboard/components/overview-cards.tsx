import { FolderKanban, CheckSquare2, CheckCircle2, AlertCircle } from "lucide-react";
import type { Task } from "../data/dashboard-data";

export default function OverviewCards({ tasks }: { tasks: Task[] }) {
  const completed = tasks.filter((task) => task.status === "Completed").length;
  const inProgress = tasks.filter((task) => task.status === "In Progress").length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = tasks.filter(
    (task) => task.status !== "Completed" && new Date(task.dueDate).getTime() < today.getTime(),
  ).length;
  const cards = [
    { label: "Total Tasks", value: tasks.length, icon: FolderKanban, color: "bg-[#eef2ff] text-[#263875]" },
    { label: "In Progress", value: inProgress, icon: CheckSquare2, color: "bg-[#edf7f4] text-[#26766a]" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "bg-[#fff4df] text-[#a26929]" },
    { label: "Overdue", value: overdue, icon: AlertCircle, color: "bg-[#fff0f0] text-[#b84d4d]" },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.03)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-slate-900">{card.value}</p>
                <p className="mt-1.5 text-sm font-medium text-slate-600">{card.label}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                <Icon className="h-[19px] w-[19px]" />
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
