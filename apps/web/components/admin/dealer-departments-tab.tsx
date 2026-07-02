"use client";

import { useState } from "react";
import { PlusCircle, Edit2, Trash2, Check, X, Building2, Tag } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Dept-type colour badges (mirrors valet library logic) ───────────────────
const DEPT_TYPE_COLORS: Record<string, string> = {
  ALL:      "bg-slate-100 text-slate-600",
  SALES:    "bg-blue-100 text-blue-700",
  SERVICE:  "bg-emerald-100 text-emerald-700",
  BODYSHOP: "bg-amber-100 text-amber-700",
};

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

  const rename = trpc.sites.renameDepartment.useMutation({
    onSuccess: () => { setRenaming(false); onRefresh(); },
  });
  const remove = trpc.sites.deleteDepartment.useMutation({ onSuccess: onRefresh });

  const matched = matchingTemplates(dept.name, templates);
  const hasBookings = dept.serviceTypes.length > 0;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
      <div className="min-w-0 flex-1">
        {renaming ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameVal.trim())
                  rename.mutate({ departmentId: dept.id, name: renameVal });
                if (e.key === "Escape") { setRenaming(false); setRenameVal(dept.name); }
              }}
              className="h-8 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
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
              className="rounded-lg border border-line p-1.5 text-slate hover:text-navy"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <p className="text-sm font-semibold text-navy">{dept.name}</p>
        )}

        {!renaming && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {matched.length === 0 ? (
              <span className="text-xs text-slate">No valet types matched</span>
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

      {!renaming && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => { setRenaming(true); setRenameVal(dept.name); }}
            title="Rename"
            className="rounded-lg border border-line p-1.5 text-slate transition hover:border-cyan hover:text-cyan"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${dept.name}"? This cannot be undone.`))
                remove.mutate({ departmentId: dept.id });
            }}
            disabled={hasBookings || remove.isPending}
            title={hasBookings ? "Cannot delete — has bookings linked" : "Delete"}
            className="rounded-lg border border-line p-1.5 text-slate transition hover:border-red-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Single site block ────────────────────────────────────────────────────────
function SiteBlock({
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
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const addDept = trpc.sites.addDepartment.useMutation({
    onSuccess: () => { setNewName(""); setAdding(false); onRefresh(); },
  });

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-offwhite">
      {/* Site header */}
      <div className="flex items-center gap-2 border-b border-line bg-white px-4 py-3">
        <Building2 className="h-4 w-4 shrink-0 text-slate" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy">{site.name}</p>
          {site.address && <p className="text-xs text-slate">{site.address}</p>}
        </div>
        <span className="rounded-full bg-line px-2 py-0.5 text-xs text-slate">
          {site.departments.length} dept{site.departments.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2 p-3">
        {site.departments.length === 0 && !adding && (
          <p className="py-3 text-center text-xs text-slate">No departments yet.</p>
        )}

        {site.departments.map((dept) => (
          <DeptRow key={dept.id} dept={dept} templates={templates} onRefresh={onRefresh} />
        ))}

        {/* Add row */}
        {adding ? (
          <div className="flex items-center gap-2 pt-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim())
                  addDept.mutate({ siteId: site.id, name: newName });
                if (e.key === "Escape") { setAdding(false); setNewName(""); }
              }}
              placeholder="e.g. New Car Sales, Service, Bodyshop…"
              className="h-9 flex-1 rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
            />
            <button
              onClick={() => { if (newName.trim()) addDept.mutate({ siteId: site.id, name: newName }); }}
              disabled={!newName.trim() || addDept.isPending}
              className="h-9 rounded-lg bg-navy px-3 text-sm font-medium text-white hover:bg-navy/80 disabled:opacity-50"
            >
              {addDept.isPending ? "Adding…" : "Add"}
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(""); }}
              className="rounded-lg border border-line p-1.5 text-slate hover:text-navy"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-xs font-medium text-slate transition hover:border-cyan hover:text-cyan"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Add department
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main exported tab ────────────────────────────────────────────────────────
export function DealerDepartmentsTab({ dealershipId }: { dealershipId: string }) {
  const utils = trpc.useUtils();

  const dealerQuery = trpc.dealerships.getById.useQuery({ id: dealershipId });
  const templatesQuery = trpc.valetLibrary.listAllValetTypes.useQuery();

  const templates = (templatesQuery.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    departmentType: (t as unknown as { departmentType?: string }).departmentType ?? "ALL",
  }));

  const refresh = () => utils.dealerships.getById.invalidate({ id: dealershipId });

  if (dealerQuery.isLoading) return <p className="text-sm text-slate">Loading…</p>;

  const sites = dealerQuery.data?.sites ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-offwhite px-4 py-3">
        <p className="text-sm text-slate">
          Departments appear as a dropdown on the customer booking form for this dealership. Valet types
          from the Valet Library are automatically assigned based on the department name — e.g. a department
          called <strong>"New Car Sales"</strong> will receive all Sales and All valet types.
        </p>
      </div>

      {sites.length === 0 ? (
        <p className="rounded-xl border border-line bg-white py-10 text-center text-sm text-slate">
          No sites found for this dealership. Add a site first.
        </p>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <SiteBlock
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
