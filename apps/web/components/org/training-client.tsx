"use client";

// TODO: Add TrainingRecord model to schema in Phase 4
import { useState, useMemo } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";

interface Record {
  id: string;
  valeter: string;
  course: string;
  completed: string;
  expiry: string;
  certificate: string | null;
}

const INITIAL: Record[] = [
  { id: "1", valeter: "James Mitchell", course: "Paint Correction L2", completed: "2024-03-12", expiry: "2027-03-12", certificate: "#" },
  { id: "2", valeter: "Sarah Connor", course: "Chemical Safety (COSHH)", completed: "2024-08-01", expiry: "2026-08-01", certificate: "#" },
  { id: "3", valeter: "David Okafor", course: "Manual Handling", completed: "2023-06-20", expiry: "2026-06-20", certificate: null },
  { id: "4", valeter: "Priya Sharma", course: "Ceramic Coating Cert", completed: "2022-01-10", expiry: "2025-01-10", certificate: "#" },
];

function statusFor(expiry: string) {
  const now = new Date();
  const exp = new Date(expiry);
  const in30 = new Date();
  in30.setDate(now.getDate() + 30);
  if (exp < now) return { label: "Expired", cls: "bg-red-50 text-red-600 border-red-200" };
  if (exp < in30) return { label: "Expiring Soon", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Valid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

const th =
  "bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3 text-left";
const td = "border-b border-slate-50 text-sm text-slate-700 px-5 py-4";
const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

export function TrainingClient() {
  const [records, setRecords] = useState<Record[]>(INITIAL);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ valeter: "", course: "", completed: "", expiry: "", certificate: "" });

  function add(e: React.FormEvent) {
    e.preventDefault();
    setRecords((r) => [
      { id: crypto.randomUUID(), ...form, certificate: form.certificate || null },
      ...r,
    ]);
    setForm({ valeter: "", course: "", completed: "", expiry: "", certificate: "" });
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Training Records"
        subtitle="Certifications and renewal tracking for your team."
        action={
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </button>
        }
      />

      {/* Expiry alerts */}
      {(() => {
        const expired = records.filter((r) => new Date(r.expiry) < new Date());
        const expiringSoon = records.filter((r) => {
          const exp = new Date(r.expiry);
          const now = new Date();
          const in30 = new Date();
          in30.setDate(now.getDate() + 30);
          return exp >= now && exp < in30;
        });
        if (expired.length === 0 && expiringSoon.length === 0) return null;
        return (
          <div className="mb-5 space-y-2">
            {expired.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-5 py-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold text-red-900">Expired training — renewal required</p>
                  <p className="text-sm text-red-700">{expired.map((r) => `${r.valeter} (${r.course})`).join(", ")}</p>
                </div>
              </div>
            )}
            {expiringSoon.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold text-amber-900">Training expiring within 30 days</p>
                  <p className="text-sm text-amber-700">{expiringSoon.map((r) => `${r.valeter} (${r.course})`).join(", ")}</p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {open && (
        <form
          onSubmit={add}
          className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          <input required placeholder="Valeter" value={form.valeter} onChange={(e) => setForm({ ...form, valeter: e.target.value })} className={inputCls} />
          <input required placeholder="Course name" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className={inputCls} />
          <input required type="date" value={form.completed} onChange={(e) => setForm({ ...form, completed: e.target.value })} className={inputCls} />
          <input required type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} className={inputCls} />
          <input placeholder="Certificate URL (optional)" value={form.certificate} onChange={(e) => setForm({ ...form, certificate: e.target.value })} className={inputCls} />
          <button type="submit" className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700">
            Save record
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Valeter</th>
              <th className={th}>Course</th>
              <th className={th}>Completed</th>
              <th className={th}>Expiry</th>
              <th className={th}>Status</th>
              <th className={th}>Certificate</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const s = statusFor(r.expiry);
              return (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className={`${td} font-medium text-slate-900`}>{r.valeter}</td>
                  <td className={td}>{r.course}</td>
                  <td className={td}>{r.completed}</td>
                  <td className={td}>{r.expiry}</td>
                  <td className={td}>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                      {s.label}
                    </span>
                  </td>
                  <td className={td}>
                    {r.certificate ? (
                      <a href={r.certificate} className="font-medium text-orange-600 hover:underline">
                        View
                      </a>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
