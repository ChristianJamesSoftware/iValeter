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
}

export function AppSidebar({
  items,
  user,
}: {
  items: NavItem[];
  user: { firstName: string; lastName: string; role: string };
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-navy text-white">
      <div className="flex h-16 items-center px-6">
        <Link href="/">
          <BrandLogo className="text-xl" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const Icon = NAV_ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-cyan/15 text-cyan"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 px-2">
          <p className="text-sm font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs capitalize text-white/50">
            {user.role.replace("_", " ")}
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
