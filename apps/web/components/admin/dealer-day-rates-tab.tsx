"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { PlusCircle, Pencil, Check, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function penceToGBP(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function parsePounds(val: string): number | null {
  const n = parseFloat(val.replace(/[£,]/g, ""));
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function GBPInput({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">£</span>
      <input
        type="number" step="0.01" min="0" value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "0.00"}
        className="h-9 w-full rounded-lg border border-line bg-white pl-6 pr-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
      />
    </div>
  );
}

// ─── Day Rate Row ─────────────────────────────────────────────────────────────

function DayRateRow({ role, currentPence, dealershipId, onSaved }: {
  role: { id: string; name: string; description: string | null };
  currentPence: number | null;
  dealershipId: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(currentPence != null ? (currentPence / 100).toFixed(2) : "");

  const save   = trpc.dayRates.setDayRate.useMutation({ onSuccess: () => { setEditing(false); onSaved(); } });
  const remove = trpc.dayRates.removeDayRate.useMutation({ onSuccess: onSaved });

  function handleSave() {
    const pence = parsePounds(val);
    if (pence == null) return;
    save.mutate({ dealershipId, roleId: role.id, ratePence: pence });
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy">{role.name}</p>
        {role.description && <p className="text-xs text-slate-400">{role.description}</p>}
        <p className="mt-0.5 text-[10px] text-slate-400">9-hour day (8hr work + 1hr break)</p>
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <GBPInput value={val} onChange={setVal} placeholder="0.00" className="w-28" />
          <button onClick={handleSave} disabled={save.isPending}
            className="rounded-lg bg-navy p-1.5 text-white hover:bg-navy/80 disabled:opacity-50">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setEditing(false); setVal(currentPence != null ? (currentPence / 100).toFixed(2) : ""); }}
            className="rounded-lg border border-line p-1.5 text-slate hover:text-navy">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-bold", currentPence != null ? "text-navy" : "text-slate-300")}>
            {currentPence != null ? penceToGBP(currentPence) : "Not set"}
          </span>
          <button onClick={() => { setEditing(true); setVal(currentPence != null ? (currentPence / 100).toFixed(2) : ""); }}
            className="rounded-lg border border-line p-1.5 text-slate transition hover:border-cyan hover:text-cyan" title="Edit rate">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {currentPence != null && (
            <button onClick={() => remove.mutate({ dealershipId, roleId: role.id })} disabled={remove.isPending}
              className="rounded-lg border border-line p-1.5 text-slate transition hover:border-red-400 hover:text-red-500 disabled:opacity-40" title="Clear rate">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function DealerDayRatesTab({ dealershipId }: { dealershipId: string }) {
  const [addingRole, setAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const rolesQ    = trpc.dayRates.listRoles.useQuery();
  const dayRatesQ = trpc.dayRates.getDayRates.useQuery({ dealershipId });

  const addRole = trpc.dayRates.addRole.useMutation({
    onSuccess: () => { setNewRoleName(""); setAddingRole(false); rolesQ.refetch(); },
  });

  const roles    = rolesQ.data ?? [];
  const dayRates = dayRatesQ.data ?? [];
  const dayRateByRole = new Map<string, number>(dayRates.map((r) => [r.roleId, r.ratePence]));

  function refresh() { dayRatesQ.refetch(); }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-offwhite px-4 py-3">
        <p className="text-sm text-slate">
          Set the daily charge per role type for this dealership.
          Based on a <strong>9-hour day</strong> (8hr work + 1hr break).
        </p>
      </div>

      <div className="space-y-2">
        {rolesQ.isLoading ? (
          <p className="text-sm text-slate">Loading…</p>
        ) : (
          roles.map((role) => (
            <DayRateRow
              key={role.id}
              role={role}
              currentPence={dayRateByRole.get(role.id) ?? null}
              dealershipId={dealershipId}
              onSaved={refresh}
            />
          ))
        )}

        {addingRole ? (
          <div className="flex items-center gap-2 pt-1">
            <input
              autoFocus value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newRoleName.trim()) addRole.mutate({ name: newRoleName });
                if (e.key === "Escape") { setAddingRole(false); setNewRoleName(""); }
              }}
              placeholder="e.g. Specialist Detailer"
              className="h-9 flex-1 rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
            />
            <button onClick={() => { if (newRoleName.trim()) addRole.mutate({ name: newRoleName }); }}
              disabled={!newRoleName.trim() || addRole.isPending}
              className="h-9 rounded-lg bg-navy px-3 text-sm font-medium text-white hover:bg-navy/80 disabled:opacity-50">
              {addRole.isPending ? "Adding…" : "Add"}
            </button>
            <button onClick={() => { setAddingRole(false); setNewRoleName(""); }}
              className="rounded-lg border border-line p-1.5 text-slate hover:text-navy">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => setAddingRole(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-xs font-medium text-slate transition hover:border-cyan hover:text-cyan">
            <PlusCircle className="h-3.5 w-3.5" /> Add custom role
          </button>
        )}
      </div>
    </div>
  );
}
