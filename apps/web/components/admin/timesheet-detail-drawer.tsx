"use client";

import { useEffect } from "react";
import { trpc } from "@/lib/trpc/react";
import { X, Clock, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function pence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

const STATUS_COLOUR: Record<string, string> = {
  DRAFT:     "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-amber-100 text-amber-700",
  APPROVED:  "bg-emerald-100 text-emerald-700",
  DISPUTED:  "bg-red-100 text-red-700",
  LOCKED:    "bg-blue-100 text-blue-700",
};

// ─── Day Cell ─────────────────────────────────────────────────────────────────

function DayCell({
  clockIn, clockOut, actualHours, allocatedHours, bookedMins, isWorkingDay,
}: {
  clockIn: string | null;
  clockOut: string | null;
  actualHours: number;
  allocatedHours: number;
  bookedMins: number;
  isWorkingDay: boolean;
}) {
  const worked = clockIn !== null;
  const bookedHrs = Math.round((bookedMins / 60) * 10) / 10;
  const delta = actualHours - allocatedHours;
  const underAllocated = actualHours > 0 && actualHours < allocatedHours - 0.25;
  const overAllocated  = actualHours > allocatedHours + 0.25;

  if (!isWorkingDay && !worked) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-2 text-slate-300">
        <span className="text-xs">—</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col gap-1 rounded-lg px-1 py-2 text-center text-xs",
      worked
        ? overAllocated  ? "bg-amber-50 ring-1 ring-amber-200"
        : underAllocated ? "bg-red-50 ring-1 ring-red-200"
        : "bg-emerald-50 ring-1 ring-emerald-200"
        : isWorkingDay   ? "bg-slate-50 ring-1 ring-red-200"
        : "bg-slate-50",
    )}>
      {/* AM — clock in */}
      <div>
        <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">AM</span>
        <span className={cn("block font-bold tabular-nums", worked ? "text-navy" : "text-slate-300")}>
          {fmt(clockIn)}
        </span>
      </div>
      {/* PM — clock out */}
      <div>
        <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">PM</span>
        <span className={cn("block font-bold tabular-nums", clockOut ? "text-navy" : "text-slate-300")}>
          {fmt(clockOut)}
        </span>
      </div>
      {/* Hours */}
      {worked && (
        <div className="border-t border-slate-200 pt-1">
          <span className={cn(
            "block text-[10px] font-bold tabular-nums",
            overAllocated  ? "text-amber-600"
            : underAllocated ? "text-red-500"
            : "text-emerald-600",
          )}>
            {actualHours > 0 ? `${actualHours}h` : "—"}
          </span>
          {delta !== 0 && actualHours > 0 && (
            <span className={cn("block text-[9px] tabular-nums", delta > 0 ? "text-amber-500" : "text-red-400")}>
              {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}h
            </span>
          )}
          {bookedHrs > 0 && (
            <span className="block text-[9px] text-slate-400">{bookedHrs}h booked</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function TimesheetDetailDrawer({
  timesheetId,
  onClose,
}: {
  timesheetId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.valeterTimesheets.getDetail.useQuery(
    { timesheetId },
    { enabled: !!timesheetId },
  );

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-4xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {data ? `${data.valeter.firstName} ${data.valeter.lastName}` : "Timesheet"}
            </h2>
            {data && (
              <p className="text-sm text-slate-500">
                {data.siteName} · w/c {fmtDate(data.weekStarting)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold", STATUS_COLOUR[data.status] ?? "bg-slate-100 text-slate-600")}>
                {data.status}
              </span>
            )}
            <button onClick={onClose} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Clock className="mr-2 h-5 w-5 animate-pulse" /> Loading timesheet…
            </div>
          )}

          {data && (
            <>
              {/* ── Daily Grid — Mazda Swindon format ── */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Daily Attendance
                </h3>

                {/* Column headers */}
                <div className="grid grid-cols-[140px_repeat(7,1fr)] gap-1.5 text-center">
                  <div /> {/* name col spacer */}
                  {DAYS.map((d) => (
                    <div key={d} className="rounded-lg bg-navy py-1.5 text-xs font-bold text-white">
                      {d}
                    </div>
                  ))}

                  {/* Valeter row */}
                  <div className="flex items-start gap-2 pr-2 py-1">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy leading-tight">
                        {data.valeter.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{data.valeter.firstName}</p>
                    </div>
                  </div>
                  {data.days.map((day) => (
                    <DayCell
                      key={day.date}
                      clockIn={day.clockIn}
                      clockOut={day.clockOut}
                      actualHours={day.actualHours}
                      allocatedHours={day.allocatedHours}
                      bookedMins={day.bookedMins}
                      isWorkingDay={data.valeter.workingDays.includes(day.dayName.toUpperCase())}
                    />
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-emerald-100 ring-1 ring-emerald-200" /> On time</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-amber-100 ring-1 ring-amber-200" /> Over allocated</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-red-100 ring-1 ring-red-200" /> Under / absent</span>
                </div>
              </section>

              {/* ── Hours Summary ── */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Hours Summary
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-2.5 text-left">Day</th>
                        <th className="px-4 py-2.5 text-right">Allocated</th>
                        <th className="px-4 py-2.5 text-right">Clocked</th>
                        <th className="px-4 py-2.5 text-right">Booked work</th>
                        <th className="px-4 py-2.5 text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.days.map((day) => {
                        const bookedHrs = Math.round((day.bookedMins / 60) * 10) / 10;
                        const variance = day.actualHours > 0 ? day.actualHours - day.allocatedHours : null;
                        const isWorking = data.valeter.workingDays.includes(day.dayName.toUpperCase());
                        const absent = isWorking && !day.clockIn;
                        return (
                          <tr key={day.date} className={cn(
                            "border-t border-slate-50",
                            absent && "bg-red-50",
                          )}>
                            <td className="px-4 py-2.5 font-medium text-slate-700">
                              {day.dayName}
                              <span className="ml-1.5 text-xs text-slate-400">
                                {new Date(day.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </span>
                              {absent && (
                                <span className="ml-2 text-[10px] font-bold text-red-500">ABSENT</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                              {isWorking ? `${day.allocatedHours}h` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-900">
                              {day.actualHours > 0 ? `${day.actualHours}h` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                              {bookedHrs > 0 ? `${bookedHrs}h` : "—"}
                            </td>
                            <td className={cn(
                              "px-4 py-2.5 text-right tabular-nums font-semibold",
                              variance == null        ? "text-slate-300"
                              : variance > 0.25       ? "text-amber-600"
                              : variance < -0.25      ? "text-red-500"
                              : "text-emerald-600",
                            )}>
                              {variance == null ? "—"
                                : variance > 0 ? `+${variance.toFixed(1)}h`
                                : `${variance.toFixed(1)}h`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                        <td className="px-4 py-2.5">Total</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                          {(data.valeter.allocatedHoursPerDay * data.valeter.workingDays.length).toFixed(0)}h
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {data.totalRegularHours + data.totalOvertimeHours > 0
                            ? `${(data.totalRegularHours + data.totalOvertimeHours).toFixed(1)}h`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                          {(() => {
                            const total = data.days.reduce((s, d) => s + d.bookedMins, 0);
                            return total > 0 ? `${(total / 60).toFixed(1)}h` : "—";
                          })()}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              {/* ── Standing Charges / Extra Lines ── */}
              {data.extraLines.length > 0 && (
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Additional Weekly Work
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    {data.extraLines.map((el, i) => (
                      <div key={el.id} className={cn(
                        "flex items-center justify-between px-4 py-3",
                        i > 0 && "border-t border-slate-50",
                      )}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-700">{el.description}</span>
                          {el.isRecurring && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              Recurring
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-slate-900">{pence(el.ratePence)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t-2 border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-sm font-bold text-slate-700">Extras total</span>
                      <span className="font-bold text-slate-900">
                        {pence(data.extraLines.reduce((s, el) => s + el.ratePence, 0))}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* ── Pay Estimate ── */}
              {data.valeter.dailyRate > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Pay Estimate
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-600">Daily rate</span>
                      <span className="font-semibold text-slate-900">£{data.valeter.dailyRate.toFixed(2)}/day</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-50 px-4 py-3">
                      <span className="text-sm text-slate-600">Regular hours ({data.totalRegularHours.toFixed(1)}h)</span>
                      <span className="font-semibold text-slate-900">
                        £{(data.totalRegularHours * data.valeter.hourlyRate).toFixed(2)}
                      </span>
                    </div>
                    {data.totalOvertimeHours > 0 && (
                      <div className="flex items-center justify-between border-t border-slate-50 px-4 py-3">
                        <span className="text-sm text-slate-600">Overtime ({data.totalOvertimeHours.toFixed(1)}h)</span>
                        <span className="font-semibold text-amber-700">
                          £{(data.totalOvertimeHours * data.valeter.hourlyRate).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {data.extraLines.length > 0 && (
                      <div className="flex items-center justify-between border-t border-slate-50 px-4 py-3">
                        <span className="text-sm text-slate-600">Additional work</span>
                        <span className="font-semibold text-slate-900">
                          {pence(data.extraLines.reduce((s, el) => s + el.ratePence, 0))}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t-2 border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-sm font-bold text-slate-900">Estimated pay</span>
                      <span className="text-base font-bold text-navy">
                        £{(
                          (data.totalRegularHours + data.totalOvertimeHours) * data.valeter.hourlyRate
                          + data.extraLines.reduce((s, el) => s + el.ratePence, 0) / 100
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* ── Customer approval status ── */}
              {data.sentToCustomerAt && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Dealership Approval
                  </h3>
                  <div className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3",
                    data.customerAccepted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                  )}>
                    {data.customerAccepted
                      ? <CheckCircle2 className="h-5 w-5 shrink-0" />
                      : <AlertTriangle className="h-5 w-5 shrink-0" />}
                    <div>
                      <p className="text-sm font-bold">
                        {data.customerAccepted
                          ? data.autoAccepted ? "Auto-approved (4h window elapsed)" : "Approved by dealership"
                          : "Awaiting dealership approval"}
                      </p>
                      {data.customerAcceptedAt && (
                        <p className="text-xs opacity-70">{fmtDate(data.customerAcceptedAt)}</p>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
