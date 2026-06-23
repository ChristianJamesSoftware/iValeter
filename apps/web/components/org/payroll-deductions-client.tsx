"use client";

// TODO Phase 4: replace with tRPC query backed by PayRunLine deductions
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

interface Deduction {
  id: string;
  valeter: string;
  type: string;
  amount: number;
  date: string;
  status: "Pending" | "Applied";
  notes: string;
}

const INITIAL: Deduction[] = [
  { id: "1", valeter: "James Mitchell", type: "Equipment", amount: 45, date: "2026-05-01", status: "Applied", notes: "Replacement polisher pad kit" },
  { id: "2", valeter: "Sarah Connor", type: "Uniform", amount: 25, date: "2026-06-01", status: "Pending", notes: "2x branded polo shirts" },
  { id: "3", valeter: "David Okafor", type: "Advance", amount: 150, date: "2026-06-10", status: "Pending", notes: "Salary advance" },
];

const TYPES = ["Equipment", "Uniform", "Advance", "Other"];

const th =
  "bg-slate-50 border-b border-slate-200 text-xs font-medium uppercase tracking-wider text-slate-500 px-4 py-3 text-left";
const td = "border-b border-slate-100 text-sm text-slate-700 px-4 py-3.5";
const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

export function PayrollDeductionsClient() {
  const [rows, setRows] = useState<Deduction[]>(INITIAL);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ valeter: "", type: "Equipment", amount: "", date: "", notes: "" });

  function add(e: React.FormEvent) {
    e.preventDefault();
    setRows((r) => [
      {
        id: crypto.randomUUID(),
        valeter: form.valeter,
        type: form.type,
        amount: Number(form.amount) || 0,
        date: form.date,
        status: "Pending",
        notes: form.notes,
      },
      ...r,
    ]);
    setForm({ valeter: "", type: "Equipment", amount: "", date: "", notes: "" });
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Pay Deductions"
        subtitle="Manage equipment, uniform and advance deductions."
        action={
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Add Deduction
          </button>
        }
      />

      {open && (
        <form
          onSubmit={add}
          className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          <input required placeholder="Valeter" value={form.valeter} onChange={(e) => setForm({ ...form, valeter: e.target.value })} className={inputCls} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input required type="number" step="0.01" placeholder="Amount (£)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} />
          <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
          <button type="submit" className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700">
            Add deduction
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Valeter</th>
              <th className={th}>Type</th>
              <th className={th}>Amount</th>
              <th className={th}>Applied Date</th>
              <th className={th}>Status</th>
              <th className={th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50">
                <td className={`${td} font-medium text-slate-900`}>{r.valeter}</td>
                <td className={td}>{r.type}</td>
                <td className={td}>£{r.amount.toFixed(2)}</td>
                <td className={td}>{r.date}</td>
                <td className={td}>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      r.status === "Applied"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className={`${td} text-slate-500`}>{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
