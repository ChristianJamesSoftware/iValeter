"use client";

import { useState } from "react";
import {
  X, User, Calendar, Banknote, Building2, Shield,
  Eye, EyeOff, CheckCircle2, AlertCircle, Check, Edit2, Power, AlertTriangle, Plus,
  Scissors, CreditCard, Landmark,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type Tab = "overview" | "schedule" | "pay" | "bank" | "access" | "accidents" | "deductions" | "bankchanges";

const DAY_LABELS: Record<string, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed",
  THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun",
};
const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const INPUT = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400";

export function ValeterCardModal({ valeterUid, onClose }: { valeterUid: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // password tab state
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwStatus, setPwStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pwError, setPwError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: valeter, isLoading } = trpc.users.getValeterById.useQuery({ id: valeterUid });

  const update = trpc.users.superAdminUpdate.useMutation({
    onSuccess: () => {
      utils.users.getValeterById.invalidate({ id: valeterUid });
      utils.users.listAllValeters.invalidate();
    },
  });

  const setPasswordMut = trpc.users.setValeterPassword.useMutation({
    onSuccess: () => { setPwStatus("saved"); setPassword(""); setTimeout(() => setPwStatus("idle"), 3000); },
    onError: (err) => { setPwStatus("error"); setPwError(err.message); },
  });

  const tabs = [
    { id: "overview"  as Tab, label: "Overview",     icon: <User className="h-3.5 w-3.5" /> },
    { id: "schedule"  as Tab, label: "Schedule",     icon: <Calendar className="h-3.5 w-3.5" /> },
    { id: "pay"       as Tab, label: "Pay",          icon: <Banknote className="h-3.5 w-3.5" /> },
    { id: "bank"      as Tab, label: "Bank Details", icon: <Building2 className="h-3.5 w-3.5" /> },
    { id: "access"    as Tab, label: "Login Access", icon: <Shield className="h-3.5 w-3.5" /> },
    { id: "accidents"   as Tab, label: "Accidents",    icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    { id: "deductions"  as Tab, label: "Deductions",   icon: <Scissors className="h-3.5 w-3.5" /> },
    { id: "bankchanges" as Tab, label: "Bank Changes", icon: <CreditCard className="h-3.5 w-3.5" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex h-[90vh] max-h-[700px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          {isLoading || !valeter ? (
            <div>
              <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
              <div className="mt-1 h-3.5 w-24 animate-pulse rounded bg-slate-50" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                {valeter.firstName[0]}{valeter.lastName[0]}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{valeter.firstName} {valeter.lastName}</h2>
                <p className="text-sm text-slate-500">
                  {valeter.organisation.name}{valeter.site ? ` · ${valeter.site.name}` : ""}
                </p>
              </div>
              {/* Suspend toggle */}
              <button
                onClick={() => update.mutate({ id: valeterUid, isActive: !valeter.isActive })}
                disabled={update.isPending}
                title={valeter.isActive ? "Suspend access" : "Re-enable access"}
                className={cn(
                  "ml-2 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                  valeter.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    : "border-slate-200 bg-slate-100 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
                )}
              >
                <Power className="h-3 w-3" />
                {valeter.isActive ? "Active" : "Suspended"}
              </button>
            </div>
          )}
          <button onClick={onClose} className="ml-4 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 border-b border-slate-100 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-semibold transition",
                activeTab === tab.id
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600",
              )}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !valeter ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-50" />)}
            </div>
          ) : (
            <>
              {/* ── Overview ── */}
              {activeTab === "overview" && (
                <OverviewTab valeter={valeter} update={(data) => update.mutate({ id: valeterUid, ...data })} saving={update.isPending} />
              )}

              {/* ── Schedule ── */}
              {activeTab === "schedule" && (
                <ScheduleTab valeter={valeter} update={(data) => update.mutate({ id: valeterUid, ...data })} saving={update.isPending} />
              )}

              {/* ── Pay ── */}
              {activeTab === "pay" && (
                <PayTab valeter={valeter} update={(data) => update.mutate({ id: valeterUid, ...data })} saving={update.isPending} />
              )}

              {/* ── Bank ── */}
              {activeTab === "bank" && (
                <BankTab valeter={valeter} update={(data) => update.mutate({ id: valeterUid, ...data })} saving={update.isPending} />
              )}

              {/* ── Accidents ── */}
              {activeTab === "accidents" && (
                <AccidentsTab valeterId={valeterUid} />
              )}

              {/* ── Deductions ── */}
              {activeTab === "deductions" && (
                <DeductionsTab valeterId={valeterUid} />
              )}

              {/* ── Bank Changes ── */}
              {activeTab === "bankchanges" && (
                <BankChangesTab valeterId={valeterUid} />
              )}

              {/* ── Login Access ── */}
              {activeTab === "access" && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Login credentials</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Valeters can sign in using their <strong>email address</strong> or their{" "}
                      <strong>pay reference</strong> ({valeter.payId ?? "not set"}) with the password set below.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className={LABEL}>Set / change password</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPw ? "text" : "password"}
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setPwStatus("idle"); setPwError(null); }}
                          placeholder="Min. 6 characters"
                          className={`${INPUT} pr-10`}
                        />
                        <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          if (password.length < 6) { setPwStatus("error"); setPwError("Min. 6 characters"); return; }
                          setPwStatus("saving"); setPwError(null);
                          setPasswordMut.mutate({ id: valeterUid, password });
                        }}
                        disabled={pwStatus === "saving" || !password}
                        className="rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                      >
                        {pwStatus === "saving" ? "Saving…" : "Save"}
                      </button>
                    </div>
                    {pwStatus === "saved" && <p className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Password updated</p>}
                    {pwStatus === "error" && pwError && <p className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle className="h-3.5 w-3.5" />{pwError}</p>}
                  </div>
                  <div className="rounded-xl border border-blue-50 bg-blue-50/60 p-4">
                    <p className="text-xs font-semibold text-blue-700">How valeters log in</p>
                    <ul className="mt-2 space-y-1 text-xs text-blue-600">
                      <li>1. Go to <strong>ivaleter.co.uk/login</strong></li>
                      <li>2. Enter <strong>email</strong> ({valeter.email}) or <strong>pay reference</strong> ({valeter.payId ?? "not set"})</li>
                      <li>3. Enter the password set above</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────

