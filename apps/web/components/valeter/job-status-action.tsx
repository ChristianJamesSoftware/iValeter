"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShieldAlert, Camera, Check } from "lucide-react";
import type { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

/** The single forward action a valeter can take from the current status. */
const NEXT_ACTION: Partial<
  Record<BookingStatus, { label: string; to: BookingStatus }>
> = {
  ASSIGNED: { label: "Start Job", to: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Submit for QC", to: "QC_CHECK" },
  QC_CHECK: { label: "Mark Complete", to: "COMPLETED" },
};

const TIER_NAMES: Record<string, string> = {
  essential: "Essential",
  standard: "Standard",
  premium: "Premium",
  ultimate: "Ultimate",
};

export interface JobActionBooking {
  id: string;
  status: BookingStatus;
  includeInspection: boolean;
  inspectionComplete: boolean;
  includeFreshScent: boolean;
  paintProtectionTier: string | null;
}

export function JobStatusAction({ booking }: { booking: JobActionBooking }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const utils = trpc.useUtils();

  const updateStatus = trpc.bookings.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.bookings.invalidate();
      router.refresh();
    },
  });
  const confirmAddOns = trpc.bookings.confirmAddOns.useMutation();

  const status = booking.status;
  const action = NEXT_ACTION[status];

  const checklistItems = buildChecklist(booking);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const allChecked = checklistItems.every((_, i) => checked[i]);

  if (status === "COMPLETED") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 p-5 text-success">
        <CheckCircle2 className="h-6 w-6" />
        <span className="font-heading text-lg font-bold">Job Complete</span>
      </div>
    );
  }

  if (status === "PENDING" || !action) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-5 text-center text-slate">
        Waiting to be assigned by your manager.
      </div>
    );
  }

  // Inspection gate — block "Start Job" until the inspection is complete.
  const inspectionRequired =
    status === "ASSIGNED" &&
    booking.includeInspection &&
    !booking.inspectionComplete;

  if (inspectionRequired) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border-2 border-warning bg-warning/10 p-4">
          <div className="flex items-center gap-2 text-warning">
            <ShieldAlert className="h-6 w-6" />
            <span className="font-heading text-lg font-bold uppercase tracking-wide">
              Vehicle Inspection Required
            </span>
          </div>
          <p className="mt-1 text-sm text-slate">
            You must complete the vehicle inspection before starting this job.
          </p>
        </div>

        <button
          disabled
          className="h-14 w-full cursor-not-allowed rounded-xl bg-line font-heading text-lg font-bold text-slate opacity-70"
        >
          Start Job
        </button>

        <Link
          href={`/valeter/jobs/${booking.id}/inspection`}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-cyan font-heading text-xl font-bold text-navy shadow-lg transition active:scale-[0.98] hover:bg-cyan-600"
        >
          <Camera className="h-6 w-6" /> Begin Vehicle Inspection
        </Link>
      </div>
    );
  }

  async function complete() {
    if (booking.includeFreshScent || booking.paintProtectionTier) {
      await confirmAddOns.mutateAsync({
        bookingId: booking.id,
        freshScentConfirmed: booking.includeFreshScent ? true : undefined,
        paintProtectionApplied: booking.paintProtectionTier ? true : undefined,
      });
    }
    updateStatus.mutate({
      bookingId: booking.id,
      toStatus: "COMPLETED",
      note: note.trim() || undefined,
    });
  }

  // Completion checklist gate at QC_CHECK.
  if (status === "QC_CHECK") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-white p-4">
          <h3 className="font-heading text-lg font-bold text-navy">
            Before you complete this job, confirm:
          </h3>
          <div className="mt-3 space-y-1">
            {checklistItems.map((label, i) => (
              <button
                key={i}
                onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                className="flex w-full items-center gap-3 py-2 text-left"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition",
                    checked[i]
                      ? "border-success bg-success text-white"
                      : "border-line bg-white",
                  )}
                >
                  {checked[i] && <Check className="h-4 w-4" />}
                </span>
                <span className="font-medium text-navy">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)…"
          rows={2}
          className="w-full rounded-xl border border-line bg-white p-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
        {(updateStatus.error || confirmAddOns.error) && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {(updateStatus.error ?? confirmAddOns.error)?.message}
          </p>
        )}
        <button
          onClick={complete}
          disabled={
            !allChecked || updateStatus.isPending || confirmAddOns.isPending
          }
          className="h-16 w-full rounded-2xl bg-cyan font-heading text-xl font-bold text-navy shadow-lg transition active:scale-[0.98] hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updateStatus.isPending ? "Updating…" : "Mark Complete"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)…"
        rows={2}
        className="w-full rounded-xl border border-line bg-white p-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
      />
      {updateStatus.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {updateStatus.error.message}
        </p>
      )}
      <button
        onClick={() =>
          updateStatus.mutate({
            bookingId: booking.id,
            toStatus: action.to,
            note: note.trim() || undefined,
          })
        }
        disabled={updateStatus.isPending}
        className="h-16 w-full rounded-2xl bg-cyan font-heading text-xl font-bold text-navy shadow-lg transition active:scale-[0.98] hover:bg-cyan-600 disabled:opacity-60"
      >
        {updateStatus.isPending ? "Updating…" : action.label}
      </button>
    </div>
  );
}

function buildChecklist(booking: JobActionBooking): string[] {
  const items = [
    "Vehicle exterior clean and shining",
    "Glass smear-free",
    "Interior clean and fresh",
  ];
  if (booking.includeFreshScent) items.push("Fresh Scent applied");
  if (booking.paintProtectionTier) {
    const name = TIER_NAMES[booking.paintProtectionTier] ?? booking.paintProtectionTier;
    items.push(`Paint Protection applied — ${name}`);
  }
  return items;
}
