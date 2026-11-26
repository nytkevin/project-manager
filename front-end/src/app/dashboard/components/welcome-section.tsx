import { ArrowRight } from "lucide-react";

export default function WelcomeSection() {
  return (
    <section className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#f7f8fc] px-5 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">You have 3 tasks due this week</p>
        <p className="mt-1 text-xs text-slate-500">Review priorities and keep your projects on track.</p>
      </div>
      <button className="hidden items-center gap-1 text-sm font-semibold text-[#263875] sm:flex">
        Review tasks <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}
