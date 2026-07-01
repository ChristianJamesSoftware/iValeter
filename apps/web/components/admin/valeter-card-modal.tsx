"use client";

import { useState } from "react";
import {
  X,
  User,
  Calendar,
  Banknote,
  MapPin,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type Tab = "overview" | "schedule" | "pay" | "bank" | "access";

interface ValeterCardModalProps {
  valeterUid: string;
  onClose: () => void;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "\u2014";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const DAY_LABELS: Record<string, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};
const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function ValeterCardModal({ valeterUid, onClose }: ValeterCardModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwStatus, setPwStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pwError, setPwError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: valeter, isLoading } = trpc.users.getValeterById.useQuery({
    id: valeterUid,
  });

  const setPasswordMut = trpc.users.setValeterPassword.useMutation({
    onSuccess: () => {
      setPwStatus("saved");
      setPassword("");
      setTimeout(() => setPwStatus("idle"), 3000);
      utils.users.listAllValeters.invalidate();
    },
    onError: (err) => {
      setPwStatus("error");
      setPwError(err.message);
    },
  });

  const handleSetPassword = () => {
    if (password.length < 6) {
      setPwStatus("error");
      setPwError("Password must be at least 6 characters");
      return;
    }
    setPwStatus("saving");
    setPwError(null);
    setPasswordMut.mutate({ id: valeterUid, password });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <User className="h-3.5 w-3.5" /> },
    { id: "schedule", label: "Schedule", icon: <Calendar className="h-3.5 w-3.5" /> },
    { id: "pay", label: "Pay", icon: <Banknote className="h-3.5 w-3.5" /> },
    { id: "bank", label: "Bank", icon: <MapPin className="h-3.5 w-3.5" /> },
    { id: "access", label: "Login Access", icon: <Shield className="h-3.5 w-3.5" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-[90vh] max-h-[680px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          {isLoading || !valeter ? (
            <div>
              <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
              <div className="mt-1 h-3.5 w-24 animate-pulse rounded bg-slate-50" />
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {valeter.firstName} {valeter.lastName}
              </h2>
              <p className="text-sm text-slate-500">
                {valeter.organisation.name}
                {valeter.site ? ` \u00b7 ${valeter.site.name}` : ""}
              </p>
            </div>
          )}
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
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
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !valeter ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-50" />
              ))}
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <Row label="Full name" value={`${valeter.firstName} ${valeter.lastName}`} />
                  <Row label="Email" value={valeter.email} />
                  <Row label="Mobile" value={valeter.mobile ?? "\u2014"} />
                  <Row label="Pay Reference" value={valeter.payId ?? "\u2014"} mono />
                  <Row label="Job title" value={valeter.jobTitle ?? "\u2014"} />
                  <Row
                    label="Status"
                    value={
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          valeter.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {valeter.isActive ? "Active" : "Inactive"}
                      </span>
                    }
                  />
                  <Row label="Site" value={valeter.site?.name ?? "\u2014"} />
                  <Row label="Organisation" value={valeter.organisation.name} />
                  <Row label="Start date" value={fmtDate(valeter.startDate)} />
                  <Row label="Contract complete" value={valeter.contractComplete ? "Yes" : "No"} />
                  {valeter.skills.length > 0 && (
                    <div className="flex items-start gap-4">
                      <span className="w-36 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Skills
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {valeter.skills.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "schedule" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <span className="w-36 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Working days
                    </span>
                    <div className="flex gap-1.5">
                      {ALL_DAYS.map((d) => (
                        <span
                          key={d}
                          className={cn(
                            "flex h-8 w-9 items-center justify-center rounded-lg text-xs font-semibold",
                            valeter.workingDays.includes(d)
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-400",
                          )}
                        >
                          {DAY_LABELS[d]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Row
                    label="Contracted hours"
                    value={valeter.contractedHours != null ? `${valeter.contractedHours}h/day` : "\u2014"}
                  />
                  <Row label="Last login" value={fmtDate(valeter.lastLoginAt)} />
                </div>
              )}

              {activeTab === "pay" && (
                <div className="space-y-4">
                  <Row label="Pay reference" value={valeter.payId ?? "\u2014"} mono />
                  <Row
                    label="Daily rate"
                    value={valeter.dailyRate != null ? `\u00a3${valeter.dailyRate.toFixed(2)}` : "\u2014"}
                  />
                  <Row
                    label="Daily deductions"
                    value={valeter.dailyDeductions != null ? `\u00a3${valeter.dailyDeductions.toFixed(2)}` : "\u2014"}
                  />
                </div>
              )}

              {activeTab === "bank" && (
                <div className="space-y-4">
                  <Row label="Sort code" value={valeter.bankSortCode ?? "\u2014"} mono />
                  <Row label="Account number" value={valeter.bankAccountNumber ?? "\u2014"} mono />
                  <Row label="Account name" value={valeter.bankAccountName ?? "\u2014"} />
                  <Row label="Bank reference" value={valeter.bankReference ?? "\u2014"} mono />
                </div>
              )}

              {activeTab === "access" && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Login credentials</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Valeters can sign in using their{" "}
                      <strong>email address</strong> or their{" "}
                      <strong>pay reference</strong> ({valeter.payId ?? "not set"}) with the
                      password set below.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Set / change password
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setPwStatus("idle");
                            setPwError(null);
                          }}
                          placeholder="Min. 6 characters"
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <button
                        onClick={handleSetPassword}
                        disabled={pwStatus === "saving" || !password}
                        className="rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                      >
                        {pwStatus === "saving" ? "Saving\u2026" : "Save"}
                      </button>
                    </div>

                    {pwStatus === "saved" && (
                      <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Password updated \u2014 valeter can log in now
                      </p>
                    )}
                    {pwStatus === "error" && pwError && (
                      <p className="flex items-center gap-1.5 text-xs text-red-500">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {pwError}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-blue-50 bg-blue-50/60 p-4">
                    <p className="text-xs font-semibold text-blue-700">How valeters log in</p>
                    <ul className="mt-2 space-y-1 text-xs text-blue-600">
                      <li>1. Go to <strong>ivaleter.co.uk/login</strong></li>
                      <li>
                        2. Enter their <strong>email</strong> ({valeter.email}) or{" "}
                        <strong>pay reference</strong> ({valeter.payId ?? "not set"})
                      </li>
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

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-36 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className={cn("text-sm text-slate-700", mono && "font-mono text-xs text-slate-500")}>
        {value}
      </span>
    </div>
  );
}
