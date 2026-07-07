"use client";

import { useState } from "react";
import { Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function OvertimeRequestsPanel() {
  const [open, setOpen] = useState(true);
  const utils = trpc.useUtils();

  const { data: requests, isLoading } = trpc.overtime.listPending.useQuery();

  const review = trpc.overtime.review.useMutation({
    onSuccess: () => void utils.overtime.listPending.invalidate(),
  });

  const pending = requests ?? [];

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <h2 className="text-base font-bold text-slate-900">Overtime Requests</h2>
          {pending.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-black text-white">
              {pending.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {isLoading ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No pending overtime requests</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Valeter</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Hours</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Reason</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Submitted</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {req.user.firstName} {req.user.lastName}
                      {req.user.site && (
                        <span className="ml-1.5 text-xs text-slate-400">{req.user.site.name}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{fmtDate(req.requestedDate)}</td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-900">{req.requestedHours}h</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 max-w-[200px]">
                      {req.overtimeReason?.label ?? req.reason ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {fmtDate(req.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => review.mutate({ id: req.id, decision: "APPROVED" })}
                          disabled={review.isPending}
                          className={cn(
                            "flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => review.mutate({ id: req.id, decision: "DECLINED" })}
                          disabled={review.isPending}
                          className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Decline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
