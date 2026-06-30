"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { CheckCircle2, Clock, ClipboardList, AlertTriangle, Send, RotateCcw } from "lucide-react";

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function minsToHrs(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function TimesheetClient() {
  const { data, isLoading } = trpc.valeterTimesheets.myCurrentWeek.useQuery();
  const submitMut = trpc.valeterTimesheets.submit.useMutation();
  const utils = trpc.useUtils();
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-white/50">Loading timesheet…</div>;
  }
  if (!data) return null;

  const { timesheet, clockEvents, completedBookings, user } = data;
  const isSubmitted = submitted || timesheet.status !== "DRAFT";

  // Build pairs: clock-in/out by day
  const clockPairs: { date: string; inTime: string | null; outTime: string | null }[] = [];
  let pendingIn: string | null = null;
  let pendingDate: string | null = null;
  for (const e of clockEvents) {
    if (e.type === "CLOCK_IN") {
      pendingIn = e.timestamp;
      pendingDate = fmtDate(e.timestamp);
    } else if (e.type === "CLOCK_OUT" && pendingIn) {
      clockPairs.push({ date: pendingDate!, inTime: pendingIn, outTime: e.timestamp });
      pendingIn = null;
      pendingDate = null;
    }
  }
  if (pendingIn) {
    clockPairs.push({ date: pendingDate!, inTime: pendingIn, outTime: null });
  }

  async function handleSubmit() {
    await submitMut.mutateAsync({ timesheetId: timesheet.id });
    setSubmitted(true);
    void utils.valeterTimesheets.myCurrentWeek.invalidate();
  }

  return (
    <div className="space-y-4 px-4 pb-6">
      {/* Header */}
      <div className="rounded-2xl bg-white/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Week</p>
        <p className="mt-0.5 text-base font-bold text-white">
          {fmtDate(new Date(timesheet.weekStarting).toISOString())} —{" "}
          {fmtDate(new Date(timesheet.weekEnding).toISOString())}
        </p>
        <div className="mt-3 flex gap-4">
          <Stat label="Regular" value={`${timesheet.totalRegularHours}h`} />
          <Stat label="Overtime" value={`${timesheet.totalOvertimeHours}h`} />
          <Stat
            label="Status"
            value={timesheet.status}
            accent={isSubmitted ? "green" : "amber"}
          />
        </div>
      </div>

      {/* Schedule */}
      {user && (user.workingDays?.length > 0 || user.contractedHours) && (
        <div className="rounded-2xl bg-white/10 px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Your Schedule
          </p>
          <div className="flex flex-wrap gap-2">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
              <span
                key={d}
                className={`rounded-lg px-3 py-1 text-xs font-bold ${
                  user.workingDays?.includes(d)
                    ? "bg-orange-500 text-white"
                    : "bg-white/10 text-white/30"
                }`}
              >
                {d}
              </span>
            ))}
          </div>
          {user.contractedHours && (
            <p className="mt-2 text-xs text-white/50">
              Contracted: {user.contractedHours}h/day
            </p>
          )}
        </div>
      )}

      {/* Clock events */}
      <Section icon={<Clock className="h-4 w-4" />} title="Clock In / Out">
        {clockPairs.length === 0 ? (
          <p className="text-xs text-white/40">No clock events this week.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {clockPairs.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-white/70">{p.date}</span>
                <span className="text-sm font-semibold text-white">
                  {p.inTime ? fmt(p.inTime) : "—"} → {p.outTime ? fmt(p.outTime) : "Still clocked in"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Valets completed */}
      <Section icon={<ClipboardList className="h-4 w-4" />} title="Valets Completed">
        {completedBookings.length === 0 ? (
          <p className="text-xs text-white/40">No completed valets this week.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {completedBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-semibold text-white">{b.vehicleReg}</p>
                  <p className="text-xs text-white/50">{b.serviceTypeName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/50">{fmtDate(b.readyByTime)}</p>
                  <p className="text-xs text-orange-400">{minsToHrs(b.durationMins)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Submit */}
      {!isSubmitted ? (
        <div className="rounded-2xl bg-white/10 px-5 py-5">
          <p className="mb-3 text-xs text-white/60">
            Review the above carefully before submitting. Once submitted, your timesheet
            goes to head office for review.
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitMut.isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {submitMut.isPending ? "Submitting…" : "Submit Timesheet"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-emerald-500/20 px-5 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <p className="text-sm font-bold text-emerald-300">Timesheet submitted</p>
          <p className="text-xs text-emerald-400/70">
            Head office will review and push to your site manager.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/10 px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-orange-400">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "amber";
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p
        className={`text-sm font-bold ${
          accent === "green" ? "text-emerald-400" : accent === "amber" ? "text-amber-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
