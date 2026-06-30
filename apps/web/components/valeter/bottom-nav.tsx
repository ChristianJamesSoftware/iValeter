"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, CalendarDays, FileText, MessageCircle, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/react";

const ITEMS = [
  { href: "/valeter", label: "My Jobs", icon: ClipboardList, exact: true },
  { href: "/valeter/timesheet", label: "Timesheet", icon: FileText },
  { href: "/valeter/pay-history", label: "Pay", icon: Banknote },
  { href: "/valeter/messages", label: "Messages", icon: MessageCircle },
  { href: "/valeter/holiday", label: "Holiday", icon: CalendarDays },
];

export function ValeterBottomNav() {
  const pathname = usePathname();
  const { data: unread } = trpc.messages.unreadCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md border-t border-line bg-navy">
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href || pathname.startsWith("/valeter/jobs")
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        const badge = item.href === "/valeter/messages" && (unread ?? 0) > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium",
              active ? "text-cyan" : "text-white/60",
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {badge && (
                <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[8px] font-black text-white">
                  {unread! > 9 ? "9+" : unread}
                </span>
              )}
            </div>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
