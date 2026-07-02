"use client";

import React, { useRef, useState } from "react";
import {
  X, Upload, Download, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ─── CSV template definitions ─────────────────────────────────────────────────
const TEMPLATES = [
  {
    key: "sales",
    label: "Sales",
    description: "New / used car handover valets",
    deptKeyword: "sales",
    color: "border-blue-200 bg-blue-50 text-blue-700",
    activeColor: "border-blue-500 bg-blue-500 text-white",
    exampleRows: [
      "AB12 CDE,John Smith,2026-07-10,09:00",
      "EF34 GHI,Jane Brown,2026-07-10,10:30",
    ],
  },
  {
    key: "service",
    label: "Service",
    description: "Workshop and service department",
    deptKeyword: "service",
    color: "border-emerald-200 bg-emerald-50 text-emerald-700",
    activeColor: "border-emerald-500 bg-emerald-500 text-white",
    exampleRows: [
      "WX56 YZA,Sarah Jones,2026-07-10,08:00",
      "BC78 DEF,Mike Wilson,2026-07-10,11:00",
    ],
  },
  {
    key: "hire",
    label: "Hire",
    description: "Vehicle hire / fleet turnaround",
    deptKeyword: "hire",
    color: "border-amber-200 bg-amber-50 text-amber-700",
    activeColor: "border-amber-500 bg-amber-500 text-white",
    exampleRows: [
      "GH90 IJK,Fleet Vehicle,2026-07-10,07:30",
      "LM12 NOP,Hire Return,2026-07-10,14:00",
    ],
  },
] as const;

type TemplateKey = (typeof TEMPLATES)[number]["key"];

const CSV_HEADERS = "vehicle_reg,customer_name,date,time";

function buildCsv(tpl: (typeof TEMPLATES)[number]) {
  const lines = [CSV_HEADERS, ...tpl.exampleRows];
  return lines.join("\n");
}

function downloadCsv(tpl: (typeof TEMPLATES)[number]) {
  const blob = new Blob([buildCsv(tpl)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ivaleter-import-${tpl.key}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Parse CSV ────────────────────────────────────────────────────────────────
interface ParsedRow {
  rowNum: number;
  vehicleReg: string;
  customerName: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM
  error?: string;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Skip header row if present
  const start = lines[0]?.toLowerCase().startsWith("vehicle") ? 1 : 0;
  const rows: ParsedRow[] = [];

  for (let i = start; i < lines.length; i++) {
    const cols = lines[i]!.split(",").map((c) => c.trim());
    const [vehicleReg = "", customerName = "", date = "", time = ""] = cols;
    const rowNum = i - start + 1;

    let error: string | undefined;
    if (!vehicleReg) error = "Missing vehicle reg";
    else if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) error = "Date must be YYYY-MM-DD";
    else if (!time.match(/^\d{2}:\d{2}$/)) error = "Time must be HH:MM";

    rows.push({ rowNum, vehicleReg: vehicleReg.toUpperCase(), customerName, date, time, error });
  }

  return rows;
}

// ─── Size label ───────────────────────────────────────────────────────────────
const SIZE_OPTIONS = [
  { value: "SMALL", label: "Small" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LARGE", label: "Large" },
  { value: "XL", label: "XL" },
  { value: "VAN", label: "Van" },
] as const;

type VehicleSize = (typeof SIZE_OPTIONS)[number]["value"];

// ─── Main modal ───────────────────────────────────────────────────────────────
export function ImportBookingsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Step: "template" | "upload" | "preview" | "done"
  const [step, setStep] = useState<"template" | "upload" | "preview" | "done">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("sales");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");

  // Per-row resolved dept + service type (dealer selects from dropdowns in preview)
  const [rowDeptIds, setRowDeptIds] = useState<Record<number, string>>({});
  const [rowServiceIds, setRowServiceIds] = useState<Record<number, string>>({});
  const [rowSizes, setRowSizes] = useState<Record<number, VehicleSize>>({});

  const [result, setResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);

  // Load sites (to get departments + service types)
  const sitesQuery = trpc.sites.list.useQuery();
  const sites = sitesQuery.data ?? [];

  const bulkCreate = trpc.bookings.bulkCreate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setStep("done");
      router.refresh();
    },
  });

  // Derive the site the dealer is on (single site for dealership_user)
  const site = sites[0];
  const tpl = TEMPLATES.find((t) => t.key === selectedTemplate)!;

  // Departments filtered by template keyword (or all if no match)
  const depts = site?.departments ?? [];
  const filteredDepts = depts.filter((d) =>
    tpl.deptKeyword === "hire"
      ? d.name.toLowerCase().includes("hire") || d.name.toLowerCase().includes("fleet")
      : d.name.toLowerCase().includes(tpl.deptKeyword),
  );
  const availableDepts = filteredDepts.length > 0 ? filteredDepts : depts;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setParsedRows(rows);

      // Pre-fill dept + service type from first available options
      const firstDept = availableDepts[0];
      const firstSt = firstDept?.serviceTypes[0];
      const depts: Record<number, string> = {};
      const sts: Record<number, string> = {};
      const sizes: Record<number, VehicleSize> = {};
      rows.forEach((r) => {
        depts[r.rowNum] = firstDept?.id ?? "";
        sts[r.rowNum] = firstSt?.id ?? "";
        sizes[r.rowNum] = "LARGE";
      });
      setRowDeptIds(depts);
      setRowServiceIds(sts);
      setRowSizes(sizes);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  function handleSubmit() {
    if (!site) return;
    const validRows = parsedRows.filter((r) => !r.error);
    const rows = validRows.map((r) => {
      const [year, month, day] = r.date.split("-").map(Number);
      const [hour, minute] = r.time.split(":").map(Number);
      const readyByTime = new Date(year!, month! - 1, day!, hour!, minute!);
      return {
        vehicleReg: r.vehicleReg,
        customerName: r.customerName || undefined,
        readyByTime,
        departmentId: rowDeptIds[r.rowNum] ?? "",
        serviceTypeId: rowServiceIds[r.rowNum] ?? "",
        vehicleSize: rowSizes[r.rowNum] ?? "LARGE" as VehicleSize,
      };
    });
    bulkCreate.mutate({ siteId: site.id, rows });
  }

  const inputCls = "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10";
  const validRows = parsedRows.filter((r) => !r.error);
  const errorRows = parsedRows.filter((r) => r.error);
  const canSubmit = validRows.length > 0 && validRows.every((r) => rowDeptIds[r.rowNum] && rowServiceIds[r.rowNum]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-heading text-base font-bold text-navy">Import Bookings</p>
              <p className="text-xs text-slate-400">
                {step === "template" && "Choose a CSV template"}
                {step === "upload" && "Upload your completed CSV"}
                {step === "preview" && `${validRows.length} booking${validRows.length !== 1 ? "s" : ""} ready to import`}
                {step === "done" && "Import complete"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-0 border-b border-slate-100 shrink-0">
          {(["template", "upload", "preview"] as const).map((s, i) => (
            <div key={s} className={cn("flex-1 py-2 text-center text-xs font-semibold transition",
              step === s ? "border-b-2 border-navy text-navy" :
              (["template", "upload", "preview"].indexOf(step) > i) ? "text-slate-400" : "text-slate-300"
            )}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step 1: Choose template ── */}
          {step === "template" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Select the department type you&apos;re importing for, then download the CSV template. Fill it in and come back to upload.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedTemplate(t.key)}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition",
                      selectedTemplate === t.key ? t.activeColor : t.color,
                    )}
                  >
                    <p className="font-heading font-bold">{t.label}</p>
                    <p className="mt-0.5 text-xs opacity-80">{t.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => downloadCsv(tpl)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Download {tpl.label} template
                </button>
                <button
                  onClick={() => setStep("upload")}
                  className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy/80"
                >
                  Next: Upload CSV →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Upload your completed <strong>{tpl.label}</strong> file.
              </p>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 transition hover:border-navy hover:bg-navy/5"
              >
                <Upload className="h-8 w-8 text-slate-400" />
                <p className="text-sm font-semibold text-slate-600">Click to choose your file</p>
                <p className="text-xs text-slate-400">or drag and drop</p>
              </button>

              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFile}
              />

              <button
                onClick={() => setStep("template")}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                ← Back to template selection
              </button>
            </div>
          )}

          {/* ── Step 3: Preview ── */}
          {step === "preview" && (
            <div className="space-y-4">
              {errorRows.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    {errorRows.length} row{errorRows.length !== 1 ? "s" : ""} skipped due to errors
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs text-amber-700">
                    {errorRows.map((r) => <li key={r.rowNum}>Row {r.rowNum}: {r.error}</li>)}
                  </ul>
                </div>
              )}

              {sitesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading site data…</div>
              ) : (
                <div className="space-y-2">
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr_auto] gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                    <span>Reg</span>
                    <span>Customer</span>
                    <span>Time</span>
                    <span>Department</span>
                    <span>Service</span>
                    <span>Size</span>
                  </div>

                  {validRows.map((r) => {
                    const deptId = rowDeptIds[r.rowNum] ?? "";
                    const dept = availableDepts.find((d) => d.id === deptId);
                    const serviceTypes = dept?.serviceTypes ?? [];

                    return (
                      <div key={r.rowNum} className="grid grid-cols-[1fr_1fr_auto_1fr_1fr_auto] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
                        <span className="font-mono text-sm font-bold text-navy">{r.vehicleReg}</span>
                        <span className="truncate text-sm text-slate-600">{r.customerName || <span className="text-slate-300">—</span>}</span>
                        <span className="whitespace-nowrap text-xs text-slate-500">{r.date.slice(5)} {r.time}</span>

                        {/* Department dropdown */}
                        <select
                          value={deptId}
                          onChange={(e) => {
                            const newDeptId = e.target.value;
                            const newDept = availableDepts.find((d) => d.id === newDeptId);
                            setRowDeptIds((prev) => ({ ...prev, [r.rowNum]: newDeptId }));
                            setRowServiceIds((prev) => ({ ...prev, [r.rowNum]: newDept?.serviceTypes[0]?.id ?? "" }));
                          }}
                          className={cn(inputCls, "w-full")}
                        >
                          {availableDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>

                        {/* Service type dropdown */}
                        <select
                          value={rowServiceIds[r.rowNum] ?? ""}
                          onChange={(e) => setRowServiceIds((prev) => ({ ...prev, [r.rowNum]: e.target.value }))}
                          className={cn(inputCls, "w-full")}
                        >
                          {serviceTypes.length === 0
                            ? <option value="">No services</option>
                            : serviceTypes.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)
                          }
                        </select>

                        {/* Vehicle size */}
                        <select
                          value={rowSizes[r.rowNum] ?? "LARGE"}
                          onChange={(e) => setRowSizes((prev) => ({ ...prev, [r.rowNum]: e.target.value as VehicleSize }))}
                          className={cn(inputCls, "w-20")}
                        >
                          {SIZE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}

              {bulkCreate.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{bulkCreate.error.message}</p>
              )}
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === "done" && result && (
            <div className="space-y-4 text-center py-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              </div>
              <p className="font-heading text-xl font-bold text-navy">
                {result.created} booking{result.created !== 1 ? "s" : ""} imported
              </p>
              {result.errors.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                  <p className="text-sm font-semibold text-amber-800">{result.errors.length} row{result.errors.length !== 1 ? "s" : ""} failed</p>
                  <ul className="mt-1 list-inside list-disc text-xs text-amber-700">
                    {result.errors.map((e) => <li key={e.row}>{e.message}</li>)}
                  </ul>
                </div>
              )}
              <button
                onClick={onClose}
                className="rounded-lg bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy/80"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step === "preview" && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 shrink-0">
            <button
              onClick={() => { setStep("upload"); setParsedRows([]); }}
              className="text-sm text-slate-400 hover:text-slate-700 underline"
            >
              ← Upload different file
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || bulkCreate.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/80 disabled:opacity-50"
            >
              {bulkCreate.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                : <><Upload className="h-4 w-4" /> Import {validRows.length} booking{validRows.length !== 1 ? "s" : ""}</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
