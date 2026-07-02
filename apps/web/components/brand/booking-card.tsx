import Link from "next/link";
import { ChevronRight, Ban } from "lucide-react";
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
  assignedTo?: { firstName: string; lastName: string } | null;
  doNotClean?: boolean;
  qualityScore?: number | null;
  variant?: "dealer" | "valeter";
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill={i <= score ? "#F59E0B" : "none"}
          stroke={i <= score ? "#F59E0B" : "#D1D5DB"}
          strokeWidth={1.5}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-amber-600">{score}/5</span>
    </div>
  );
}

export function BookingCard({
  booking,
  href,
  variant = "dealer",
}: {
  booking: BookingCardData;
  href: string;
  variant?: "dealer" | "valeter";
}) {
  const inspectionDue =
    !!booking.includeInspection && !booking.inspectionComplete;

  return (
    <Link
      href={href}
      className={cn(
        "block overflow-hidden rounded-xl border shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.99]",
        booking.doNotClean
          ? "border-red-400 bg-red-50"
          : booking.isPriority
          ? "border-l-[3px] border-l-orange-500 border-slate-100 bg-orange-50/20"
          : "border-slate-100 bg-white hover:border-slate-200",
      )}
    >
      {/* ── DO NOT CLEAN banner ── */}
      {booking.doNotClean && (
        <div className="flex items-center gap-2 bg-red-600 px-4 py-2.5">
          <Ban className="h-5 w-5 shrink-0 text-white" />
          <span className="font-heading text-sm font-bold uppercase tracking-widest text-white">
            DO NOT CLEAN THIS VEHICLE
          </span>
          <Ban className="ml-auto h-5 w-5 shrink-0 text-white" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-mono text-xl font-bold tracking-widest",
                  booking.doNotClean ? "text-red-700" : "text-slate-900",
                )}
              >
                {booking.vehicleReg}
              </span>
              {booking.isPriority && <PriorityBadge />}
              {booking.doNotClean && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                  DNC
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {booking.customerName}
            </p>
          </div>
          <ChevronRight
            className={cn(
              "mt-1 h-5 w-5 shrink-0",
              booking.doNotClean ? "text-red-300" : "text-slate-300",
            )}
          />
        </div>

        {(inspectionDue ||
          booking.includeFreshScent ||
          booking.paintProtectionTier) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {inspectionDue && (
              <span className="animate-priority-pulse inline-flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
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
        {booking.assignedTo && (
          <div className="mt-1.5 text-xs text-slate-400">
            Valeter:{" "}
            <span className="font-medium text-slate-600">
              {booking.assignedTo.firstName} {booking.assignedTo.lastName}
            </span>
          </div>
        )}

        {/* ── Rating footer — differs by variant ── */}
        {booking.status === "COMPLETED" && variant === "valeter" && booking.qualityScore != null && (
          <div className="mt-3 flex items-center gap-2 border-t border-amber-100 pt-2.5">
            <span className="text-sm">⭐</span>
            <StarRating score={booking.qualityScore} />
            <span className="ml-auto text-xs font-semibold text-amber-600">Customer rated this job</span>
          </div>
        )}
        {booking.status === "COMPLETED" && variant === "dealer" && booking.qualityScore != null && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <StarRating score={booking.qualityScore} />
          </div>
        )}
        {booking.status === "COMPLETED" && variant === "dealer" && booking.qualityScore == null && (
          <div className="mt-3 flex items-center gap-1.5 border-t border-amber-100 pt-2.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-xs font-semibold text-amber-600">
              Tap to leave a rating — we&apos;d love your feedback!
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
