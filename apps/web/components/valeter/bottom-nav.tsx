"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/valeter", label: "My Jobs", icon: ClipboardList },
  { href: "/valeter/holiday", label: "Holiday", icon: CalendarDays },
];

export function ValeterBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md border-t border-line bg-navy">
      {ITEMS.map((item) => {
        const active =
          item.href === "/valeter"
            ? pathname === "/valeter" || pathname.startsWith("/valeter/jobs")
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium",
              active ? "text-cyan" : "text-white/60",
            )}
          >
            <Icon className="h-6 w-6" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
