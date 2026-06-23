"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import type { NavItem } from "./app-sidebar";

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export function TopBar({
  items,
  user,
}: {
  items: NavItem[];
  user: { firstName: string; lastName: string };
}) {
  const pathname = usePathname();
  const current =
    items
      .filter(
        (i) =>
          pathname === i.href ||
          (i.href !== "/" && pathname.startsWith(`${i.href}/`)),
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "Dashboard";

  return (
    <div className="hidden h-14 items-center justify-between border-b border-slate-200 bg-white px-6 md:flex">
      <p className="text-sm font-medium text-slate-700">{current}</p>
      <div className="flex items-center gap-4">
        <button
          aria-label="Notifications"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {initials(user.firstName, user.lastName)}
        </div>
      </div>
    </div>
  );
}
