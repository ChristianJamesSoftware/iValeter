"use client";

import { useRef, useState } from "react";
import { X, Upload, Download, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc/react";

interface ParsedRow {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  mobile?: string;
  jobTitle?: string;
  organisationId: string;
  siteId?: string;
  // display only
  _siteName?: string;
  _orgName?: string;
  _error?: string;
}

interface Props {
  onClose: () => void;
  onDone: () => void;
}

// Map CSV column headers (case-insensitive) to internal keys
const HEADER_MAP: Record<string, keyof ParsedRow | "_siteName" | "_orgName"> = {
  "first name":        "firstName",
  "last name":         "lastName",
  "email address":     "email",
  "email":             "email",
  "mobile":            "mobile",
  "job title":         "jobTitle",
  "password":          "password",
  "site name":         "_siteName",
  "organisation":      "_orgName",
  "organization":      "_orgName",
};

export function ImportCustomerTeamModal({ onClose, onDone }: Props) {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: { email: string; reason: string }[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Load orgs + sites for matching
  const orgsQ = trpc.organisations.listAll.useQuery();
  const orgs = orgsQ.data ?? [];

  // Build a flat site list across all orgs for matching by name
  // We'll look up per-org sites lazily via the listByOrg query
  // Instead: pull all sites for every org we find in the CSV after parsing
  const [orgIds, setOrgIds] = useState<string[]>([]);
  const sitesResults = trpc.useQueries((t) =>
    orgIds.map((id) => t.sites.listByOrg({ organisationId: id }))
  );
  const allSites = sitesResults.flatMap((r, i) =>
    (r.data ?? []).map((s) => ({ ...s, organisationId: orgIds[i]! }))
  );

  const bulkImport = trpc.users.bulkImportDealershipUsers.useMutation({
    onSuccess: async (data) => {
      setResult(data);
      setStep("done");
      await utils.users.listAllDealershipUsers.invalidate();
      onDone();
    },
  });

  // ── Parse uploaded file ────────────────────────────────────────────────────
  function handleFile(file: File) {
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        // Use first sheet
        const ws = wb.Sheets[wb.SheetNames[0]!]!;
        const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

        if (raw.length === 0) { setParseError("No data rows found in the file."); return; }

        // Normalise headers
        const parsed: ParsedRow[] = raw.map((r) => {
          const norm: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) {
            norm[k.toLowerCase().trim()] = String(v).trim();
          }

          const get = (key: string) => {
            const mapped = HEADER_MAP[key];
            if (!mapped) return "";
            return norm[key] ?? "";
          };

          // Find values by all possible header names
          const firstName = Object.entries(norm).find(([k]) => HEADER_MAP[k] === "firstName")?.[1] ?? "";
          const lastName  = Object.entries(norm).find(([k]) => HEADER_MAP[k] === "lastName")?.[1] ?? "";
          const email     = Object.entries(norm).find(([k]) => HEADER_MAP[k] === "email")?.[1] ?? "";
          const mobile    = Object.entries(norm).find(([k]) => HEADER_MAP[k] === "mobile")?.[1];
          const jobTitle  = Object.entries(norm).find(([k]) => HEADER_MAP[k] === "jobTitle")?.[1];
          const password  = Object.entries(norm).find(([k]) => HEADER_MAP[k] === "password")?.[1] ?? "iValeter1!";
          const siteName  = Object.entries(norm).find(([k]) => HEADER_MAP[k] === "_siteName")?.[1] ?? "";
          const orgName   = Object.entries(norm).find(([k]) => HEADER_MAP[k] === "_orgName")?.[1] ?? "";

          return {
            firstName,
            lastName,
            email,
            password,
            mobile:   mobile  || undefined,
            jobTitle: jobTitle || undefined,
            organisationId: "", // resolved after site lookup
            siteId: undefined,
            _siteName: siteName,
            _orgName:  orgName,
          } satisfies ParsedRow;
        });

        // Collect unique org names and match to org IDs
        const orgNamesInFile = [...new Set(parsed.map((r) => r._orgName ?? "").filter(Boolean))];
        const resolvedOrgIds: string[] = [];

        const resolvedRows = parsed.map((row) => {
          // Match org by name (case-insensitive partial)
          const orgMatch = orgs.find((o) =>
            o.name.toLowerCase().includes((row._orgName ?? "").toLowerCase()) ||
            (row._orgName ?? "").toLowerCase().includes(o.name.toLowerCase())
          );
          if (orgMatch) {
            if (!resolvedOrgIds.includes(orgMatch.id)) resolvedOrgIds.push(orgMatch.id);
            return { ...row, organisationId: orgMatch.id };
          }
          // If only one org, default to it
          if (orgs.length === 1) {
            if (!resolvedOrgIds.includes(orgs[0]!.id)) resolvedOrgIds.push(orgs[0]!.id);
            return { ...row, organisationId: orgs[0]!.id };
          }
          return { ...row, _error: `Organisation "${row._orgName}" not found` };
        });

        setOrgIds(resolvedOrgIds);
        setRows(resolvedRows);
        setStep("preview");
      } catch (err) {
        setParseError(`Could not parse file: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // Resolve site IDs once allSites is populated
  const resolvedRows = rows.map((row) => {
    if (row.siteId || !row._siteName) return row;
    const siteMatch = allSites.find(
      (s) =>
        s.organisationId === row.organisationId &&
        s.name.toLowerCase().includes(row._siteName!.toLowerCase()),
    );
    return siteMatch ? { ...row, siteId: siteMatch.id } : row;
  });

  const validRows   = resolvedRows.filter((r) => !r._error && r.firstName && r.lastName && r.email);
  const invalidRows = resolvedRows.filter((r) => r._error || !r.firstName || !r.lastName || !r.email);

  // ── Template download ──────────────────────────────────────────────────────
  function downloadTemplate() {
    const headers = [
      "First Name", "Last Name", "Email Address", "Mobile",
      "Site Name", "Job Title", "Password", "Notes"
    ];
    const example = [
      ["James", "Mitchell", "james.mitchell@dealership.co.uk", "07700900001",
       "Mazda Swindon", "Sales Manager", "iValeter1!", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
    ws["!cols"] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Team");
    XLSX.writeFile(wb, "iValeter_CustomerTeam_Import.xlsx");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Import Customer Team</h2>
            <p className="text-xs text-slate-400">Upload CSV or Excel — creates dealership portal logins in bulk</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step: Upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Download template */}
              <button
                onClick={downloadTemplate}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
              >
                <Download className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Download import template</p>
                  <p className="text-xs text-slate-400">Excel with the correct column layout</p>
                </div>
              </button>

              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 transition hover:border-slate-400 hover:bg-slate-100"
              >
                <FileSpreadsheet className="h-10 w-10 text-slate-300" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-slate-400">.xlsx or .csv — max 500 rows</p>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />

              {parseError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {parseError}
                </div>
              )}

              {/* Column guide */}
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Expected columns</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                  {[
                    ["First Name", "Required"],
                    ["Last Name", "Required"],
                    ["Email Address", "Required — becomes their login"],
                    ["Mobile", "Optional"],
                    ["Site Name", "Must match site name in iValeter"],
                    ["Job Title", "Optional"],
                    ["Password", "Min 6 chars — defaults to iValeter1!"],
                    ["Notes", "Ignored on import"],
                  ].map(([col, note]) => (
                    <div key={col} className="flex gap-1">
                      <span className="font-semibold text-slate-800">{col}</span>
                      <span className="text-slate-400">— {note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step: Preview ── */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{validRows.length}</p>
                  <p className="text-xs text-emerald-600">Ready to import</p>
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex-1 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{invalidRows.length}</p>
                    <p className="text-xs text-red-500">Rows with errors</p>
                  </div>
                )}
              </div>

              {/* Invalid rows */}
              {invalidRows.length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                  <p className="mb-2 text-xs font-bold text-red-700">Rows that will be skipped:</p>
                  <div className="space-y-1">
                    {invalidRows.map((r, i) => (
                      <p key={i} className="text-xs text-red-600">
                        Row {i + 1}: {r.email || "(no email)"} — {r._error ?? "missing required fields"}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid rows table */}
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Name", "Email", "Site", "Job Title", "Mobile"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.map((r, i) => (
                        <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-3 py-2 font-medium text-slate-800">{r.firstName} {r.lastName}</td>
                          <td className="px-3 py-2 text-slate-500">{r.email}</td>
                          <td className="px-3 py-2 text-slate-500">{r._siteName || "—"}</td>
                          <td className="px-3 py-2 text-slate-500">{r.jobTitle || "—"}</td>
                          <td className="px-3 py-2 text-slate-500">{r.mobile || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {bulkImport.error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {bulkImport.error.message}
                </div>
              )}
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && result && (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <div>
                <p className="text-xl font-bold text-slate-900">{result.created} users created</p>
                {result.skipped > 0 && (
                  <p className="text-sm text-slate-400">{result.skipped} skipped — email already exists</p>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-left">
                  <p className="mb-1 text-xs font-bold text-red-700">Errors:</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e.email}: {e.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-slate-100 px-6 py-4">
          {step === "preview" && (
            <button
              onClick={() => { setStep("upload"); setRows([]); }}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              ← Back
            </button>
          )}
          <div className="ml-auto flex gap-3">
            {step === "done" ? (
              <button
                onClick={onClose}
                className="h-10 rounded-lg bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            ) : step === "preview" ? (
              <>
                <button onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  disabled={validRows.length === 0 || bulkImport.isPending}
                  onClick={() =>
                    bulkImport.mutate({
                      rows: validRows.map((r) => ({
                        firstName:      r.firstName,
                        lastName:       r.lastName,
                        email:          r.email,
                        password:       r.password,
                        mobile:         r.mobile,
                        jobTitle:       r.jobTitle,
                        organisationId: r.organisationId,
                        siteId:         r.siteId,
                      })),
                    })
                  }
                  className="flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {bulkImport.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                  ) : (
                    <><Upload className="h-4 w-4" /> Import {validRows.length} users</>
                  )}
                </button>
              </>
            ) : (
              <button onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
