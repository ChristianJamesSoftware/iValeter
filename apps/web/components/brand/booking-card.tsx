import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BookingStatus } from "@ivaleter/db";
import { cn, formatTime } from "@/lib/utils";
import { JobStatusBadge } from "./job-status-badge";
import { PriorityBadge } from "./priority-badge";

export interface BookingCardData {
  id: string;
  vehicleReg: string;
  customerName: string;
  status: BookingStatus;
  isPriority: boolean;
  readyByTime: Date | string;
  serviceType: { name: string };
  site?: { name: string } | null;
  department?: { name: string } | null;
  includeInspection?: boolean;
  inspectionComplete?: boolean;
  includeFreshScent?: boolean;
  paintProtectionTier?: string | null;
}

export function BookingCard({
  booking,
  href,
}: {
  booking: BookingCardData;
  href: string;
}) {
  const inspectionDue =
    !!booking.includeInspection && !booking.inspectionComplete;
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.99]",
        booking.isPriority
          ? "border-l-[3px] border-l-orange-500 bg-orange-50/20"
          : "hover:border-slate-200",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold tracking-widest text-slate-900">
              {booking.vehicleReg}
            </span>
            {booking.isPriority && <PriorityBadge />}
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {booking.customerName}
          </p>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300" />
      </div>

      {(inspectionDue || booking.includeFreshScent || booking.paintProtectionTier) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {inspectionDue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white animate-priority-pulse">
              Inspection
            </span>
          )}
          {booking.includeFreshScent && (
            <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Fresh Scent
            </span>
          )}
          {booking.paintProtectionTier && (
            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Paint Protection
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0 text-sm text-slate-500">
          <span className="font-medium text-slate-700">
            {booking.serviceType.name}
          </span>
          {booking.department && (
            <span className="ml-1 text-slate-500">
              · {booking.department.name}
            </span>
          )}
        </div>
        <JobStatusBadge status={booking.status} />
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-slate-500">
          Ready by{" "}
          <span className="font-semibold text-slate-700">
            {formatTime(booking.readyByTime)}
          </span>
        </span>
        {booking.site && (
          <span className="truncate text-xs text-slate-500">
            {booking.site.name}
          </span>
        )}
      </div>
    </Link>
  );
}
