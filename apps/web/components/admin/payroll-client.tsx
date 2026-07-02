"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Download, Landmark } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

interface PayrollClientProps {
  initialWeekStart: string;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0] ?? isoDate;
}

function formatDateRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

const STATUS_CHIP: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  DISPUTED: "bg-red-100 text-red-700",
  LOCKED: "bg-blue-100 text-blue-700",
};

export function PayrollClient({ initialWeekStart }: PayrollClientProps) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [approveSuccess, setApproveSuccess] = useState(false);

  const { data: summary, refetch } = trpc.hq.payrollSummary.useQuery(
    { weekStart },
  );

  const approveAll = trpc.hq.payrollApproveAll.useMutation({
    onSuccess: () => {
      setApproveSuccess(true);
      void refetch();
      setTimeout(() => setApproveSuccess(false), 3000);
    },
  });

  const lines = summary?.lines ?? [];
  const hasSubmitted = lines.some((l) => l.status === "SUBMITTED");
  const allApproved = lines.length > 0 && lines.every((l) => l.status === "APPROVED" || l.status === "LOCKED");

  return (
    <div className="space-y-5">
      {/* Week picker */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[200px] text-center text-sm font-semibold text-slate-900">
          {formatDateRange(weekStart)}
        </span>
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-slate-500">Timesheets: </span>
            <span className="font-bold text-slate-900">{summary?.timesheetCount ?? 0}</span>
          </div>
          <div>
            <span className="text-slate-500">Est. total: </span>
            <span className="font-bold text-slate-900">
              £{(summary?.totalEstimate ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {approveSuccess && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-label="Approved" />
              All approved
            </span>
          )}
          <button
            type="button"
            onClick={() => approveAll.mutate({ weekStart })}
            disabled={!hasSubmitted || approveAll.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {approveAll.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-label="Approving" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-label="Approve all" />
            )}
            Approve All
          </button>
          <button
            type="button"
            disabled={!allApproved}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              // Stub — Xero PayRun export is a future phase
              alert("Xero payroll export coming soon.");
            }}
          >
            <Download className="h-4 w-4" aria-label="Export" />
            Export to Xero
          </button>
          <button
            type="button"
            disabled
            title="NatWest bank export — configure bank account in Admin Settings"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-[#01696F] px-4 py-2 text-sm font-semibold text-[#01696F] opacity-50"
          >
            <Landmark className="h-4 w-4" />
            Export to Bank
          </button>
        </div>
      </div>

      {/* Timesheets table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 text-left">Valeter</th>
              <th className="px-4 py-3 text-left">Site</th>
              <th className="px-4 py-3 text-right">Reg. hrs</th>
              <th className="px-4 py-3 text-right">OT hrs</th>
              <th className="px-4 py-3 text-right">Est. pay</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No timesheets for this week.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr
                  key={line.timesheetId}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {line.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{line.siteName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {line.regularHours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {line.overtimeHours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                    £{line.totalEstimate.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold",
                        STATUS_CHIP[line.status] ?? "bg-slate-100 text-slate-600",
                      )}
                    >
                      {line.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-100 bg-slate-50 text-xs font-bold text-slate-700">
                <td colSpan={4} className="px-4 py-3 text-right">
                  Total estimate:
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  £{(summary?.totalEstimate ?? 0).toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
