"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";
import { logoutAction } from "@/app/(auth)/login/actions";
import { NAV_ICONS, type NavIconName } from "./nav-icons";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  /** Uppercase group label rendered above the first item of a section. */
  section?: string;
  /** Highlight with the orange accent (e.g. Impersonate User). */
  accent?: boolean;
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export function AppSidebar({
  items,
  user,
}: {
  items: NavItem[];
  user: { firstName: string; lastName: string; role: string };
}) {
  const pathname = usePathname();
  let lastSection: string | undefined;

  return (
    <aside className="flex h-full w-56 flex-col border-r border-slate-100 bg-white">
      <div className="flex h-14 items-center border-b border-slate-100 px-4">
        <Link href="/">
          <BrandLogo className="text-xl" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = NAV_ICONS[item.icon];
          const showSection = item.section && item.section !== lastSection;
          lastSection = item.section ?? lastSection;
          return (
            <div key={item.href}>
              {showSection && (
                <p className="mb-1 mt-4 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                className={cn(
                  "mx-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-orange-500 font-semibold text-white"
                    : item.accent
                      ? "font-medium text-orange-600 hover:bg-orange-50"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {initials(user.firstName, user.lastName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs capitalize text-slate-500">
              {user.role.replace("_", " ")}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
