"use client";

import { useState } from "react";
import { Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { trpc, RouterOutputs } from "@/lib/trpc/react";
import { PageHeader } from "@/components/dashboard/page-header";

type Tab = "standing" | "accidents";

type StandingDed = RouterOutputs["valeterDeductions"]["listAll"][number];
type AccidentDed = RouterOutputs["valeterDeductions"]["listAllAccidents"][number];

const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#E8650A] focus:ring-2 focus:ring-orange-100";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1";
const th =
  "bg-[#F5F0E8] text-[11px] font-bold uppercase tracking-wider text-[#1C1A16]/50 px-5 py-3 text-left";
const td = "border-b border-slate-100 text-sm text-slate-700 px-5 py-4";

function fmtGBP(n: number): string {
  return `£${n.toFixed(2)}`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Standing Deductions Tab ─────────────────────────────────────────────────

function StandingDeductionsTab() {
  const utils = trpc.useUtils();

  const { data: deductions = [], isLoading } = trpc.valeterDeductions.listAll.useQuery();
  const { data: valeters = [] } = trpc.users.listValeters.useQuery();

  const settle = trpc.valeterDeductions.settle.useMutation({
    onSuccess: () => void utils.valeterDeductions.listAll.invalidate(),
  });
  const create = trpc.valeterDeductions.create.useMutation({
    onSuccess: () => {
      void utils.valeterDeductions.listAll.invalidate();
      setAddOpen(false);
      setForm({ valeterId: "", description: "", totalAmount: "", weeklyAmount: "" });
    },
  });

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    valeterId: "",
    description: "",
    totalAmount: "",
    weeklyAmount: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({
      valeterId: form.valeterId,
      description: form.description,
      totalAmount: Number(form.totalAmount),
      weeklyAmount: Number(form.weeklyAmount),
    });
  }

  const active = deductions.filter((d) => !d.settled);
  const settled = deductions.filter((d) => d.settled);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {active.length} active deduction{active.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setAddOpen((v) => !v)}
          className="flex h-9 items-center gap-2 rounded-lg bg-[#E8650A] px-4 text-sm font-medium text-white transition hover:bg-orange-600"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Deduction
        </button>
      </div>

      {addOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="sm:col-span-2 lg:col-span-1">
            <label className={labelCls}>Valeter</label>
            <select
              required
              value={form.valeterId}
              onChange={(e) => setForm({ ...form, valeterId: e.target.value })}
              className={inputCls}
            >
              <option value="">Select…</option>
              {valeters.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.firstName} {v.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className={labelCls}>Description</label>
            <input
              required
              placeholder="e.g. Summer uniform (2 sets)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Total Cost (£)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Weekly Amount (£)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={form.weeklyAmount}
              onChange={(e) => setForm({ ...form, weeklyAmount: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={create.isPending}
              className="h-10 rounded-lg bg-[#1C1A16] px-5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {create.isPending ? "Saving…" : "Create Deduction"}
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex h-24 items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Active */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="bg-[#F5F0E8] px-5 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1C1A16]/60">
                Active Deductions
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Valeter</th>
                  <th className={th}>Description</th>
                  <th className={th}>Total</th>
                  <th className={th}>Weekly</th>
                  <th className={th}>Deducted</th>
                  <th className={th}>Remaining</th>
                  <th className={th}>Progress</th>
                  <th className={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {active.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                      No active deductions.
                    </td>
                  </tr>
                )}
                {active.map((ded) => {
                  const remaining = Math.max(0, ded.totalAmount - ded.totalDeducted);
                  const pct = Math.min(100, (ded.totalDeducted / ded.totalAmount) * 100);
                  return (
                    <tr key={ded.id} className="hover:bg-[#F5F0E8]/30 transition-colors">
                      <td className={`${td} font-medium text-[#1C1A16]`}>
                        {ded.valeter.firstName} {ded.valeter.lastName}
                      </td>
                      <td className={td}>{ded.description}</td>
                      <td className={td}>{fmtGBP(ded.totalAmount)}</td>
                      <td className={td}>{fmtGBP(ded.weeklyAmount)}</td>
                      <td className={td}>{fmtGBP(ded.totalDeducted)}</td>
                      <td className={`${td} font-medium text-amber-700`}>{fmtGBP(remaining)}</td>
                      <td className={td}>
                        <div className="w-24">
                          <div className="h-1.5 w-full rounded-full bg-slate-100">
                            <div
                              className="h-1.5 rounded-full bg-[#E8650A] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-400">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className={td}>
                        <button
                          onClick={() => settle.mutate({ id: ded.id })}
                          disabled={settle.isPending}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Settle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Settled */}
          {settled.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="bg-slate-50 px-5 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Settled Deductions
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Valeter</th>
                    <th className={th}>Description</th>
                    <th className={th}>Total Recovered</th>
                    <th className={th}>Weekly Was</th>
                  </tr>
                </thead>
                <tbody>
                  {settled.map((ded) => (
                    <tr key={ded.id} className="opacity-60">
                      <td className={`${td} font-medium text-[#1C1A16]`}>
                        {ded.valeter.firstName} {ded.valeter.lastName}
                      </td>
                      <td className={td}>{ded.description}</td>
                      <td className={td}>{fmtGBP(ded.totalAmount)}</td>
                      <td className={td}>{fmtGBP(ded.weeklyAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Accident Deductions Tab ─────────────────────────────────────────────────

function AccidentDeductionsTab() {
  const { data: accidents = [], isLoading } = trpc.valeterDeductions.listAllAccidents.useQuery();

  const active = accidents.filter((a) => !a.settled);
  const settled = accidents.filter((a) => a.settled);

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-slate-400">Loading…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="bg-[#F5F0E8] px-5 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1C1A16]/60">
            Active Accident Deductions
          </span>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Valeter</th>
              <th className={th}>Incident Date</th>
              <th className={th}>Vehicle Reg</th>
              <th className={th}>Excess</th>
              <th className={th}>Weekly Deduction</th>
              <th className={th}>Deducted</th>
              <th className={th}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {active.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-400">
                  No outstanding accident deductions.
                </td>
              </tr>
            )}
            {active.map((acc) => {
              const remaining = Math.max(0, acc.excessAmount - acc.totalDeducted);
              return (
                <tr key={acc.id} className="hover:bg-[#F5F0E8]/30 transition-colors">
                  <td className={`${td} font-medium text-[#1C1A16]`}>
                    {acc.valeter.firstName} {acc.valeter.lastName}
                  </td>
                  <td className={td}>{fmtDate(acc.incidentDate)}</td>
                  <td className={`${td} font-mono text-xs uppercase`}>{acc.vehicleReg}</td>
                  <td className={td}>{fmtGBP(acc.excessAmount)}</td>
                  <td className={td}>
                    {acc.weeklyDeduction != null ? (
                      fmtGBP(acc.weeklyDeduction)
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Not set
                      </span>
                    )}
                  </td>
                  <td className={td}>{fmtGBP(acc.totalDeducted)}</td>
                  <td className={`${td} font-medium text-amber-700`}>{fmtGBP(remaining)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {settled.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="bg-slate-50 px-5 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Settled Accidents
            </span>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Valeter</th>
                <th className={th}>Incident Date</th>
                <th className={th}>Vehicle Reg</th>
                <th className={th}>Total Recovered</th>
              </tr>
            </thead>
            <tbody>
              {settled.map((acc) => (
                <tr key={acc.id} className="opacity-60">
                  <td className={`${td} font-medium text-[#1C1A16]`}>
                    {acc.valeter.firstName} {acc.valeter.lastName}
                  </td>
                  <td className={td}>{fmtDate(acc.incidentDate)}</td>
                  <td className={`${td} font-mono text-xs uppercase`}>{acc.vehicleReg}</td>
                  <td className={td}>{fmtGBP(acc.excessAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function PayrollDeductionsClient() {
  const [tab, setTab] = useState<Tab>("standing");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Pay Deductions"
        subtitle="Standing deductions and accident excess recovery across all valeters."
      />

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {(
          [
            { id: "standing", label: "Standing Deductions" },
            { id: "accidents", label: "Accident Deductions" },
          ] as { id: Tab; label: string }[]
        ).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === id
                ? "bg-white text-[#1C1A16] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "standing" && <StandingDeductionsTab />}
      {tab === "accidents" && <AccidentDeductionsTab />}
    </div>
  );
}
