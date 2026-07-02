"use client";

import { useState, useMemo } from "react";
import { UserPlus, Trash2, Users } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

const inputCls =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/30";

const TH = "px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate bg-offwhite";
const TD = "px-5 py-4 text-sm border-b border-line";

function fmtDate(d: Date | null): string {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function DealershipTeamClient() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    jobTitle: "",
    mobile: "",
    siteId: "",
    departmentId: "",
  });
  const [removeId, setRemoveId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Members of this dealership
  const usersQ = trpc.users.listDealershipUsers.useQuery();

  // Caller's own dealership sites + departments (no full platform list)
  const sitesQ = trpc.users.listMyDealershipSites.useQuery();
  const sites = sitesQ.data ?? [];

  // Departments available for the currently selected site
  const departments = useMemo(() => {
    if (!form.siteId) return [];
    return sites.find((s) => s.id === form.siteId)?.departments ?? [];
  }, [sites, form.siteId]);

  // Auto-select site if there's only one
  const firstSiteId = sites.length === 1 ? sites[0]!.id : "";

  const addUser = trpc.users.addDealershipUser.useMutation({
    onSuccess: () => {
      utils.users.listDealershipUsers.invalidate();
      setShowAdd(false);
      setForm({ firstName: "", lastName: "", email: "", password: "", jobTitle: "", mobile: "", siteId: firstSiteId, departmentId: "" });
    },
  });

  const removeUser = trpc.users.removeDealershipUser.useMutation({
    onSuccess: () => {
      utils.users.listDealershipUsers.invalidate();
      setRemoveId(null);
    },
  });

  const members = usersQ.data ?? [];

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => {
      const next = { ...f, [k]: e.target.value };
      // Reset department when site changes
      if (k === "siteId") next.departmentId = "";
      return next;
    });
  };

  // Use single site id if only one site, otherwise use form value
  const effectiveSiteId = sites.length === 1 ? (sites[0]?.id ?? "") : form.siteId;

  const canSubmit =
    !addUser.isPending &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.password.trim() &&
    effectiveSiteId;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Stats bar */}
      <div className="flex items-center gap-4 rounded-xl border border-line bg-white px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-offwhite">
          <Users className="h-5 w-5 text-slate" />
        </div>
        <div>
          <p className="text-2xl font-bold text-navy">{members.length}</p>
          <p className="text-xs text-slate">iValeter user{members.length !== 1 ? "s" : ""} at your dealership</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => {
              setForm((f) => ({ ...f, siteId: firstSiteId, departmentId: "" }));
              setShowAdd(!showAdd);
            }}
            className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/80"
          >
            <UserPlus className="h-4 w-4" />
            Add user
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
        <p className="text-sm text-blue-800">
          iValeter users at your dealership can log in to view bookings, request vehicles, and track job
          progress. Typical users include salespeople, sales managers, and heads of business.
        </p>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="rounded-xl border border-line bg-white p-6">
          <h3 className="mb-4 font-bold text-navy">Add iValeter User</h3>

          {sitesQ.isLoading ? (
            <p className="text-sm text-slate">Loading site info…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate">First name</label>
                <input className={inputCls} value={form.firstName} onChange={set("firstName")} placeholder="First name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate">Last name</label>
                <input className={inputCls} value={form.lastName} onChange={set("lastName")} placeholder="Last name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate">Email address</label>
                <input className={inputCls} type="email" value={form.email} onChange={set("email")} placeholder="name@dealership.co.uk" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate">Password</label>
                <input className={inputCls} type="password" value={form.password} onChange={set("password")} placeholder="Min. 6 characters" />
              </div>

              {/* Site — only shown if dealership has multiple sites */}
              {sites.length > 1 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate">Site</label>
                  <select className={inputCls} value={form.siteId} onChange={set("siteId")}>
                    <option value="">Select site…</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Department — from the selected site's departments */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate">
                  Department <span className="text-slate/60">(optional)</span>
                </label>
                <select
                  className={inputCls}
                  value={form.departmentId}
                  onChange={set("departmentId")}
                  disabled={!effectiveSiteId || departments.length === 0}
                >
                  <option value="">
                    {!effectiveSiteId
                      ? "Select a site first…"
                      : departments.length === 0
                      ? "No departments configured"
                      : "All departments"}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {effectiveSiteId && departments.length === 0 && (
                  <p className="mt-1 text-xs text-slate/60">
                    Departments are configured by the ops team in the dealer settings.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate">
                  Job title <span className="text-slate/60">(optional)</span>
                </label>
                <input className={inputCls} value={form.jobTitle} onChange={set("jobTitle")} placeholder="e.g. Sales Manager" />
              </div>
              <div className={sites.length > 1 ? "" : "sm:col-span-2"}>
                <label className="mb-1 block text-xs font-medium text-slate">
                  Mobile <span className="text-slate/60">(optional)</span>
                </label>
                <input className={inputCls} type="tel" value={form.mobile} onChange={set("mobile")} placeholder="+44 7700 000000" />
              </div>
            </div>
          )}

          {addUser.error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{addUser.error.message}</p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={() =>
                addUser.mutate({
                  firstName: form.firstName,
                  lastName: form.lastName,
                  email: form.email,
                  password: form.password,
                  siteId: effectiveSiteId,
                  departmentId: form.departmentId || undefined,
                  jobTitle: form.jobTitle || undefined,
                  mobile: form.mobile || undefined,
                })
              }
              disabled={!canSubmit}
              className="h-10 rounded-lg bg-navy px-6 text-sm font-semibold text-white transition hover:bg-navy/80 disabled:opacity-50"
            >
              {addUser.isPending ? "Adding…" : "Add user"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="h-10 rounded-lg border border-line px-4 text-sm text-slate hover:bg-offwhite"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Remove confirmation */}
      {removeId && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="mb-3 text-sm font-semibold text-red-800">
            Remove this user? They will immediately lose access to iValeter.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => removeUser.mutate({ id: removeId })}
              disabled={removeUser.isPending}
              className="h-9 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {removeUser.isPending ? "Removing…" : "Yes, remove"}
            </button>
            <button
              onClick={() => setRemoveId(null)}
              className="h-9 rounded-lg border border-red-200 px-4 text-sm text-red-600 hover:bg-red-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Team table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {usersQ.isLoading ? (
          <p className="px-5 py-12 text-center text-sm text-slate">Loading…</p>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <UserPlus className="h-8 w-8 text-line" />
            <p className="text-sm text-slate">No iValeter users yet.</p>
            <p className="text-xs text-slate/60">Add your first user using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={TH}>Name</th>
                  <th className={TH}>Email</th>
                  <th className={TH}>Site</th>
                  <th className={TH}>Job Title</th>
                  <th className={TH}>Mobile</th>
                  <th className={TH}>Last Login</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-offwhite/50">
                    <td className={`${TD} font-medium text-navy`}>{m.firstName} {m.lastName}</td>
                    <td className={`${TD} text-slate`}>{m.email}</td>
                    <td className={`${TD} text-slate`}>{m.site?.name ?? "—"}</td>
                    <td className={`${TD} text-slate`}>{m.jobTitle ?? "—"}</td>
                    <td className={`${TD} text-slate`}>{m.mobile ?? "—"}</td>
                    <td className={`${TD} text-slate`}>{fmtDate(m.lastLoginAt)}</td>
                    <td className={TD}>
                      <button
                        onClick={() => setRemoveId(m.id)}
                        className="rounded-lg p-1.5 text-line hover:bg-red-50 hover:text-red-500"
                        title="Remove user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
