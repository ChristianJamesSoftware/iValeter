"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";

/** The single forward action a valeter can take from the current status. */
const NEXT_ACTION: Partial<
  Record<BookingStatus, { label: string; to: BookingStatus }>
> = {
  ASSIGNED: { label: "Start Job", to: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Submit for QC", to: "QC_CHECK" },
  QC_CHECK: { label: "Mark Complete", to: "COMPLETED" },
};

export function JobStatusAction({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const utils = trpc.useUtils();

  const mutation = trpc.bookings.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.bookings.invalidate();
      router.refresh();
    },
  });

  const action = NEXT_ACTION[status];

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

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)…"
        rows={2}
        className="w-full rounded-xl border border-line bg-white p-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
      />
      {mutation.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {mutation.error.message}
        </p>
      )}
      <button
        onClick={() =>
          mutation.mutate({
            bookingId,
            toStatus: action.to,
            note: note.trim() || undefined,
          })
        }
        disabled={mutation.isPending}
        className="h-16 w-full rounded-2xl bg-cyan font-heading text-xl font-bold text-navy shadow-lg transition active:scale-[0.98] hover:bg-cyan-600 disabled:opacity-60"
      >
        {mutation.isPending ? "Updating…" : action.label}
      </button>
    </div>
  );
}