import type { RouterOutputs } from "@/lib/trpc/react";
type ValeterData = NonNullable<RouterOutputs["users"]["getValeterById"]>;

function OverviewTab({ valeter, update, saving }: { valeter: ValeterData; update: (d: Record<string, unknown>) => void; saving: boolean }) {
  const [editing, setEditing] = useState(false);
  const { data: sites } = trpc.sites.list.useQuery();
  const [form, setForm] = useState({
    firstName: valeter.firstName,
    lastName:  valeter.lastName,
    mobile:    valeter.mobile ?? "",
    payId:     valeter.payId ?? "",
    jobTitle:  valeter.jobTitle ?? "",
    startDate: valeter.startDate ? new Date(valeter.startDate).toISOString().slice(0, 10) : "",
    contractComplete: valeter.contractComplete,
    siteId:    valeter.site?.id ?? "",
  });

  function save() {
    update({
      firstName: form.firstName || undefined,
      lastName:  form.lastName  || undefined,
      mobile:    form.mobile    || null,
      payId:     form.payId     || null,
      jobTitle:  form.jobTitle  || null,
      startDate: form.startDate || null,
      contractComplete: form.contractComplete,
      siteId:    form.siteId   || null,
    });
    setEditing(false);
  }

  const field = (k: keyof typeof form, label: string, type = "text") => (
    <div key={k}>
      <label className={LABEL}>{label}</label>
      {type === "checkbox" ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form[k] as boolean} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
          Yes
        </label>
      ) : (
        <input type={type} value={form[k] as string} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} className={INPUT} />
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => editing ? save() : setEditing(true)}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {editing ? <><Check className="h-3.5 w-3.5" />Save</> : <><Edit2 className="h-3.5 w-3.5" />Edit</>}
        </button>
      </div>

      {editing ? (
        <div className="grid grid-cols-2 gap-4">
          {field("firstName",        "First name")}
          {field("lastName",         "Last name")}
          {field("mobile",           "Mobile")}
          {field("payId",            "Pay reference")}
          {field("jobTitle",         "Job title")}
          {field("startDate",        "Start date", "date")}
          {field("contractComplete", "Contract complete", "checkbox")}
          <div>
            <label className={LABEL}>Site</label>
            <select
              value={form.siteId}
              onChange={(e) => setForm((p) => ({ ...p, siteId: e.target.value }))}
              className={INPUT}
            >
              <option value="">— No site —</option>
              {(sites ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Row label="Full name"         value={`${valeter.firstName} ${valeter.lastName}`} />
          <Row label="Email"             value={valeter.email} />
          <Row label="Mobile"            value={valeter.mobile} />
          <Row label="Pay reference"     value={valeter.payId} mono />
          <Row label="Job title"         value={valeter.jobTitle} />
          <Row label="Site"              value={valeter.site?.name} />
          <Row label="Organisation"      value={valeter.organisation.name} />
          <Row label="Start date"        value={fmtDate(valeter.startDate)} />
          <Row label="Contract complete" value={valeter.contractComplete ? "Yes" : "No"} />
          {valeter.skills.length > 0 && (
            <div className="flex items-start gap-4">
              <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {(valeter.skills as string[]).map((s: string) => <span key={s} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{s}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Schedule tab ─────────────────────────────────────────────────────────────

const DEFAULT_HOURS = 8;
const SAT_HALF_HOURS = 4;

function getInitialDayHours(valeter: ValeterData): Record<string, string> {
  const stored = (valeter as Record<string, unknown>).dayHours as Record<string, number> | null | undefined;
  const days = valeter.workingDays ?? [];
  const fallback = valeter.contractedHours ?? DEFAULT_HOURS;
  const result: Record<string, string> = {};
  for (const d of days) {
    if (stored && stored[d] != null) {
      result[d] = String(stored[d]);
    } else if (d === "SAT" && valeter.saturdayHalfDay) {
      result[d] = String(SAT_HALF_HOURS);
    } else {
      result[d] = String(fallback);
    }
  }
  return result;
}

function ScheduleTab({ valeter, update, saving }: { valeter: ValeterData; update: (d: Record<string, unknown>) => void; saving: boolean }) {
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState<string[]>(valeter.workingDays ?? []);
  // dayHours: map of day key → hours string for the input
  const [dayHours, setDayHours] = useState<Record<string, string>>(() => getInitialDayHours(valeter));
  const [shiftStartTime, setShiftStartTime] = useState((valeter as Record<string, unknown>).shiftStartTime as string ?? "08:00");
  const [shiftEndTime, setShiftEndTime]   = useState((valeter as Record<string, unknown>).shiftEndTime   as string ?? "17:00");

  function toggleDay(d: string) {
    setDays((prev) => {
      const next = prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d];
      // When adding a day, initialise its hours
      if (!prev.includes(d)) {
        setDayHours((h) => ({
          ...h,
          [d]: d === "SAT" ? String(SAT_HALF_HOURS) : String(valeter.contractedHours ?? DEFAULT_HOURS),
        }));
      }
      return next;
    });
  }

  function setHour(d: string, val: string) {
    setDayHours((prev) => ({ ...prev, [d]: val }));
  }

  function applyHalfDay(d: string, half: boolean) {
    setDayHours((prev) => ({ ...prev, [d]: half ? String(SAT_HALF_HOURS) : String(DEFAULT_HOURS) }));
  }

  function save() {
    // Build clean dayHours record (only active days, parse floats)
    const hoursRecord: Record<string, number> = {};
    for (const d of days) {
      const v = parseFloat(dayHours[d] ?? "0");
      hoursRecord[d] = isNaN(v) ? DEFAULT_HOURS : v;
    }
    const weeklyTotal = Object.values(hoursRecord).reduce((a, b) => a + b, 0);
    // Derive saturdayHalfDay and contractedHours from the new data for backwards compat
    const satHrs = hoursRecord["SAT"];
    const saturdayHalfDay = days.includes("SAT") && satHrs != null && satHrs <= 5;
    // contractedHours = average of weekdays (non-SAT) or overall avg
    const weekdayDays = days.filter((d) => d !== "SAT");
    const contractedHours = weekdayDays.length > 0
      ? weekdayDays.reduce((a, d) => a + (hoursRecord[d] ?? DEFAULT_HOURS), 0) / weekdayDays.length
      : weeklyTotal / (days.length || 1);

    update({
      workingDays: days,
      dayHours: hoursRecord,
      contractedHours: Math.round(contractedHours * 10) / 10,
      saturdayHalfDay,
      shiftStartTime: shiftStartTime || null,
      shiftEndTime:   shiftEndTime   || null,
    });
    setEditing(false);
  }

  const activeDays = editing ? days : (valeter.workingDays ?? []);
  const displayHours = editing ? dayHours : getInitialDayHours(valeter);

  // Weekly total for display
  const weeklyTotal = activeDays.reduce((sum, d) => {
    const v = parseFloat(displayHours[d] ?? "0");
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Weekly contracted: <span className="font-bold text-slate-800">{weeklyTotal}h</span>
        </div>
        <button
          onClick={() => editing ? save() : setEditing(true)}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {editing ? <><Check className="h-3.5 w-3.5" />Save</> : <><Edit2 className="h-3.5 w-3.5" />Edit</>}
        </button>
      </div>

      {/* Shift times */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Shift start</label>
          {editing ? (
            <input
              type="time"
              value={shiftStartTime}
              onChange={(e) => setShiftStartTime(e.target.value)}
              className={INPUT}
            />
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {((valeter as Record<string, unknown>).shiftStartTime as string | null) ?? "08:00"}
            </p>
          )}
        </div>
        <div>
          <label className={LABEL}>Shift end <span className="text-[10px] font-normal normal-case text-slate-400">(used for auto clock-out)</span></label>
          {editing ? (
            <input
              type="time"
              value={shiftEndTime}
              onChange={(e) => setShiftEndTime(e.target.value)}
              className={INPUT}
            />
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {((valeter as Record<string, unknown>).shiftEndTime as string | null) ?? "17:00"}
            </p>
          )}
        </div>
      </div>

      {/* Day selector row */}
      <div className="mb-4 flex gap-1.5">
        {ALL_DAYS.map((d) => {
          const active = activeDays.includes(d);
          return (
            <button
              key={d}
              onClick={() => editing && toggleDay(d)}
              disabled={!editing}
              className={cn(
                "flex h-9 w-10 items-center justify-center rounded-lg text-xs font-semibold transition",
                active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400",
                editing && "cursor-pointer hover:opacity-80",
                !editing && "cursor-default",
              )}
            >
              {DAY_LABELS[d]}
            </button>
          );
        })}
      </div>

      {/* Per-day hours */}
      {activeDays.length === 0 ? (
        <p className="text-sm text-slate-400">No working days selected.</p>
      ) : (
        <div className="space-y-2">
          {ALL_DAYS.filter((d) => activeDays.includes(d)).map((d) => {
            const isSat = d === "SAT";
            const hrs = displayHours[d] ?? "";
            const isHalf = isSat && parseFloat(hrs) <= 5;
            return (
              <div key={d} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                <span className="w-8 text-xs font-bold uppercase tracking-wider text-slate-500">{DAY_LABELS[d]}</span>
                <div className="flex flex-1 items-center gap-2">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.5"
                        max="16"
                        step="0.5"
                        value={hrs}
                        onChange={(e) => setHour(d, e.target.value)}
                        className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                      />
                      <span className="text-xs text-slate-400">hours</span>
                      {isSat && (
                        <button
                          type="button"
                          onClick={() => applyHalfDay(d, !isHalf)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition",
                            isHalf
                              ? "border-amber-300 bg-amber-100 text-amber-700"
                              : "border-slate-200 bg-white text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600",
                          )}
                        >
                          ½ day (4h)
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{hrs ? `${hrs}h` : "—"}</span>
                      {isSat && isHalf && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Half day</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <Row label="Last login" value={fmtDate(valeter.lastLoginAt)} />
      </div>
    </div>
  );
}

// ── Pay tab ──────────────────────────────────────────────────────────────────

function PayTab({ valeter, update, saving }: { valeter: ValeterData; update: (d: Record<string, unknown>) => void; saving: boolean }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    payId:          valeter.payId ?? "",
    dailyRate:      valeter.dailyRate?.toString() ?? "",
    dailyDeductions: valeter.dailyDeductions?.toString() ?? "",
  });

  function save() {
    update({
      payId:          form.payId          || null,
      dailyRate:      form.dailyRate      ? parseFloat(form.dailyRate)      : null,
      dailyDeductions: form.dailyDeductions ? parseFloat(form.dailyDeductions) : null,
    });
    setEditing(false);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => editing ? save() : setEditing(true)} disabled={saving}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
          {editing ? <><Check className="h-3.5 w-3.5" />Save</> : <><Edit2 className="h-3.5 w-3.5" />Edit</>}
        </button>
      </div>
      {editing ? (
        <div className="grid grid-cols-2 gap-4">
          {(["payId", "dailyRate", "dailyDeductions"] as const).map((k) => (
            <div key={k}>
              <label className={LABEL}>{k === "payId" ? "Pay reference" : k === "dailyRate" ? "Daily rate (£)" : "Daily deductions (£)"}</label>
              <input value={form[k]} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} type={k === "payId" ? "text" : "number"} step="0.01" className={INPUT} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <Row label="Pay reference"     value={valeter.payId} mono />
          <Row label="Daily rate"        value={valeter.dailyRate != null ? `£${valeter.dailyRate.toFixed(2)}` : null} />
          <Row label="Daily deductions"  value={valeter.dailyDeductions != null ? `£${valeter.dailyDeductions.toFixed(2)}` : null} />
        </div>
      )}
    </div>
  );
}

// ── Bank tab ─────────────────────────────────────────────────────────────────

function BankTab({ valeter, update, saving }: { valeter: ValeterData; update: (d: Record<string, unknown>) => void; saving: boolean }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    bankSortCode:      valeter.bankSortCode      ?? "",
    bankAccountNumber: valeter.bankAccountNumber ?? "",
    bankAccountName:   valeter.bankAccountName   ?? "",
    bankReference:     valeter.bankReference     ?? "",
  });

  const utils = trpc.useUtils();
  const { data: pendingRequests } = trpc.bankChanges.listForValeter.useQuery({ valeterId: valeter.id });

  const managerApprove = trpc.bankChanges.managerApprove.useMutation({
    onSuccess: () => {
      void utils.bankChanges.listForValeter.invalidate({ valeterId: valeter.id });
    },
  });
  const rejectReq = trpc.bankChanges.reject.useMutation({
    onSuccess: () => {
      void utils.bankChanges.listForValeter.invalidate({ valeterId: valeter.id });
    },
  });

  function save() {
    update({
      bankSortCode:      form.bankSortCode      || null,
      bankAccountNumber: form.bankAccountNumber || null,
      bankAccountName:   form.bankAccountName   || null,
      bankReference:     form.bankReference     || null,
    });
    setEditing(false);
  }

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "bankSortCode",      label: "Sort code" },
    { key: "bankAccountNumber", label: "Account number" },
    { key: "bankAccountName",   label: "Account name" },
    { key: "bankReference",     label: "Bank reference" },
  ];

  const STATUS_LABELS: Record<string, string> = {
    VALETER_REQUESTED: "Valeter requested — awaiting manager review",
    PENDING:           "Manager approved — awaiting ops to apply",
    APPROVED:          "Approved & applied",
    REJECTED:          "Rejected",
  };
  const STATUS_COLOURS: Record<string, string> = {
    VALETER_REQUESTED: "bg-amber-100 text-amber-700",
    PENDING:           "bg-blue-100 text-blue-700",
    APPROVED:          "bg-emerald-100 text-emerald-700",
    REJECTED:          "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-5">
      {/* £25 admin charge notice */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="text-xs font-bold text-amber-800">£25 admin charge applies to every bank details change</p>
          <p className="mt-0.5 text-xs text-amber-700">
            The fee is deducted from the valeter's pay in the week the change is processed.
            Changes submitted by the valeter via the app must be reviewed by account manager before ops apply them.
          </p>
        </div>
      </div>

      {/* Pending change requests from valeter */}
      {pendingRequests && pendingRequests.filter((r) => r.status === "VALETER_REQUESTED" || r.status === "PENDING").map((req) => (
        <div key={req.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <span className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              STATUS_COLOURS[req.status] ?? "bg-slate-100 text-slate-600",
            )}>
              {STATUS_LABELS[req.status] ?? req.status}
            </span>
            {req.feeDeducted ? (
              <span className="text-[10px] text-emerald-600 font-semibold">£25 deducted</span>
            ) : (
              <span className="text-[10px] text-amber-600 font-semibold">£25 pending deduction</span>
            )}
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Account name</p><p className="font-semibold text-slate-800">{req.newAccountName}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Sort code</p><p className="font-mono font-semibold text-slate-800">{req.newSortCode}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Account number</p><p className="font-mono font-semibold text-slate-800">{req.newAccountNumber}</p></div>
              {req.evidenceUrl && (
                <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Evidence</p><a href={req.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View photo</a></div>
              )}
            </div>
            {req.status === "VALETER_REQUESTED" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => managerApprove.mutate({ id: req.id, notes: "Approved by account manager" })}
                  disabled={managerApprove.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" /> Approve — send to ops
                </button>
                <button
                  onClick={() => rejectReq.mutate({ id: req.id, notes: "Rejected by account manager" })}
                  disabled={rejectReq.isPending}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Current bank details */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className={LABEL}>Current bank details</p>
          <button onClick={() => editing ? save() : setEditing(true)} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            {editing ? <><Check className="h-3.5 w-3.5" />Save</> : <><Edit2 className="h-3.5 w-3.5" />Edit</>}
          </button>
        </div>
        {editing ? (
          <div className="grid grid-cols-2 gap-4">
            {fields.map(({ key, label }) => (
              <div key={key}>
                <label className={LABEL}>{label}</label>
                <input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className={`${INPUT} font-mono`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map(({ key, label }) => <Row key={key} label={label} value={(valeter as Record<string, unknown>)[key] as string | null} mono />)}
          </div>
        )}
      </div>
    </div>
  );
}


// ── Accidents tab ────────────────────────────────────────────────────────────

function AccidentsTab({ valeterId }: { valeterId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    incidentDate: new Date().toISOString().slice(0, 10),
    vehicleReg: "",
    description: "",
    excessAmount: 1000,
    weeklyDeduction: "",
  });

  const utils = trpc.useUtils();
  const { data: accidents, isLoading } = trpc.users.listAccidents.useQuery({ valeterId });

  const addAccident = trpc.users.addAccident.useMutation({
    onSuccess: () => {
      utils.users.listAccidents.invalidate({ valeterId });
      setShowForm(false);
      setForm({ incidentDate: new Date().toISOString().slice(0, 10), vehicleReg: "", description: "", excessAmount: 1000, weeklyDeduction: "" });
    },
  });

  const updateDeduction = trpc.users.updateAccidentDeduction.useMutation({
    onSuccess: () => utils.users.listAccidents.invalidate({ valeterId }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Accident &amp; Damage Records</h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          <Plus className="h-3.5 w-3.5" /> Add Incident
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">New Incident</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Incident date</label>
              <input type="date" value={form.incidentDate} onChange={(e) => setForm((p) => ({ ...p, incidentDate: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Vehicle reg</label>
              <input type="text" value={form.vehicleReg} onChange={(e) => setForm((p) => ({ ...p, vehicleReg: e.target.value.toUpperCase() }))} placeholder="AB12 CDE" className={INPUT} />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe the damage..." className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className={LABEL}>Excess amount (£)</label>
              <input type="number" value={form.excessAmount} onChange={(e) => setForm((p) => ({ ...p, excessAmount: parseFloat(e.target.value) || 1000 }))} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Weekly deduction (£)</label>
              <input type="number" value={form.weeklyDeduction} onChange={(e) => setForm((p) => ({ ...p, weeklyDeduction: e.target.value }))} placeholder="Optional" className={INPUT} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => addAccident.mutate({
                valeterId,
                incidentDate: form.incidentDate,
                vehicleReg: form.vehicleReg,
                description: form.description,
                excessAmount: form.excessAmount,
                weeklyDeduction: form.weeklyDeduction ? parseFloat(form.weeklyDeduction) : null,
              })}
              disabled={addAccident.isPending || !form.vehicleReg || !form.description}
              className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
            >
              {addAccident.isPending ? "Saving…" : "Save Incident"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
          {addAccident.error && <p className="text-xs text-red-500">{addAccident.error.message}</p>}
        </div>
      )}

      {isLoading && <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-50" />)}</div>}

      {!isLoading && (!accidents || accidents.length === 0) && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 py-10 text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">No accidents recorded</p>
        </div>
      )}

      {accidents && accidents.length > 0 && (
        <div className="space-y-3">
          {accidents.map((acc) => (
            <div key={acc.id} className="rounded-xl border border-slate-100 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white">{acc.vehicleReg}</span>
                  <span className="text-sm font-semibold text-slate-700">{new Date(acc.incidentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
                <span className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                  acc.settled ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                )}>
                  {acc.settled ? "Settled" : "Outstanding"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{acc.description}</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-400">Excess</p>
                  <p className="mt-0.5 font-semibold text-slate-700">£{acc.excessAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-400">Weekly ded.</p>
                  <p className="mt-0.5 font-semibold text-slate-700">{acc.weeklyDeduction != null ? `£${acc.weeklyDeduction.toFixed(2)}` : "—"}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-400">Deducted</p>
                  <p className="mt-0.5 font-semibold text-slate-700">£{acc.totalDeducted.toFixed(2)}</p>
                </div>
              </div>
              {!acc.settled && (
                <button
                  onClick={() => updateDeduction.mutate({ id: acc.id, settled: true })}
                  className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  Mark Settled
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Row helper ────────────────────────────────────────────────────────────────

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-40 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={cn("text-sm text-slate-700", mono && "font-mono text-xs text-slate-500")}>
        {value ?? "—"}
      </span>
    </div>
  );
}

// ── Deductions tab ────────────────────────────────────────────────────────────

function DeductionsTab({ valeterId }: { valeterId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", totalAmount: "", weeklyAmount: "" });

  const utils = trpc.useUtils();
  const { data: deductions, isLoading } = trpc.valeterDeductions.listForValeter.useQuery({ valeterId });

  const createDed = trpc.valeterDeductions.create.useMutation({
    onSuccess: () => {
      utils.valeterDeductions.listForValeter.invalidate({ valeterId });
      setShowForm(false);
      setForm({ description: "", totalAmount: "", weeklyAmount: "" });
    },
  });

  const settle = trpc.valeterDeductions.settle.useMutation({
    onSuccess: () => utils.valeterDeductions.listForValeter.invalidate({ valeterId }),
  });

  const remove = trpc.valeterDeductions.remove.useMutation({
    onSuccess: () => utils.valeterDeductions.listForValeter.invalidate({ valeterId }),
  });

  type DeductionItem = NonNullable<typeof deductions>[0];
  const active   = (deductions ?? []).filter((d: DeductionItem) => !d.settled);
  const settled  = (deductions ?? []).filter((d: DeductionItem) => d.settled);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Deductions</h3>
          <p className="text-xs text-slate-400">Uniform, equipment & other recoveries</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          <Plus className="h-3.5 w-3.5" /> Add Deduction
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">New Deduction</p>
          <div>
            <label className={LABEL}>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="e.g. Summer uniform (2 sets)"
              className={INPUT}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Total to recover (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.totalAmount}
                onChange={(e) => setForm((p) => ({ ...p, totalAmount: e.target.value }))}
                placeholder="e.g. 60.00"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Weekly deduction (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.weeklyAmount}
                onChange={(e) => setForm((p) => ({ ...p, weeklyAmount: e.target.value }))}
                placeholder="e.g. 15.00"
                className={INPUT}
              />
            </div>
          </div>
          {form.totalAmount && form.weeklyAmount && parseFloat(form.weeklyAmount) > 0 && (
            <p className="text-xs text-slate-500">
              Approx.{" "}
              <strong>{Math.ceil(parseFloat(form.totalAmount) / parseFloat(form.weeklyAmount))} weeks</strong>{" "}
              to recover
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() =>
                createDed.mutate({
                  valeterId,
                  description:  form.description,
                  totalAmount:  parseFloat(form.totalAmount),
                  weeklyAmount: parseFloat(form.weeklyAmount),
                })
              }
              disabled={
                createDed.isPending ||
                !form.description ||
                !form.totalAmount ||
                !form.weeklyAmount
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {createDed.isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
          {createDed.error && <p className="text-xs text-red-500">{createDed.error.message}</p>}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-50" />)}
        </div>
      )}

      {!isLoading && active.length === 0 && settled.length === 0 && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 py-10 text-center">
          <Scissors className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">No deductions recorded</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active</p>
          {active.map((d: typeof active[0]) => {
            const remaining = d.totalAmount - d.totalDeducted;
            const weeksLeft = d.weeklyAmount > 0 ? Math.ceil(remaining / d.weeklyAmount) : "—";
            const pct = Math.min(100, (d.totalDeducted / d.totalAmount) * 100);
            return (
              <div key={d.id} className="rounded-xl border border-slate-100 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{d.description}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      £{d.weeklyAmount.toFixed(2)}/wk · {weeksLeft} {typeof weeksLeft === "number" ? "wks left" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => settle.mutate({ id: d.id })}
                      disabled={settle.isPending}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Settle
                    </button>
                    {d.totalDeducted === 0 && (
                      <button
                        onClick={() => remove.mutate({ id: d.id })}
                        disabled={remove.isPending}
                        className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-500 transition hover:bg-red-100"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-slate-500">
                    £{d.totalDeducted.toFixed(2)} / £{d.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {settled.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Settled</p>
          {settled.map((d: typeof settled[0]) => (
            <div key={d.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 opacity-60">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">{d.description}</p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Settled</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">£{d.totalDeducted.toFixed(2)} recovered</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bank Changes tab ──────────────────────────────────────────────────────────

function BankChangesTab({ valeterId }: { valeterId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    newSortCode: "",
    newAccountNumber: "",
    newAccountName: "",
    newBankReference: "",
    evidenceUrl: "",
  });
  const [notes, setNotes] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.bankChanges.listForValeter.useQuery({ valeterId });

  const create = trpc.bankChanges.create.useMutation({
    onSuccess: () => {
      utils.bankChanges.listForValeter.invalidate({ valeterId });
      setShowForm(false);
      setForm({ newSortCode: "", newAccountNumber: "", newAccountName: "", newBankReference: "", evidenceUrl: "" });
    },
  });

  const approve = trpc.bankChanges.approve.useMutation({
    onSuccess: () => {
      utils.bankChanges.listForValeter.invalidate({ valeterId });
      setActionId(null);
    },
  });

  const reject = trpc.bankChanges.reject.useMutation({
    onSuccess: () => {
      utils.bankChanges.listForValeter.invalidate({ valeterId });
      setActionId(null);
    },
  });

  const STATUS_STYLE: Record<string, string> = {
    PENDING:  "bg-amber-100 text-amber-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Bank Detail Changes</h3>
          <p className="text-xs text-slate-400">£25 admin fee charged per request</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          <Plus className="h-3.5 w-3.5" /> New Request
        </button>
      </div>

      {/* £25 fee notice */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs text-amber-700">
          A <strong>£25 admin fee</strong> is automatically added to the valeter&apos;s pay deductions as soon as a
          request is submitted. The fee applies regardless of whether the request is approved or rejected.
        </p>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">New Bank Change Request</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>New sort code</label>
              <input
                type="text"
                value={form.newSortCode}
                onChange={(e) => setForm((p) => ({ ...p, newSortCode: e.target.value }))}
                placeholder="00-00-00"
                className={`${INPUT} font-mono`}
              />
            </div>
            <div>
              <label className={LABEL}>New account number</label>
              <input
                type="text"
                value={form.newAccountNumber}
                onChange={(e) => setForm((p) => ({ ...p, newAccountNumber: e.target.value }))}
                placeholder="12345678"
                className={`${INPUT} font-mono`}
              />
            </div>
            <div>
              <label className={LABEL}>Account name</label>
              <input
                type="text"
                value={form.newAccountName}
                onChange={(e) => setForm((p) => ({ ...p, newAccountName: e.target.value }))}
                placeholder="Full name on account"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Bank reference (optional)</label>
              <input
                type="text"
                value={form.newBankReference}
                onChange={(e) => setForm((p) => ({ ...p, newBankReference: e.target.value }))}
                placeholder="e.g. pay ref"
                className={INPUT}
              />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Evidence photo URL</label>
              <input
                type="text"
                value={form.evidenceUrl}
                onChange={(e) => setForm((p) => ({ ...p, evidenceUrl: e.target.value }))}
                placeholder="Paste link to bank statement / screenshot"
                className={INPUT}
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Upload the photo elsewhere and paste the link here, or leave blank for now — can be added later.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                create.mutate({
                  valeterId,
                  newSortCode:      form.newSortCode,
                  newAccountNumber: form.newAccountNumber,
                  newAccountName:   form.newAccountName,
                  newBankReference: form.newBankReference || undefined,
                  evidenceUrl:      form.evidenceUrl || undefined,
                })
              }
              disabled={
                create.isPending ||
                !form.newSortCode ||
                !form.newAccountNumber ||
                !form.newAccountName
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {create.isPending ? "Submitting…" : "Submit Request + Charge £25"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
          {create.error && <p className="text-xs text-red-500">{create.error.message}</p>}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-50" />)}
        </div>
      )}

      {!isLoading && (!requests || requests.length === 0) && !showForm && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 py-10 text-center">
          <CreditCard className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">No bank change requests</p>
        </div>
      )}

      {(requests ?? []).map((req: NonNullable<typeof requests>[0]) => {
        const isExpanded = actionId === req.id;
        return (
          <div key={req.id} className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_STYLE[req.status] ?? "bg-slate-100 text-slate-500")}>
                    {req.status}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">£{req.feeAmount.toFixed(2)} fee</span>
                  {req.feeDeducted && <span className="text-[10px] text-slate-400">· deducted wk {req.weekDeducted}</span>}
                </div>
                <div className="font-mono text-xs text-slate-600">
                  {req.newAccountName} · {req.newSortCode} · {req.newAccountNumber}
                  {req.newBankReference && ` · ref: ${req.newBankReference}`}
                </div>
                {req.evidenceUrl && (
                  <a href={req.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                    View evidence photo
                  </a>
                )}
                {req.notes && <p className="text-xs text-slate-500 italic">{req.notes}</p>}
              </div>

              {req.status === "PENDING" && (
                <button
                  onClick={() => setActionId(isExpanded ? null : req.id)}
                  className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  {isExpanded ? "Cancel" : "Review"}
                </button>
              )}
            </div>

            {isExpanded && req.status === "PENDING" && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div>
                  <label className={LABEL}>Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a note for the record…"
                    className={INPUT}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve.mutate({ id: req.id, notes: notes || undefined })}
                    disabled={approve.isPending}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {approve.isPending ? "Approving…" : "Approve — Apply New Details"}
                  </button>
                  <button
                    onClick={() => reject.mutate({ id: req.id, notes: notes || undefined })}
                    disabled={reject.isPending}
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    {reject.isPending ? "Rejecting…" : "Reject"}
                  </button>
                </div>
                {(approve.error || reject.error) && (
                  <p className="text-xs text-red-500">{(approve.error ?? reject.error)?.message}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
