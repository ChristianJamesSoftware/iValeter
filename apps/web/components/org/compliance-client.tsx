"use client";

// TODO Phase 4: replace mock data with ComplianceDocument schema model
import { AlertTriangle, CheckCircle2, Clock, XCircle, FileQuestion } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/brand/stat-card";

type DocStatus = "valid" | "expiring" | "expired" | "missing";

const DOCS: {
  valeter: string;
  type: string;
  issued: string;
  expiry: string;
  status: DocStatus;
}[] = [
  { valeter: "James Mitchell", type: "DBS Check", issued: "2023-02-01", expiry: "2026-02-01", status: "valid" },
  { valeter: "James Mitchell", type: "Right to Work", issued: "2021-09-15", expiry: "—", status: "valid" },
  { valeter: "Sarah Connor", type: "Driving Licence", issued: "2020-05-10", expiry: "2026-07-01", status: "expiring" },
  { valeter: "David Okafor", type: "Insurance", issued: "2023-01-01", expiry: "2025-01-01", status: "expired" },
  { valeter: "Priya Sharma", type: "DBS Check", issued: "—", expiry: "—", status: "missing" },
];

const STATUS: Record<DocStatus, { label: string; cls: string }> = {
  valid: { label: "Valid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  expiring: { label: "Expiring", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  expired: { label: "Expired", cls: "bg-red-50 text-red-600 border-red-200" },
  missing: { label: "Missing", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

const th =
  "bg-slate-50 border-b border-slate-200 text-xs font-medium uppercase tracking-wider text-slate-500 px-4 py-3 text-left";
const td = "border-b border-slate-100 text-sm text-slate-700 px-4 py-3.5";

export function ComplianceClient() {
  const counts = {
    valid: DOCS.filter((d) => d.status === "valid").length,
    expiring: DOCS.filter((d) => d.status === "expiring").length,
    expired: DOCS.filter((d) => d.status === "expired").length,
    missing: DOCS.filter((d) => d.status === "missing").length,
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Compliance"
        subtitle="Document tracking for DBS, Right to Work and more."
      />

      {counts.expired > 0 && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {counts.expired} document{counts.expired > 1 ? "s have" : " has"} expired. Action required.
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} title="All Valid" value={counts.valid} accent="success" />
        <StatCard icon={Clock} title="Expiring (30d)" value={counts.expiring} accent="warning" />
        <StatCard icon={XCircle} title="Expired" value={counts.expired} accent="danger" />
        <StatCard icon={FileQuestion} title="Missing" value={counts.missing} accent="navy" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Valeter</th>
              <th className={th}>Document</th>
              <th className={th}>Issued</th>
              <th className={th}>Expiry</th>
              <th className={th}>Status</th>
              <th className={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {DOCS.map((d, i) => {
              const s = STATUS[d.status];
              return (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className={`${td} font-medium text-slate-900`}>{d.valeter}</td>
                  <td className={td}>{d.type}</td>
                  <td className={td}>{d.issued}</td>
                  <td className={td}>{d.expiry}</td>
                  <td className={td}>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                      {s.label}
                    </span>
                  </td>
                  <td className={td}>
                    <button className="font-medium text-orange-600 hover:underline">
                      {d.status === "missing" ? "Upload" : "View"}
                    </button>
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
