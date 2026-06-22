"use client";

import { X } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

interface ValeterOpt {
  id: string;
  firstName: string;
  lastName: string;
  jobsToday: number;
}

export function AssignModal({
  bookingId,
  valeters,
  onClose,
}: {
  bookingId: string;
  valeters: ValeterOpt[];
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const assign = trpc.bookings.assign.useMutation({
    onSuccess: async () => {
      await utils.bookings.invalidate();
      await utils.analytics.invalidate();
      onClose();
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-navy">
            Assign valeter
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-offwhite">
            <X className="h-5 w-5 text-slate" />
          </button>
        </div>

        {assign.error && (
          <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {assign.error.message}
          </p>
        )}

        <div className="space-y-2">
          {valeters.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-slate">
              No valeters available at this site.
            </p>
          ) : (
            valeters.map((v) => (
              <button
                key={v.id}
                disabled={assign.isPending}
                onClick={() => assign.mutate({ bookingId, valeterId: v.id })}
                className="flex w-full items-center justify-between rounded-lg border border-line bg-white p-3 text-left transition hover:border-cyan disabled:opacity-60"
              >
                <span className="font-medium text-navy">
                  {v.firstName} {v.lastName}
                </span>
                <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs font-bold text-navy">
                  {v.jobsToday} today
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
