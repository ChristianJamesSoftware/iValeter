"use client";

import { useState } from "react";
import { Power, Search, Mail, Phone, Building2, MapPin, UserPlus, X } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function AddDealershipUserModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    jobTitle: "",
    mobile: "",
    organisationId: "",
    siteId: "",
  });

  const orgsQ = trpc.organisations.listAll.useQuery();
  const sitesQ = trpc.sites.listByOrg.useQuery(
    { organisationId: form.organisationId },
    { enabled: !!form.organisationId },
  );

  const orgs = orgsQ.data ?? [];
  const sites = sitesQ.data ?? [];

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => {
      const next = { ...f, [k]: e.target.value };
      if (k === "organisationId") next.siteId = "";
      return next;
    });
  };

  const create = trpc.users.superAdminCreate.useMutation({
    onSuccess: async () => {
      await utils.users.listAllDealershipUsers.invalidate();
      onClose();
    },
  });

  const canSubmit =
    !create.isPending &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.password.length >= 6 &&
    form.organisationId &&
    form.siteId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Dealership User</h2>
            <p className="text-xs text-slate-400">Create a new customer portal login</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Organisation */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Organisation
            </label>
            <select className={inputCls} value={form.organisationId} onChange={set("organisationId")}>
              <option value="">Select organisation…</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {/* Site */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Site
            </label>
            <select
              className={inputCls}
              value={form.siteId}
              onChange={set("siteId")}
              disabled={!form.organisationId || sitesQ.isLoading}
            >
              <option value="">
                {!form.organisationId ? "Select organisation first…" : sitesQ.isLoading ? "Loading…" : sites.length === 0 ? "No sites found" : "Select site…"}
              </option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">First name</label>
            <input className={inputCls} value={form.firstName} onChange={set("firstName")} placeholder="First name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Last name</label>
            <input className={inputCls} value={form.lastName} onChange={set("lastName")} placeholder="Last name" />
          </div>

          {/* Email */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email address</label>
            <input className={inputCls} type="email" value={form.email} onChange={set("email")} placeholder="name@dealership.co.uk" />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Password</label>
            <input className={inputCls} type="password" value={form.password} onChange={set("password")} placeholder="Min. 6 characters" />
          </div>

          {/* Mobile */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mobile <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <input className={inputCls} type="tel" value={form.mobile} onChange={set("mobile")} placeholder="07700 000000" />
          </div>

          {/* Job title */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Job title <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <input className={inputCls} value={form.jobTitle} onChange={set("jobTitle")} placeholder="e.g. Sales Manager" />
          </div>
        </div>

        {create.error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {create.error.message}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            disabled={!canSubmit}
            onClick={() =>
              create.mutate({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                password: form.password,
                role: "dealership_user",
                organisationId: form.organisationId,
                siteId: form.siteId,
                jobTitle: form.jobTitle.trim() || undefined,
                mobile: form.mobile.trim() || undefined,
              })
            }
            className="h-10 flex-1 rounded-lg bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 sm:flex-none sm:px-6"
          >
            {create.isPending ? "Creating…" : "Create user"}
          </button>
          <button
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminClientsList() {
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const utils = trpc.useUtils();
  const query = trpc.users.listAllDealershipUsers.useQuery({ showInactive });

  const toggleActive = trpc.users.update.useMutation({
    onSuccess: () => utils.users.listAllDealershipUsers.invalidate(),
  });

  const users = (query.data ?? []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.site?.name ?? "").toLowerCase().includes(q) ||
      (u.organisation?.name ?? "").toLowerCase().includes(q) ||
      (u.jobTitle ?? "").toLowerCase().includes(q)
    );
  });

  // Group by organisation
  const byOrg = new Map<string, { orgName: string; users: typeof users }>();
  for (const u of users) {
    const orgId   = u.organisation?.id   ?? "unknown";
    const orgName = u.organisation?.name ?? "Unknown";
    if (!byOrg.has(orgId)) byOrg.set(orgId, { orgName, users: [] });
    byOrg.get(orgId)!.users.push(u);
  }

  if (query.isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {showAdd && <AddDealershipUserModal onClose={() => setShowAdd(false)} />}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, site…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </div>

        {/* Active / All toggle */}
        <div className="flex items-center rounded-lg border border-slate-200 p-0.5 text-xs font-semibold">
          <button
            onClick={() => setShowInactive(false)}
            className={cn(
              "rounded-md px-3 py-1.5 transition",
              !showInactive ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700",
            )}
          >
            Active
          </button>
          <button
            onClick={() => setShowInactive(true)}
            className={cn(
              "rounded-md px-3 py-1.5 transition",
              showInactive ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700",
            )}
          >
            All
          </button>
        </div>

        <span className="text-xs text-slate-400 flex-1">
          {users.length} user{users.length !== 1 ? "s" : ""}
        </span>

        {/* Add button */}
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <UserPlus className="h-4 w-4" />
          Add Dealership User
        </button>
      </div>

      {users.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-200" />
          <p className="text-sm font-semibold text-slate-400">No clients found</p>
          {search && (
            <p className="mt-1 text-xs text-slate-400">Try a different search term</p>
          )}
        </div>
      )}

      {/* Grouped by organisation */}
      {[...byOrg.entries()].map(([orgId, { orgName, users: orgUsers }]) => (
        <div key={orgId} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Org header */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">{orgName}</span>
            <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {orgUsers.length}
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-2.5 text-left">Name</th>
                <th className="px-5 py-2.5 text-left">Contact</th>
                <th className="px-5 py-2.5 text-left">Site</th>
                <th className="px-5 py-2.5 text-left">Role / Title</th>
                <th className="px-5 py-2.5 text-left">Last Login</th>
                <th className="px-5 py-2.5 text-left">Joined</th>
                <th className="px-5 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {orgUsers.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                >
                  {/* Name */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-5 py-3">
                    <div className="space-y-0.5">
                      <a
                        href={`mailto:${u.email}`}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3 w-3" /> {u.email}
                      </a>
                      {u.mobile && (
                        <a
                          href={`tel:${u.mobile}`}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3 w-3" /> {u.mobile}
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Site */}
                  <td className="px-5 py-3">
                    {u.site ? (
                      <span className="flex items-center gap-1 text-xs text-slate-600">
                        <MapPin className="h-3 w-3 text-slate-400" /> {u.site.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>

                  {/* Role / Job title */}
                  <td className="px-5 py-3">
                    <span className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      u.role === "management"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-slate-100 text-slate-500",
                    )}>
                      {u.role === "management" ? "Manager" : "Dealer User"}
                    </span>
                    {u.jobTitle && (
                      <p className="mt-0.5 text-xs text-slate-400">{u.jobTitle}</p>
                    )}
                  </td>

                  {/* Last login */}
                  <td className="px-5 py-3">
                    <span className="text-xs text-slate-500">{fmtDate(u.lastLoginAt)}</span>
                  </td>

                  {/* Joined */}
                  <td className="px-5 py-3">
                    <span className="text-xs text-slate-500">{fmtDate(u.createdAt)}</span>
                  </td>

                  {/* Status toggle */}
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() =>
                        toggleActive.mutate({ id: u.id, isActive: !u.isActive })
                      }
                      disabled={toggleActive.isPending}
                      title={u.isActive ? "Suspend access" : "Re-enable access"}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition",
                        u.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          : "border-slate-200 bg-slate-100 text-slate-400 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
                      )}
                    >
                      <Power className="h-3 w-3" />
                      {u.isActive ? "Active" : "Suspended"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
