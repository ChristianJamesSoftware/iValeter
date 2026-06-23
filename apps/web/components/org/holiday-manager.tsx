"use client";

import { Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn, formatDate } from "@/lib/utils";

const STATUS_STYLE = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECTED: "bg-red-50 text-red-500 border-red-100",
} as const;

export function HolidayManager() {
  const utils = trpc.useUtils();
  const requests = trpc.holiday.listRequests.useQuery();

  const approve = trpc.holiday.approve.useMutation({
    onSuccess: () => utils.holiday.listRequests.invalidate(),
  });
  const reject = trpc.holiday.reject.useMutation({
    onSuccess: () => utils.holiday.listRequests.invalidate(),
  });

  const pending = (requests.data ?? []).filter((r) => r.status === "PENDING");
  const resolved = (requests.data ?? []).filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-heading text-lg font-bold text-navy">
          Pending ({pending.length})
        </h2>
        {requests.isLoading ? (
          <p className="text-slate">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-slate">
            No pending requests.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-navy">
                    {r.user.firstName} {r.user.lastName}
                    {r.user.site && (
                      <span className="ml-2 text-sm font-normal text-slate">
                        · {r.user.site.name}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate">
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                    {r.reason && ` · ${r.reason}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={approve.isPending}
                    onClick={() => approve.mutate({ id: r.id })}
                    className="flex h-10 items-center gap-1.5 rounded-lg bg-success px-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button
                    disabled={reject.isPending}
                    onClick={() => reject.mutate({ id: r.id })}
                    className="flex h-10 items-center gap-1.5 rounded-lg bg-danger px-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-heading text-lg font-bold text-navy">History</h2>
        {resolved.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-slate">
            No resolved requests yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {resolved.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-line bg-white p-4"
              >
                <div>
                  <p className="font-semibold text-navy">
                    {r.user.firstName} {r.user.lastName}
                  </p>
                  <p className="text-sm text-slate">
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    STATUS_STYLE[r.status],
                  )}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
