"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronUp, PlusCircle, Check, X, Edit2, Trash2,
  Building2, Tag,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Dept-type → keyword mapping (mirrors syncValetLibraryForSite logic) ─────
const DEPT_TYPE_LABELS: Record<string, string> = {
  ALL:       "All departments",
  SALES:     "Sales",
  SERVICE:   "Service",
  BODYSHOP:  "Bodyshop",
};

const DEPT_TYPE_COLORS: Record<string, string> = {
  ALL:      "bg-slate-100 text-slate-600",
  SALES:    "bg-blue-100 text-blue-700",
  SERVICE:  "bg-emerald-100 text-emerald-700",
  BODYSHOP: "bg-amber-100 text-amber-700",
};

/** Returns which valet types (templates) would match this department name */
function matchingTemplates(
  deptName: string,
  templates: { id: string; name: string; departmentType: string }[],
) {
  return templates.filter((t) => {
    if (t.departmentType === "ALL") return true;
    return deptName.toLowerCase().includes(t.departmentType.toLowerCase());
  });
}

// ─── Single department row ────────────────────────────────────────────────────
function DeptRow({
  dept,
  templates,
  onRefresh,
}: {
  dept: { id: string; name: string; serviceTypes: { id: string }[] };
  templates: { id: string; name: string; departmentType: string }[];
  onRefresh: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(dept.name);

  const rename = trpc.sites.renameDepartment.useMutation({ onSuccess: () => { setRenaming(false); onRefresh(); } });
  const remove = trpc.sites.deleteDepartment.useMutation({ onSuccess: onRefresh });

  const matched = matchingTemplates(dept.name, templates);
  const hasBookings = dept.serviceTypes.length > 0; // proxy — if it has STs it has been used

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
      {/* Left: name + rename */}
      <div className="flex-1 min-w-0">
        {renaming ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameVal.trim()) rename.mutate({ departmentId: dept.id, name: renameVal });
                if (e.key === "Escape") { setRenaming(false); setRenameVal(dept.name); }
              }}
              className="h-8 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-navy"
            />
            <button
              onClick={() => { if (renameVal.trim()) rename.mutate({ departmentId: dept.id, name: renameVal }); }}
              disabled={!renameVal.trim() || rename.isPending}
              className="rounded-lg bg-navy p-1.5 text-white hover:bg-navy/80 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setRenaming(false); setRenameVal(dept.name); }}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <p className="text-sm font-semibold text-navy">{dept.name}</p>
        )}

        {/* Valet types that will show for this dept */}
        {!renaming && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {matched.length === 0 ? (
              <span className="text-xs text-slate-400">No valet types matched</span>
            ) : (
              matched.map((t) => (
                <span
                  key={t.id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    DEPT_TYPE_COLORS[t.departmentType] ?? DEPT_TYPE_COLORS.ALL,
                  )}
                >
                  <Tag className="h-2.5 w-2.5" />
                  {t.name}
                </span>
              ))
            )}
          </div>
        )}
        {remove.error && (
          <p className="mt-1 text-xs text-red-500">{remove.error.message}</p>
        )}
      </div>

      {/* Actions */}
      {!renaming && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { setRenaming(true); setRenameVal(dept.name); }}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-slate-400 hover:text-slate-700"
            title="Rename"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { if (confirm(`Delete "${dept.name}"? This cannot be undone.`)) remove.mutate({ departmentId: dept.id }); }}
            disabled={hasBookings || remove.isPending}
            title={hasBookings ? "Cannot delete — has service types linked" : "Delete"}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-red-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Single site card ─────────────────────────────────────────────────────────
function SiteCard({
  site,
  templates,
  onRefresh,
}: {
  site: {
    id: string;
    name: string;
    address: string | null;
    departments: { id: string; name: string; serviceTypes: { id: string }[] }[];
  };
  templates: { id: string; name: string; departmentType: string }[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const addDept = trpc.sites.addDepartment.useMutation({
    onSuccess: () => { setNewName(""); setAdding(false); onRefresh(); },
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Site header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between border-b border-slate-100 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <p className="font-bold text-slate-900">{site.name}</p>
            {site.address && <p className="text-xs text-slate-400">{site.address}</p>}
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {site.departments.length} dept{site.departments.length !== 1 ? "s" : ""}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-slate-400" />
          : <ChevronDown className="h-4 w-4 text-slate-400" />
        }
      </button>

      {expanded && (
        <div className="p-4 space-y-2">
          {site.departments.length === 0 && !adding && (
            <p className="text-sm text-slate-400 py-2 text-center">No departments yet — add one below.</p>
          )}

          {site.departments.map((dept) => (
            <DeptRow key={dept.id} dept={dept} templates={templates} onRefresh={onRefresh} />
          ))}

          {/* Add department row */}
          {adding ? (
            <div className="flex items-center gap-2 pt-1">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) addDept.mutate({ siteId: site.id, name: newName });
                  if (e.key === "Escape") { setAdding(false); setNewName(""); }
                }}
                placeholder="e.g. New Car Sales, Service, Bodyshop…"
                className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-navy"
              />
              <button
                onClick={() => { if (newName.trim()) addDept.mutate({ siteId: site.id, name: newName }); }}
                disabled={!newName.trim() || addDept.isPending}
                className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy/80 disabled:opacity-50"
              >
                {addDept.isPending ? "Adding…" : "Add"}
              </button>
              <button
                onClick={() => { setAdding(false); setNewName(""); }}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-navy hover:text-navy"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add department
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────
export function DepartmentsTab() {
  const utils = trpc.useUtils();

  const sitesQuery = trpc.sites.list.useQuery();
  const templatesQuery = trpc.valetLibrary.listAllValetTypes.useQuery();

  const templates = (templatesQuery.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    departmentType: (t as unknown as { departmentType?: string }).departmentType ?? "ALL",
  }));

  const refresh = () => {
    sitesQuery.refetch();
    utils.sites.list.invalidate();
  };

  if (sitesQuery.isLoading) {
    return <p className="text-sm text-slate-400">Loading sites…</p>;
  }

  const sites = sitesQuery.data ?? [];

  return (
    <div className="space-y-4">
      {/* Explanation banner */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-800">How departments work</p>
        <p className="mt-0.5 text-xs text-blue-600">
          Departments appear as a dropdown on the customer booking form. Valet types from the Valet Library are automatically
          assigned to departments based on their type — <strong>Sales</strong> types go to departments with "sales" in the name,
          <strong> Service</strong> to "service", <strong>Bodyshop</strong> to "bodyshop", and <strong>All</strong> types appear
          in every department.
        </p>
      </div>

      {/* Dept type legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(DEPT_TYPE_LABELS).map(([k, v]) => (
          <span key={k} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", DEPT_TYPE_COLORS[k])}>
            {v}
          </span>
        ))}
      </div>

      {sites.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400">
          No active sites found. Add a site first via the dealership settings.
        </p>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={{
                id: site.id,
                name: site.name,
                address: site.address ?? null,
                departments: site.departments.map((d) => ({
                  id: d.id,
                  name: d.name,
                  serviceTypes: d.serviceTypes,
                })),
              }}
              templates={templates}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
