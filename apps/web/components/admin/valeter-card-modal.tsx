"use client";

import { useState } from "react";
import {
  X, User, Calendar, Banknote, Building2, Shield,
  Eye, EyeOff, CheckCircle2, AlertCircle, Check, Edit2, Power,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type Tab = "overview" | "schedule" | "pay" | "bank" | "access";

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
    { id: "overview" as Tab, label: "Overview",     icon: <User className="h-3.5 w-3.5" /> },
    { id: "schedule" as Tab, label: "Schedule",     icon: <Calendar className="h-3.5 w-3.5" /> },
    { id: "pay"      as Tab, label: "Pay",          icon: <Banknote className="h-3.5 w-3.5" /> },
    { id: "bank"     as Tab, label: "Bank Details", icon: <Building2 className="h-3.5 w-3.5" /> },
    { id: "access"   as Tab, label: "Login Access", icon: <Shield className="h-3.5 w-3.5" /> },
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
  const [form, setForm] = useState({
    firstName: valeter.firstName,
    lastName:  valeter.lastName,
    mobile:    valeter.mobile ?? "",
    payId:     valeter.payId ?? "",
    jobTitle:  valeter.jobTitle ?? "",
    startDate: valeter.startDate ? new Date(valeter.startDate).toISOString().slice(0, 10) : "",
    contractComplete: valeter.contractComplete,
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

function ScheduleTab({ valeter, update, saving }: { valeter: ValeterData; update: (d: Record<string, unknown>) => void; saving: boolean }) {
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState<string[]>(valeter.workingDays ?? []);
  const [hours, setHours] = useState(valeter.contractedHours?.toString() ?? "");

  function save() {
    update({ workingDays: days, contractedHours: hours ? parseFloat(hours) : null });
    setEditing(false);
  }

  function toggleDay(d: string) {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => editing ? save() : setEditing(true)} disabled={saving}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
          {editing ? <><Check className="h-3.5 w-3.5" />Save</> : <><Edit2 className="h-3.5 w-3.5" />Edit</>}
        </button>
      </div>
      <div className="space-y-5">
        <div>
          <label className={LABEL}>Working days</label>
          <div className="mt-1.5 flex gap-1.5">
            {ALL_DAYS.map((d) => {
              const active = (editing ? days : valeter.workingDays ?? []).includes(d);
              return (
                <button
                  key={d}
                  onClick={() => editing && toggleDay(d)}
                  disabled={!editing}
                  className={cn(
                    "flex h-9 w-10 items-center justify-center rounded-lg text-xs font-semibold transition",
                    active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400",
                    editing && !active && "hover:bg-slate-200 cursor-pointer",
                    !editing && "cursor-default",
                  )}
                >
                  {DAY_LABELS[d]}
                </button>
              );
            })}
          </div>
        </div>
        {editing ? (
          <div>
            <label className={LABEL}>Contracted hours / day</label>
            <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 8" className={`${INPUT} max-w-[120px]`} />
          </div>
        ) : (
          <Row label="Contracted hours" value={valeter.contractedHours != null ? `${valeter.contractedHours}h/day` : null} />
        )}
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
