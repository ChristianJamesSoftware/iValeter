"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

interface Valeter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  siteName: string | null;
  jobsToday: number;
  isActive: boolean;
  payId: string | null;
  mobile: string | null;
  dailyRate: number | null;
  startDate: string | Date | null;
  contractComplete: boolean;
}
interface SiteOpt {
  id: string;
  name: string;
}

function generatePayId(firstName: string, lastName: string): string {
  const f = firstName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
  const l = lastName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
  return `${f}.${l}`;
}

function fmtDate(d: string | Date | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const TH =
  "px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400";

export function TeamManager({
  initialValeters,
  sites,
}: {
  initialValeters: Valeter[];
  sites: SiteOpt[];
}) {
  const [showForm, setShowForm] = useState(false);
  const list = trpc.users.listValeters.useQuery(undefined, {
    initialData: initialValeters as never,
  });
  const valeters = (list.data as unknown as Valeter[]) ?? initialValeters;

  return (
    <div>
      {showForm && (
        <AddValeterForm sites={sites} onDone={() => setShowForm(false)} />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Valeting Team
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {valeters.length}
            </span>
          </h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <UserPlus className="h-4 w-4" />
            Add Valeter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className={TH}>Name</th>
                <th className={TH}>Pay ID</th>
                <th className={TH}>Mobile</th>
                <th className={TH}>Site</th>
                <th className={TH}>Daily Rate</th>
                <th className={TH}>Start Date</th>
                <th className={TH}>Contract</th>
                <th className={TH}>Active</th>
                <th className={TH}>Jobs Today</th>
              </tr>
            </thead>
            <tbody>
              {valeters.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center text-sm text-slate-400"
                  >
                    No valeters yet.
                  </td>
                </tr>
              ) : (
                valeters.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-slate-900">
                      {v.firstName} {v.lastName}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {v.payId ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {v.mobile ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {v.siteName ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {v.dailyRate != null ? `£${v.dailyRate.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {fmtDate(v.startDate)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          v.contractComplete
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-amber-100 bg-amber-50 text-amber-700",
                        )}
                      >
                        {v.contractComplete ? "Complete" : "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          v.isActive
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-500",
                        )}
                      >
                        {v.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {v.jobsToday}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddValeterForm({
  sites,
  onDone,
}: {
  sites: SiteOpt[];
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [dailyRate, setDailyRate] = useState("");
  const [dailyDeductions, setDailyDeductions] = useState("");
  const [startDate, setStartDate] = useState("");
  const [contractComplete, setContractComplete] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [payIdEdited, setPayIdEdited] = useState(false);
  const [payId, setPayId] = useState("");

  const autoPayId = generatePayId(firstName, lastName);
  const effectivePayId = payIdEdited ? payId : autoPayId;

  const create = trpc.users.create.useMutation({
    onSuccess: async () => {
      await utils.users.listValeters.invalidate();
      onDone();
    },
  });

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.length >= 6 &&
    !create.isPending;

  return (
    <div className="mb-4 rounded-xl border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading font-bold text-navy">New valeter</h2>
        <button onClick={onDone} className="rounded-lg p-1 hover:bg-offwhite">
          <X className="h-5 w-5 text-slate" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="First name">
          <Input value={firstName} onChange={setFirstName} placeholder="First name" />
        </Field>
        <Field label="Last name">
          <Input value={lastName} onChange={setLastName} placeholder="Last name" />
        </Field>
        <Field label="Email">
          <Input value={email} onChange={setEmail} placeholder="Email" type="email" />
        </Field>
        <Field label="Mobile">
          <Input value={mobile} onChange={setMobile} placeholder="Mobile" />
        </Field>
        <Field label="Site">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="h-12 w-full rounded-lg border border-line bg-white px-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pay ID (auto)">
          <input
            value={effectivePayId}
            onChange={(e) => {
              setPayIdEdited(true);
              setPayId(e.target.value);
            }}
            placeholder="XXXX.XXXX"
            className="h-12 w-full rounded-lg border border-line bg-offwhite px-4 font-mono text-navy outline-none focus:border-cyan focus:bg-white focus:ring-2 focus:ring-cyan/30"
          />
        </Field>
        <Field label="Daily rate (£)">
          <Input value={dailyRate} onChange={setDailyRate} placeholder="0.00" type="number" />
        </Field>
        <Field label="Daily deductions (£)">
          <Input
            value={dailyDeductions}
            onChange={setDailyDeductions}
            placeholder="0.00"
            type="number"
          />
        </Field>
        <Field label="Start date">
          <Input value={startDate} onChange={setStartDate} placeholder="Start date" type="date" />
        </Field>
        <Field label="Password (login)">
          <Input
            value={password}
            onChange={setPassword}
            placeholder="Password (min 6)"
            type="password"
          />
        </Field>
        <Toggle
          label="Contract complete"
          checked={contractComplete}
          onChange={setContractComplete}
        />
        <Toggle label="Active" checked={isActive} onChange={setIsActive} />
      </div>
      {create.error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {create.error.message}
        </p>
      )}
      <button
        disabled={!canSubmit}
        onClick={() =>
          create.mutate({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            password,
            role: "valeter",
            siteId,
            mobile: mobile.trim() || undefined,
            payId: effectivePayId || undefined,
            dailyRate: dailyRate ? Number(dailyRate) : undefined,
            dailyDeductions: dailyDeductions ? Number(dailyDeductions) : undefined,
            startDate: startDate || undefined,
            contractComplete,
          })
        }
        className="mt-4 h-11 w-full rounded-lg bg-cyan font-heading font-semibold text-navy transition hover:bg-cyan-600 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {create.isPending ? "Creating…" : "Create valeter"}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex h-12 items-center gap-3 self-end rounded-lg border border-line bg-white px-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line text-cyan focus:ring-cyan"
      />
      <span className="text-sm text-navy">{label}</span>
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
    />
  );
}
