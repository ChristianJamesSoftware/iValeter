import { cn } from "@/lib/utils";
import type { BookingStatus } from "@ivaleter/db";

const STATUS_STYLES: Record<BookingStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  ASSIGNED: {
    label: "Assigned",
    className: "bg-blue-50 text-blue-600 border-blue-100",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-orange-50 text-orange-600 border-orange-100",
  },
  QC_CHECK: {
    label: "QC Check",
    className: "bg-purple-50 text-purple-600 border-purple-100",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-50 text-red-500 border-red-100",
  },
};

export function JobStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
