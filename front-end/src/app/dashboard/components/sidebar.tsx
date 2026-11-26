"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, CheckSquare2, Users, CalendarDays,
  LogOut, Menu, X, BriefcaseBusiness, BarChart3, Settings,
} from "lucide-react";
import { useProtectedUser } from "@/app/route/protected-route";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Projects", icon: FolderKanban, href: "/dashboard/projects" },
  { label: "My Tasks", icon: CheckSquare2, href: "/dashboard/tasks" },
  { label: "Team Members", icon: Users, href: "/dashboard/team" },
  { label: "Calendar", icon: CalendarDays, href: "/dashboard/calendar" },
  { label: "Reports & Analytics", icon: BarChart3, href: "/dashboard/reports" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const user = useProtectedUser();
  const name = user?.fullname || "Signed in user";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const content = (
    <>
      <div className="flex h-16 items-center gap-3 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#263875] text-white">
          <BriefcaseBusiness className="h-5 w-5" />
        </span>
        <span className="text-[15px] font-semibold text-slate-900">ProjectHub</span>
      </div>
      <nav className="mt-5 space-y-1 px-3">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
              (item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href))
                ? "bg-[#eef1fb] text-[#263875]"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-slate-100 p-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-slate-50">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#263875] text-xs font-semibold text-white">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-800">{name}</span>
            <span className="block truncate text-xs text-slate-400">{user?.email || "User account"}</span>
          </span>
          <LogOut className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-slate-200 bg-white lg:flex">
        {content}
      </aside>
      <button
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm lg:hidden"
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/30" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[280px] flex-col bg-white shadow-xl">
            <button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute right-3 top-4 text-slate-500">
              <X className="h-5 w-5" />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
