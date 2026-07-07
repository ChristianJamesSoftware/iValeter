"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShieldAlert, Camera, Check, WifiOff, PlayCircle } from "lucide-react";
import type { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { enqueue } from "@/lib/offline-queue";

/** The single forward action a valeter can take from the current status. */
const NEXT_ACTION: Partial<
  Record<BookingStatus, { label: string; to: BookingStatus }>
> = {
  ASSIGNED:    { label: "Start Job",      to: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Submit for QC",  to: "QC_CHECK"    },
  QC_CHECK:    { label: "Mark Complete",  to: "COMPLETED"   },
};

const TIER_NAMES: Record<string, string> = {
  essential: "Essential",
  standard:  "Standard",
  premium:   "Premium",
  ultimate:  "Ultimate",
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
  const [note, setNote]         = useState("");
  const [queued, setQueued]     = useState(false);
  // Optimistic status — updated immediately when queued offline
  const [optimisticStatus, setOptimisticStatus] = useState<BookingStatus>(booking.status);
  const utils = trpc.useUtils();

  const updateStatus = trpc.bookings.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.bookings.invalidate();
      router.refresh();
    },
  });
  const confirmAddOns = trpc.bookings.confirmAddOns.useMutation();
  const selfAssign = trpc.bookings.valeterSelfAssign.useMutation({
    onSuccess: async () => {
      setOptimisticStatus("ASSIGNED");
      await utils.bookings.invalidate();
      router.refresh();
    },
  });

  // Listen for SW queue replay confirmation — refresh data
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "QUEUE_REPLAYED" && queued) {
        setQueued(false);
        void utils.bookings.invalidate();
        router.refresh();
      }
    }
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [queued, utils, router]);

  const status = optimisticStatus;
  const action = NEXT_ACTION[status];

  const checklistItems = buildChecklist(booking);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const allChecked = checklistItems.every((_, i) => checked[i]);

  /** Attempt mutation; if offline, queue it and update optimistic state */
  async function tryUpdate(toStatus: BookingStatus, noteText?: string) {
    // Optimistically advance status immediately so the button disappears
    setOptimisticStatus(toStatus);
    try {
      await updateStatus.mutateAsync({
        bookingId: booking.id,
        toStatus,
        note: noteText?.trim() || undefined,
      });
    } catch {
      if (!navigator.onLine) {
        await enqueue("JOB_STATUS", {
          bookingId: booking.id,
          toStatus,
          note: noteText?.trim() || undefined,
        });
        setQueued(true);
      } else {
        // Online but failed — roll back optimistic state
        setOptimisticStatus(booking.status);
      }
    }
  }

  async function complete() {
    // Optimistically advance to COMPLETED immediately
    setOptimisticStatus("COMPLETED");
    if (booking.includeFreshScent || booking.paintProtectionTier) {
      try {
        await confirmAddOns.mutateAsync({
          bookingId: booking.id,
          freshScentConfirmed:    booking.includeFreshScent       ? true : undefined,
          paintProtectionApplied: booking.paintProtectionTier     ? true : undefined,
        });
      } catch {
        if (!navigator.onLine) {
          // Queue the status change; confirmAddOns will be retried by manager
          await enqueue("JOB_STATUS", {
            bookingId: booking.id,
            toStatus:  "COMPLETED",
            note:      note.trim() || undefined,
          });
          setQueued(true);
          return;
        }
        // Online but confirmAddOns failed — roll back
        setOptimisticStatus("QC_CHECK");
        return;
      }
    }
    await tryUpdate("COMPLETED", note);
  }

  // ── Offline queued state ──────────────────────────────────────────────────

  if (queued) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-amber-700">
          <WifiOff className="h-5 w-5" />
          <span className="font-heading text-base font-bold">Saved offline</span>
        </div>
        <p className="text-sm text-amber-600">
          Your update has been saved on this device and will sync automatically once signal returns.
        </p>
        <p className="text-xs text-amber-500 font-medium uppercase tracking-wide">
          Status: {optimisticStatus.replace("_", " ")}
        </p>
      </div>
    );
  }

  // ── Completed ─────────────────────────────────────────────────────────────

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
      <div className="space-y-3">
        <div className="rounded-xl border border-dashed border-line bg-white px-4 py-3 text-center text-sm text-slate">
          Not yet assigned — you can take this job yourself.
        </div>
        <button
          onClick={() => {
            setOptimisticStatus("ASSIGNED");
            selfAssign.mutate({ id: booking.id });
          }}
          disabled={selfAssign.isPending}
          className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-cyan font-heading text-xl font-bold text-navy shadow-lg transition active:scale-[0.98] hover:bg-cyan-600 disabled:opacity-60"
        >
          <PlayCircle className="h-6 w-6" />
          {selfAssign.isPending ? "Taking job…" : "Take This Job"}
        </button>
        {selfAssign.error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {selfAssign.error.message}
          </p>
        )}
      </div>
    );
  }

  // ── Inspection gate ───────────────────────────────────────────────────────

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

  // ── QC completion checklist ───────────────────────────────────────────────

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
        {(updateStatus.error || confirmAddOns.error) && !queued && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {(updateStatus.error ?? confirmAddOns.error)?.message}
          </p>
        )}
        <button
          onClick={() => void complete()}
          disabled={!allChecked || updateStatus.isPending || confirmAddOns.isPending}
          className="h-16 w-full rounded-2xl bg-cyan font-heading text-xl font-bold text-navy shadow-lg transition active:scale-[0.98] hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updateStatus.isPending ? "Updating…" : "Mark Complete"}
        </button>
      </div>
    );
  }

  // ── Standard forward action (Start Job / Submit for QC) ──────────────────

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)…"
        rows={2}
        className="w-full rounded-xl border border-line bg-white p-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
      />
      {updateStatus.error && !queued && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {updateStatus.error.message}
        </p>
      )}
      <button
        onClick={() => void tryUpdate(action.to, note)}
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
