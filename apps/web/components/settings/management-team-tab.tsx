"use client";

import { useState } from "react";
import { UserPlus, Power, Pencil, X, Check, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

type MgmtRole = "ADMINISTRATION" | "ACCOUNTANT" | "ACCOUNT_MANAGER" | "COO" | "CEO";

const ROLE_LABELS: Record<MgmtRole, string> = {
  ADMINISTRATION: "Administration",
  ACCOUNTANT: "Accountant",
  ACCOUNT_MANAGER: "Account Manager",
  COO: "COO",
  CEO: "CEO",
};

// Permission matrix — what each role can access
const PERMISSIONS: Array<{
  area: string;
  description: string;
  roles: MgmtRole[];
}> = [
  { area: "Platform Dashboard",     description: "Overview stats, ops summary",          roles: ["ADMINISTRATION","ACCOUNTANT","ACCOUNT_MANAGER","COO","CEO"] },
  { area: "Head Offices",           description: "View and manage head offices",          roles: ["ADMINISTRATION","ACCOUNT_MANAGER","COO","CEO"] },
  { area: "Dealerships",            description: "View and manage dealerships",           roles: ["ADMINISTRATION","ACCOUNT_MANAGER","COO","CEO"] },
  { area: "Valeting Team",          description: "View valeters and their details",       roles: ["ADMINISTRATION","COO","CEO"] },
  { area: "Payroll",                description: "Access payroll and pay runs",           roles: ["ACCOUNTANT","COO","CEO"] },
  { area: "Attendance (Approve)",   description: "Final SA approval of timesheets",       roles: ["ADMINISTRATION","COO","CEO"] },
  { area: "Reports",                description: "Platform-wide reporting",               roles: ["ACCOUNTANT","ACCOUNT_MANAGER","COO","CEO"] },
  { area: "Quote Builder",          description: "Create and manage quotes",              roles: ["ACCOUNT_MANAGER","COO","CEO"] },
  { area: "Broadcast",              description: "Send platform-wide messages",           roles: ["ADMINISTRATION","COO","CEO"] },
  { area: "Platform Settings",      description: "System config, flags, integrations",   roles: ["COO","CEO"] },
  { area: "Impersonate User",       description: "Preview dealer/org portal",            roles: ["ADMINISTRATION","COO","CEO"] },
  { area: "Management Team",        description: "Add/remove management users",          roles: ["COO","CEO"] },
];

const TH = "px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left bg-slate-50";
const TD = "px-4 py-3 text-sm border-b border-slate-50";

const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

const ROLE_COLORS: Record<MgmtRole, string> = {
  CEO:            "bg-purple-100 text-purple-700",
  COO:            "bg-indigo-100 text-indigo-700",
  ACCOUNT_MANAGER:"bg-blue-100 text-blue-700",
  ACCOUNTANT:     "bg-amber-100 text-amber-700",
  ADMINISTRATION: "bg-slate-100 text-slate-700",
};

function RoleBadge({ role }: { role: MgmtRole | null }) {
  if (!role) return <span className="text-slate-400">—</span>;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

export function ManagementTeamTab() {
  const [showAdd, setShowAdd] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const utils = trpc.useUtils();

  const list = trpc.users.listManagementTeam.useQuery();
  const create = trpc.users.createManagementUser.useMutation({
    onSuccess: () => { utils.users.listManagementTeam.invalidate(); setShowAdd(false); },
  });
  const deactivate = trpc.users.deactivateManagementUser.useMutation({
    onSuccess: () => utils.users.listManagementTeam.invalidate(),
  });
  const update = trpc.users.updateManagementUser.useMutation({
    onSuccess: () => utils.users.listManagementTeam.invalidate(),
  });

  const members = list.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Management Team</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Internal Total Valeting staff with platform access. Each role has a defined permission set.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPermissions((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {showPermissions ? "Hide" : "View"} permissions
          </button>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <UserPlus className="h-4 w-4" />
            Add member
          </button>
        </div>
      </div>

      {/* Permission matrix */}
      {showPermissions && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-bold text-slate-900">Role Permission Matrix</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className={TH}>Area</th>
                  {(Object.keys(ROLE_LABELS) as MgmtRole[]).map((r) => (
                    <th key={r} className={`${TH} text-center`}>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[r]}`}>
                        {ROLE_LABELS[r]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.area} className="hover:bg-slate-50/50">
                    <td className={TD}>
                      <div className="font-medium text-slate-900">{p.area}</div>
                      <div className="text-xs text-slate-400">{p.description}</div>
                    </td>
                    {(Object.keys(ROLE_LABELS) as MgmtRole[]).map((r) => (
                      <td key={r} className={`${TD} text-center`}>
                        {p.roles.includes(r) ? (
                          <Check className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <AddMemberForm
          onSave={(d) => create.mutate(d)}
          onCancel={() => setShowAdd(false)}
          saving={create.isPending}
          error={create.error?.message}
        />
      )}

      {/* Team table */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        {list.isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <UserPlus className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No management team members yet.</p>
            <p className="text-xs text-slate-400">Add your first member using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={TH}>Name</th>
                  <th className={TH}>Email</th>
                  <th className={TH}>Role</th>
                  <th className={TH}>Mobile</th>
                  <th className={TH}>Job Title</th>
                  <th className={TH}>Last Login</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    onDeactivate={() => deactivate.mutate({ id: m.id })}
                    onUpdate={(data) => update.mutate({ id: m.id, ...data, managementRole: data.managementRole ?? undefined })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add member form ────────────────────────────────────────────────────────

type AddForm = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  managementRole: MgmtRole;
  mobile: string;
  jobTitle: string;
};

function AddMemberForm({
  onSave,
  onCancel,
  saving,
  error,
}: {
  onSave: (d: { email: string; firstName: string; lastName: string; password: string; managementRole: MgmtRole; mobile?: string; jobTitle?: string }) => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
}) {
  const [form, setForm] = useState<AddForm>({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    managementRole: "ADMINISTRATION",
    mobile: "",
    jobTitle: "",
  });

  const set = (k: keyof AddForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-slate-900">Add Management Member</h3>
        <button onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">First name</label>
          <input className={inputCls} value={form.firstName} onChange={set("firstName")} placeholder="First name" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Last name</label>
          <input className={inputCls} value={form.lastName} onChange={set("lastName")} placeholder="Last name" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Email address</label>
          <input className={inputCls} type="email" value={form.email} onChange={set("email")} placeholder="name@totalvaleting.co.uk" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
          <input className={inputCls} type="password" value={form.password} onChange={set("password")} placeholder="Min. 6 characters" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Management role</label>
          <select className={inputCls} value={form.managementRole} onChange={set("managementRole")}>
            {(Object.entries(ROLE_LABELS) as [MgmtRole, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Job title <span className="text-slate-400">(optional)</span></label>
          <input className={inputCls} value={form.jobTitle} onChange={set("jobTitle")} placeholder="e.g. Finance Director" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Mobile <span className="text-slate-400">(optional)</span></label>
          <input className={inputCls} type="tel" value={form.mobile} onChange={set("mobile")} placeholder="+44 7700 000000" />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="h-9 rounded-lg border border-slate-200 px-4 text-sm text-slate-500 hover:bg-slate-50">
          Cancel
        </button>
        <button
          onClick={() =>
            onSave({
              ...form,
              mobile: form.mobile || undefined,
              jobTitle: form.jobTitle || undefined,
            })
          }
          disabled={saving || !form.email || !form.firstName || !form.lastName || !form.password}
          className="h-9 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add member"}
        </button>
      </div>
    </div>
  );
}

// ── Member row ─────────────────────────────────────────────────────────────

type MemberData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string | null;
  jobTitle: string | null;
  managementRole: MgmtRole | null;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
};

function MemberRow({
  member,
  onDeactivate,
  onUpdate,
}: {
  member: MemberData;
  onDeactivate: () => void;
  onUpdate: (data: Partial<MemberData>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    mobile: member.mobile ?? "",
    jobTitle: member.jobTitle ?? "",
    managementRole: member.managementRole ?? "ADMINISTRATION" as MgmtRole,
  });

  const fmtDate = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : "Never";

  if (editing) {
    return (
      <tr className="bg-slate-50">
        <td className={TD}>
          <div className="flex gap-1.5">
            <input
              className="h-8 w-28 rounded border border-slate-200 px-2 text-xs"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
            <input
              className="h-8 w-28 rounded border border-slate-200 px-2 text-xs"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
        </td>
        <td className={TD}>
          <input
            className="h-8 w-44 rounded border border-slate-200 px-2 text-xs"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </td>
        <td className={TD}>
          <select
            className="h-8 rounded border border-slate-200 px-2 text-xs"
            value={form.managementRole}
            onChange={(e) => setForm((f) => ({ ...f, managementRole: e.target.value as MgmtRole }))}
          >
            {(Object.entries(ROLE_LABELS) as [MgmtRole, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </td>
        <td className={TD}>
          <input
            className="h-8 w-32 rounded border border-slate-200 px-2 text-xs"
            value={form.mobile}
            onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
          />
        </td>
        <td className={TD}>
          <input
            className="h-8 w-36 rounded border border-slate-200 px-2 text-xs"
            value={form.jobTitle}
            onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
          />
        </td>
        <td className={TD}>{fmtDate(member.lastLoginAt)}</td>
        <td className={TD}>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                onUpdate({
                  firstName: form.firstName,
                  lastName: form.lastName,
                  email: form.email,
                  mobile: form.mobile || null,
                  jobTitle: form.jobTitle || null,
                  managementRole: form.managementRole,
                });
                setEditing(false);
              }}
              className="rounded bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50/50">
      <td className={`${TD} font-medium text-slate-900`}>
        {member.firstName} {member.lastName}
      </td>
      <td className={`${TD} text-slate-600`}>{member.email}</td>
      <td className={TD}>
        <RoleBadge role={member.managementRole} />
      </td>
      <td className={`${TD} text-slate-600`}>{member.mobile ?? "—"}</td>
      <td className={`${TD} text-slate-600`}>{member.jobTitle ?? "—"}</td>
      <td className={`${TD} text-slate-500`}>{fmtDate(member.lastLoginAt)}</td>
      <td className={TD}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setEditing(true)}
            title="Edit"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDeactivate}
            title="Deactivate"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            <Power className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
