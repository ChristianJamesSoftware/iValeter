"use client";

import { trpc } from "@/lib/trpc/react";
import { Download, CheckCircle2, Clock, AlertTriangle, HelpCircle } from "lucide-react";

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_DISPLAY: Record<
  string,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  DRAFT: {
    label: "Draft",
    icon: <Clock className="h-3.5 w-3.5" />,
    cls: "text-white/40",
  },
  SUBMITTED: {
    label: "Pending Review",
    icon: <Clock className="h-3.5 w-3.5 text-amber-400" />,
    cls: "text-amber-400",
  },
  APPROVED: {
    label: "Approved",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    cls: "text-emerald-400",
  },
  DISPUTED: {
    label: "Queried",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-red-400" />,
    cls: "text-red-400",
  },
  LOCKED: {
    label: "Locked",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    cls: "text-emerald-400",
  },
};

function downloadTimesheetCsv(ts: {
  id: string;
  weekStarting: Date | string;
  weekEnding: Date | string;
  status: string;
  totalRegularHours: number;
  totalOvertimeHours: number;
}) {
  const lines = [
    "Week Starting,Week Ending,Regular Hours,Overtime Hours,Status",
    [
      fmtDate(ts.weekStarting),
      fmtDate(ts.weekEnding),
      ts.totalRegularHours,
      ts.totalOvertimeHours,
      ts.status,
    ].join(","),
  ].join("\n");
  const blob = new Blob([lines], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `timesheet-${fmtDate(ts.weekStarting).replace(/ /g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PayHistoryClient() {
  const { data, isLoading } = trpc.valeterTimesheets.myHistory.useQuery({});

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-white/50">Loading pay history…</div>;
  }

  const sheets = data ?? [];

  if (sheets.length === 0) {
    return (
      <div className="mx-4 rounded-2xl bg-white/10 px-5 py-10 text-center">
        <HelpCircle className="mx-auto mb-2 h-8 w-8 text-white/30" />
        <p className="text-sm font-semibold text-white/60">No timesheets yet.</p>
        <p className="mt-1 text-xs text-white/30">
          Your submitted timesheets will appear here.
        </p>
      </div>
    );
  }

  const totalApprovedHours = sheets
    .filter((s) => s.status === "APPROVED" || s.status === "LOCKED")
    .reduce((sum, s) => sum + s.totalRegularHours + s.totalOvertimeHours, 0);

  return (
    <div className="space-y-4 px-4 pb-6">
      {/* Summary */}
      <div className="rounded-2xl bg-white/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Total Approved Hours
        </p>
        <p className="mt-1 text-3xl font-black text-white">{totalApprovedHours.toFixed(1)}h</p>
        <p className="mt-0.5 text-xs text-white/40">{sheets.length} timesheet{sheets.length !== 1 ? "s" : ""} submitted</p>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl bg-white/10">
        <div className="divide-y divide-white/10">
          {sheets.map((ts) => {
            const s = STATUS_DISPLAY[ts.status] ?? { label: "Draft", icon: <Clock className="h-3.5 w-3.5" />, cls: "text-white/40" };
            const total = ts.totalRegularHours + ts.totalOvertimeHours;
            return (
              <div key={ts.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">
                    {fmtDate(ts.weekStarting)} – {fmtDate(ts.weekEnding)}
                  </p>
                  <p className="mt-0.5 text-xs text-white/50">
                    {ts.totalRegularHours}h regular
                    {ts.totalOvertimeHours > 0 && ` + ${ts.totalOvertimeHours}h OT`}
                    {" "}= {total.toFixed(1)}h total
                  </p>
                  <div className={`mt-1 flex items-center gap-1 text-xs font-semibold ${s.cls}`}>
                    {s.icon}
                    {s.label}
                    {ts.autoAccepted && (
                      <span className="ml-1 text-[10px] text-white/30">(auto-approved)</span>
                    )}
                  </div>
                </div>
                {(ts.status === "APPROVED" || ts.status === "LOCKED") && (
                  <button
                    onClick={() => downloadTimesheetCsv(ts)}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
