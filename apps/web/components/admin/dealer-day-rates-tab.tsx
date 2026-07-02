"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import {
  PlusCircle, Pencil, Check, X, Trash2, Users, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}
function parsePounds(val: string): number | null {
  const n = parseFloat(val.replace(/[£,]/g, ""));
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-9 rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30", className)}
    />
  );
}

function NumberInput({ value, onChange, min, step, placeholder, className }: {
  value: string; onChange: (v: string) => void; min?: number; step?: number; placeholder?: string; className?: string;
}) {
  return (
    <input
      type="number" value={value} placeholder={placeholder ?? "0"}
      min={min ?? 0} step={step ?? 1}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-9 rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30", className)}
    />
  );
}

function PoundInput({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">£</span>
      <input
        type="number" step="0.01" min="0" value={value}
        placeholder={placeholder ?? "0.00"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-line bg-white pl-6 pr-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
      />
    </div>
  );
}

function SaveCancel({ onSave, onCancel, saving, disabled }: {
  onSave: () => void; onCancel: () => void; saving?: boolean; disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={onSave} disabled={saving || disabled}
        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy text-sm font-semibold text-white hover:bg-navy/80 disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" />
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        onClick={onCancel}
        className="h-9 rounded-lg border border-line px-3 text-sm text-slate hover:text-navy"
      >
        Cancel
      </button>
    </div>
  );
}

// ─── Operative Card ───────────────────────────────────────────────────────────

type Operative = {
  id: string;
  roleId: string;
  role: { id: string; name: string };
  departmentName: string | null;
  quantity: number;
  allocatedHoursPerDay: number;
  dayRatePence: number;
};

function OperativeCard({
  op, roles, dealershipId, onSaved,
}: {
  op: Operative;
  roles: { id: string; name: string }[];
  dealershipId: string;
  onSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [roleId, setRoleId] = useState(op.roleId);
  const [dept, setDept] = useState(op.departmentName ?? "");
  const [qty, setQty] = useState(String(op.quantity));
  const [hrs, setHrs] = useState(String(op.allocatedHoursPerDay));
  const [rate, setRate] = useState((op.dayRatePence / 100).toFixed(2));

  const update = trpc.dayRates.updateOperative.useMutation({ onSuccess: () => { setExpanded(false); onSaved(); } });
  const remove = trpc.dayRates.removeOperative.useMutation({ onSuccess: onSaved });

  function handleSave() {
    const rp = parsePounds(rate);
    const q = parseInt(qty);
    const h = parseFloat(hrs);
    if (rp == null || isNaN(q) || isNaN(h)) return;
    update.mutate({ id: op.id, roleId, departmentName: dept || null, quantity: q, allocatedHoursPerDay: h, dayRatePence: rp });
  }

  const weeklyTotal = op.dayRatePence * op.quantity * 5; // 5 days

  return (
    <div className="rounded-xl border border-line bg-white">
      {/* Summary row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-xs font-bold text-navy">
          ×{op.quantity}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy">{op.role.name}</p>
          <p className="text-xs text-slate-400">
            {op.departmentName ? `${op.departmentName} · ` : ""}{op.allocatedHoursPerDay}h/day · {pence(op.dayRatePence)}/day each
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-navy">{pence(op.dayRatePence * op.quantity)}<span className="text-xs font-normal text-slate-400">/day</span></p>
          <p className="text-[10px] text-slate-400">{pence(weeklyTotal)} est/wk</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border border-line p-1.5 text-slate transition hover:border-cyan hover:text-cyan">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => remove.mutate({ id: op.id })} disabled={remove.isPending}
            className="rounded-lg border border-line p-1.5 text-slate transition hover:border-red-400 hover:text-red-500 disabled:opacity-40">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {expanded && (
        <div className="border-t border-line bg-offwhite/50 px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)}
                className="h-9 rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan">
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Department">
              <TextInput value={dept} onChange={setDept} placeholder="e.g. Sales, Service" />
            </Field>
            <Field label="Quantity">
              <NumberInput value={qty} onChange={setQty} min={1} step={1} placeholder="1" />
            </Field>
            <Field label="Allocated hrs/day">
              <NumberInput value={hrs} onChange={setHrs} min={0.5} step={0.5} placeholder="8" />
            </Field>
            <Field label="Day rate per operative">
              <PoundInput value={rate} onChange={setRate} />
            </Field>
          </div>
          <SaveCancel onSave={handleSave} onCancel={() => setExpanded(false)} saving={update.isPending} />
        </div>
      )}
    </div>
  );
}

// ─── Add Operative Form ───────────────────────────────────────────────────────

function AddOperativeForm({
  dealershipId, roles, onSaved, onCancel,
}: {
  dealershipId: string;
  roles: { id: string; name: string }[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [dept, setDept] = useState("");
  const [qty, setQty] = useState("1");
  const [hrs, setHrs] = useState("8");
  const [rate, setRate] = useState("");

  const add = trpc.dayRates.addOperative.useMutation({ onSuccess: onSaved });

  function handleSave() {
    const rp = parsePounds(rate);
    const q = parseInt(qty);
    const h = parseFloat(hrs);
    if (!roleId || rp == null || isNaN(q) || isNaN(h)) return;
    add.mutate({ dealershipId, roleId, departmentName: dept || undefined, quantity: q, allocatedHoursPerDay: h, dayRatePence: rp });
  }

  return (
    <div className="rounded-xl border border-cyan/40 bg-cyan/5 px-4 pb-4 pt-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">New Operative</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Role">
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)}
            className="h-9 rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan">
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Department">
          <TextInput value={dept} onChange={setDept} placeholder="e.g. Sales, Service" />
        </Field>
        <Field label="Quantity">
          <NumberInput value={qty} onChange={setQty} min={1} step={1} placeholder="1" />
        </Field>
        <Field label="Allocated hrs/day">
          <NumberInput value={hrs} onChange={setHrs} min={0.5} step={0.5} placeholder="8" />
        </Field>
        <Field label="Day rate per operative">
          <PoundInput value={rate} onChange={setRate} placeholder="0.00" />
        </Field>
      </div>
      <p className="text-[10px] text-slate-500">
        Allocated hours are measured against actual booked work each week.
      </p>
      <SaveCancel onSave={handleSave} onCancel={onCancel} saving={add.isPending} disabled={!roleId || !rate} />
    </div>
  );
}

// ─── Weekly Task Card ─────────────────────────────────────────────────────────

type WeeklyTask = {
  id: string;
  description: string;
  allocatedHoursPerWeek: number;
  weeklyRatePence: number;
};

function WeeklyTaskCard({ task, onSaved }: { task: WeeklyTask; onSaved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [desc, setDesc] = useState(task.description);
  const [hrs, setHrs] = useState(String(task.allocatedHoursPerWeek));
  const [rate, setRate] = useState((task.weeklyRatePence / 100).toFixed(2));

  const update = trpc.dayRates.updateWeeklyTask.useMutation({ onSuccess: () => { setExpanded(false); onSaved(); } });
  const remove = trpc.dayRates.removeWeeklyTask.useMutation({ onSuccess: onSaved });

  function handleSave() {
    const rp = parsePounds(rate);
    const h = parseFloat(hrs);
    if (!desc.trim() || rp == null || isNaN(h)) return;
    update.mutate({ id: task.id, description: desc.trim(), allocatedHoursPerWeek: h, weeklyRatePence: rp });
  }

  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy">{task.description}</p>
          <p className="text-xs text-slate-400">{task.allocatedHoursPerWeek}h allocated/week</p>
        </div>
        <p className="shrink-0 text-sm font-bold text-navy">{pence(task.weeklyRatePence)}<span className="text-xs font-normal text-slate-400">/wk</span></p>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border border-line p-1.5 text-slate transition hover:border-cyan hover:text-cyan">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => remove.mutate({ id: task.id })} disabled={remove.isPending}
            className="rounded-lg border border-line p-1.5 text-slate transition hover:border-red-400 hover:text-red-500 disabled:opacity-40">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-line bg-offwhite/50 px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Description">
                <TextInput value={desc} onChange={setDesc} placeholder="e.g. Workshop Cleaning" />
              </Field>
            </div>
            <Field label="Allocated hrs/week">
              <NumberInput value={hrs} onChange={setHrs} min={0.5} step={0.5} />
            </Field>
            <Field label="Weekly charge">
              <PoundInput value={rate} onChange={setRate} />
            </Field>
          </div>
          <SaveCancel onSave={handleSave} onCancel={() => setExpanded(false)} saving={update.isPending} />
        </div>
      )}
    </div>
  );
}

// ─── Add Weekly Task Form ─────────────────────────────────────────────────────

function AddWeeklyTaskForm({
  dealershipId, onSaved, onCancel,
}: {
  dealershipId: string; onSaved: () => void; onCancel: () => void;
}) {
  const [desc, setDesc] = useState("");
  const [hrs, setHrs] = useState("1");
  const [rate, setRate] = useState("");

  const add = trpc.dayRates.addWeeklyTask.useMutation({ onSuccess: onSaved });

  function handleSave() {
    const rp = parsePounds(rate);
    const h = parseFloat(hrs);
    if (!desc.trim() || rp == null || isNaN(h)) return;
    add.mutate({ dealershipId, description: desc.trim(), allocatedHoursPerWeek: h, weeklyRatePence: rp });
  }

  return (
    <div className="rounded-xl border border-orange-300/50 bg-orange-50/50 px-4 pb-4 pt-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">New Weekly Task</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Description">
            <TextInput value={desc} onChange={setDesc} placeholder="e.g. Workshop Cleaning, Driver duties" />
          </Field>
        </div>
        <Field label="Allocated hrs/week">
          <NumberInput value={hrs} onChange={setHrs} min={0.5} step={0.5} placeholder="1" />
        </Field>
        <Field label="Weekly charge to dealer">
          <PoundInput value={rate} onChange={setRate} placeholder="0.00" />
        </Field>
      </div>
      <p className="text-[10px] text-slate-500">
        Repeats every week on the timesheet automatically.
      </p>
      <SaveCancel onSave={handleSave} onCancel={onCancel} saving={add.isPending} disabled={!desc.trim() || !rate} />
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function DealerDayRatesTab({ dealershipId }: { dealershipId: string }) {
  const [addingOperative, setAddingOperative] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const rolesQ     = trpc.dayRates.listRoles.useQuery();
  const opsQ       = trpc.dayRates.listOperatives.useQuery({ dealershipId });
  const tasksQ     = trpc.dayRates.listWeeklyTasks.useQuery({ dealershipId });

  const addRole = trpc.dayRates.addRole.useMutation({
    onSuccess: () => { setNewRoleName(""); setAddingRole(false); rolesQ.refetch(); },
  });

  const roles      = rolesQ.data ?? [];
  const operatives = opsQ.data ?? [];
  const tasks      = tasksQ.data ?? [];

  // Summary totals
  const totalDailyCharge = operatives.reduce((s, o) => s + o.dayRatePence * o.quantity, 0);
  const totalWeeklyTasks = tasks.reduce((s, t) => s + t.weeklyRatePence, 0);
  const totalWeeklyCharge = totalDailyCharge * 5 + totalWeeklyTasks;

  function refreshOps()   { opsQ.refetch(); }
  function refreshTasks() { tasksQ.refetch(); }

  return (
    <div className="space-y-6">

      {/* Summary banner */}
      {(operatives.length > 0 || tasks.length > 0) && (
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-line bg-offwhite px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Daily charge</p>
            <p className="text-base font-bold text-navy">{pence(totalDailyCharge)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Weekly extras</p>
            <p className="text-base font-bold text-navy">{pence(totalWeeklyTasks)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Est. weekly total</p>
            <p className="text-base font-bold text-cyan-700">{pence(totalWeeklyCharge)}</p>
          </div>
        </div>
      )}

      {/* ── Operatives ──────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-navy" />
            <h3 className="text-sm font-bold text-navy">Operatives</h3>
          </div>
          {!addingOperative && (
            <button
              onClick={() => setAddingOperative(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy/80"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Operative
            </button>
          )}
        </div>

        {opsQ.isLoading && <p className="text-sm text-slate-400">Loading…</p>}

        {operatives.length === 0 && !opsQ.isLoading && !addingOperative && (
          <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-slate-400">
            No operatives added yet. Use Add Operative to define staffing for this site.
          </p>
        )}

        {operatives.map((op) => (
          <OperativeCard key={op.id} op={op} roles={roles} dealershipId={dealershipId} onSaved={refreshOps} />
        ))}

        {addingOperative && (
          <AddOperativeForm
            dealershipId={dealershipId}
            roles={roles}
            onSaved={() => { setAddingOperative(false); refreshOps(); }}
            onCancel={() => setAddingOperative(false)}
          />
        )}

        {/* Custom role adder */}
        <div className="pt-1">
          {addingRole ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newRoleName.trim()) addRole.mutate({ name: newRoleName });
                  if (e.key === "Escape") { setAddingRole(false); setNewRoleName(""); }
                }}
                placeholder="New role name e.g. Specialist Detailer"
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
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-cyan">
              <PlusCircle className="h-3.5 w-3.5" /> Add custom role type
            </button>
          )}
        </div>
      </section>

      {/* ── Weekly Tasks ────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-navy" />
            <h3 className="text-sm font-bold text-navy">Additional Weekly Work</h3>
          </div>
          {!addingTask && (
            <button
              onClick={() => setAddingTask(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-400 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-50"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Weekly Task
            </button>
          )}
        </div>

        {tasksQ.isLoading && <p className="text-sm text-slate-400">Loading…</p>}

        {tasks.length === 0 && !tasksQ.isLoading && !addingTask && (
          <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-slate-400">
            No weekly tasks. Add recurring work like workshop cleaning or driver duties.
          </p>
        )}

        {tasks.map((t) => (
          <WeeklyTaskCard key={t.id} task={t} onSaved={refreshTasks} />
        ))}

        {addingTask && (
          <AddWeeklyTaskForm
            dealershipId={dealershipId}
            onSaved={() => { setAddingTask(false); refreshTasks(); }}
            onCancel={() => setAddingTask(false)}
          />
        )}
      </section>

    </div>
  );
}
