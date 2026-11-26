"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { listProjects } from "@/lib/api/projects";
import { getTaskAnalytics, type TaskAnalytics } from "@/lib/api/tasks";
import type { ProjectResponse } from "@/types/project";

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("project");
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectId, setProjectId] = useState("");
  const [range, setRange] = useState("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [analytics, setAnalytics] = useState<TaskAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listProjects().then((items) => {
      setProjects(items);
      setProjectId(items.find((item) => item.id === selectedId)?.id ?? items[0]?.id ?? "");
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load projects."));
  }, [selectedId]);

  const period = useMemo(() => {
    if (range === "custom" && customStart && customEnd) {
      return { start: new Date(`${customStart}T00:00:00`), end: new Date(`${customEnd}T23:59:59`) };
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (range === "7" ? 6 : range === "90" ? 89 : 29));
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [range, customStart, customEnd]);

  useEffect(() => {
    if (!projectId || (range === "custom" && (!customStart || !customEnd))) return;
    const controller = new AbortController();
    getTaskAnalytics(projectId, period.start, period.end, controller.signal)
      .then(setAnalytics)
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Could not load analytics."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId, period, range, customStart, customEnd]);

  const pipeline = useMemo(() => analytics ? Object.entries(analytics.pipeline).map(([stage, count]) => ({ stage, count })) : [], [analytics]);

  function exportCsv() {
    if (!analytics) return;
    const project = projects.find((item) => item.id === projectId);
    const rows = [
      ["Project", project?.name ?? projectId],
      ["Start date", period.start.toISOString()],
      ["End date", period.end.toISOString()],
      [],
      ["Date", "Started tasks", "Completed tasks", "Submitted for review", "Cumulative completed"],
      ...analytics.timeline.map((item) => [item.date, item.started, item.completed, item.submitted, item.cumulative_completed]),
      [],
      ["Current metric", "Value"],
      ["Currently active", analytics.currently_active],
      ["Overdue unfinished", analytics.overdue],
      ["Unfinished", analytics.unfinished],
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project?.name?.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "project"}-analytics.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-slate-400">Performance</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">Reports &amp; Analytics</h1></div><button type="button" disabled={!analytics} onClick={exportCsv} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"><Download className="h-4 w-4" />Export CSV</button></div>
      <div className="mt-5 flex flex-wrap gap-2">
        <select value={projectId} onChange={(event) => { setProjectId(event.target.value); router.replace(`/dashboard/reports?project=${encodeURIComponent(event.target.value)}`, { scroll: false }); }} className="h-10 max-w-72 rounded-lg border border-slate-200 bg-white px-3 text-sm">
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        {["7","30","90","custom"].map((value) => (
          <button key={value} type="button" onClick={() => setRange(value)} className={`h-10 rounded-lg border px-3 text-sm ${range === value ? "border-[#263875] bg-[#eef1fb] text-[#263875]" : "border-slate-200 bg-white text-slate-600"}`}>
            {value === "custom" ? "Custom" : `Last ${value} days`}
          </button>
        ))}
        {range === "custom" && (
          <>
            <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" />
            <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" />
          </>
        )}
      </div>
      {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading analytics…</p> : error ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : analytics ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
            ["Completed Tasks", analytics.completed, "Selected period"],
            ["Started Tasks", analytics.started, "Selected period"],
            ["Currently Active", analytics.currently_active, "Current snapshot"],
            ["Overdue Tasks", analytics.overdue, "Current snapshot"],
          ].map(([label, value, scope]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-400">{scope}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-sm text-slate-600">{label}</p></div>)}</div>
          <div className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
            <ChartCard title="Task activity over time" subtitle="Daily started, submitted, and completed task counts">
              <ResponsiveContainer width="100%" height={320}><LineChart data={analytics.timeline} margin={{ left: -12, right: 12 }}><CartesianGrid stroke="#eef0f4" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="completed" name="Completed tasks" stroke="#263875" strokeWidth={2} dot={{ r: 2 }} /><Line type="monotone" dataKey="started" name="Started tasks" stroke="#2f8a76" strokeWidth={2} dot={{ r: 2 }} /><Line type="monotone" dataKey="submitted" name="Submitted for review" stroke="#b7791f" strokeWidth={2} dot={{ r: 2 }} /></LineChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Current pipeline" subtitle="Current stage snapshot"><ResponsiveContainer width="100%" height={320}><BarChart data={pipeline} layout="vertical" margin={{ left: 20 }}><CartesianGrid stroke="#eef0f4" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="stage" width={72} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" name="Tasks" fill="#263875" radius={[0,4,4,0]} /></BarChart></ResponsiveContainer></ChartCard>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartCard title="Completed tasks by day" subtitle="Actual completion timestamps"><ResponsiveContainer width="100%" height={260}><BarChart data={analytics.timeline}><CartesianGrid stroke="#eef0f4" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="completed" name="Completed" fill="#263875" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></ChartCard>
            <ChartCard title="Cumulative project progress" subtitle={analytics.cumulative_completed_before_period ? `Includes ${analytics.cumulative_completed_before_period} completions before the selected period` : "Begins with zero completions before the selected period"}><ResponsiveContainer width="100%" height={260}><AreaChart data={analytics.timeline}><defs><linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#263875" stopOpacity={0.22}/><stop offset="95%" stopColor="#263875" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#eef0f4" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Area type="monotone" dataKey="cumulative_completed" name="Cumulative completions" stroke="#263875" fill="url(#completedFill)" /></AreaChart></ResponsiveContainer></ChartCard>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Task activity timeline</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Started</th><th className="px-5 py-3">Completed</th><th className="px-5 py-3">Submitted</th></tr></thead><tbody>{analytics.timeline.map((item) => <tr key={item.date} className="border-t border-slate-100"><td className="px-5 py-3">{item.date}</td><td className="px-5 py-3">{item.started}</td><td className="px-5 py-3">{item.completed}</td><td className="px-5 py-3">{item.submitted}</td></tr>)}</tbody></table></div></div>
        </>
      ) : <p className="py-16 text-center text-sm text-slate-500">Select a project and date range to view analytics.</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p><div className="mt-4">{children}</div></section>;
}
