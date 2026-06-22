"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { NavItem } from "./app-sidebar";
import { logoutAction } from "@/app/(auth)/login/actions";

export function MobileNav({
  items,
  user,
}: {
  items: NavItem[];
  user: { firstName: string; lastName: string; role: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="flex h-14 items-center justify-between bg-navy px-4 text-white md:hidden">
      <Link href="/">
        <BrandLogo className="text-lg" />
      </Link>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation"
        className="rounded-lg p-2 hover:bg-white/10"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-14 z-50 bg-navy p-3 shadow-lg">
          <nav className="space-y-1">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
                    active
                      ? "bg-cyan/15 text-cyan"
                      : "text-white/70 hover:bg-white/5",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/70 hover:bg-white/5"
              >
                <LogOut className="h-5 w-5" />
                Sign out ({user.firstName})
              </button>
            </form>
          </nav>
        </div>
      )}
    </header>
  );
}
