import { cn } from "@/lib/utils";
import type { BookingStatus } from "@ivaleter/db";

const STATUS_STYLES: Record<BookingStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-slate/10 text-slate" },
  ASSIGNED: { label: "Assigned", className: "bg-tvblue/10 text-tvblue" },
  IN_PROGRESS: { label: "In Progress", className: "bg-warning/15 text-warning" },
  QC_CHECK: { label: "QC Check", className: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "Completed", className: "bg-success/15 text-success" },
  CANCELLED: { label: "Cancelled", className: "bg-danger/10 text-danger" },
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
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
