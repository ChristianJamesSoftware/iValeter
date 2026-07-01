"use client";

import { useState } from "react";
import { UserPlus, Trash2, Users } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

const TH = "px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50";
const TD = "px-5 py-4 text-sm border-b border-slate-50";

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
  });
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");

  const utils = trpc.useUtils();

  // List users on this dealership
  const users = trpc.users.listDealershipUsers.useQuery();

  // Get available sites — we query via the first user's site dealership
  const sitesQuery = trpc.sites.list.useQuery();
  const sites = sitesQuery.data ?? [];

  const addUser = trpc.users.addDealershipUser.useMutation({
    onSuccess: () => {
      utils.users.listDealershipUsers.invalidate();
      setShowAdd(false);
      setForm({ firstName: "", lastName: "", email: "", password: "", jobTitle: "", mobile: "", siteId: "" });
    },
  });

  const removeUser = trpc.users.removeDealershipUser.useMutation({
    onSuccess: () => {
      utils.users.listDealershipUsers.invalidate();
      setRemoveId(null);
      setConfirmName("");
    },
  });

  const members = users.data ?? [];

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <Users className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{members.length}</p>
          <p className="text-xs text-slate-500">iValeter user{members.length !== 1 ? "s" : ""} at your dealership</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <UserPlus className="h-4 w-4" />
            Add user
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
        <p className="text-sm text-blue-800">
          iValeter users at your dealership can log in to view bookings, request vehicles, and track job progress.
          Typical users include salespeople, sales managers, and heads of business.
        </p>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-900">Add iValeter User</h3>
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
              <input className={inputCls} type="email" value={form.email} onChange={set("email")} placeholder="name@dealership.co.uk" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
              <input className={inputCls} type="password" value={form.password} onChange={set("password")} placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Site</label>
              <select className={inputCls} value={form.siteId} onChange={set("siteId")}>
                <option value="">Select site…</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Job title <span className="text-slate-400">(optional)</span></label>
              <input className={inputCls} value={form.jobTitle} onChange={set("jobTitle")} placeholder="e.g. Sales Manager" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Mobile <span className="text-slate-400">(optional)</span></label>
              <input className={inputCls} type="tel" value={form.mobile} onChange={set("mobile")} placeholder="+44 7700 000000" />
            </div>
          </div>
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
                  siteId: form.siteId,
                  jobTitle: form.jobTitle || undefined,
                  mobile: form.mobile || undefined,
                })
              }
              disabled={
                addUser.isPending ||
                !form.firstName ||
                !form.lastName ||
                !form.email ||
                !form.password ||
                !form.siteId
              }
              className="h-10 rounded-lg bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {addUser.isPending ? "Adding…" : "Add user"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-500 hover:bg-slate-50"
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
              onClick={() => { setRemoveId(null); setConfirmName(""); }}
              className="h-9 rounded-lg border border-red-200 px-4 text-sm text-red-600 hover:bg-red-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Team table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {users.isLoading ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">Loading…</p>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <UserPlus className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No iValeter users yet.</p>
            <p className="text-xs text-slate-400">Add your first user using the button above.</p>
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
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className={`${TD} font-medium text-slate-900`}>{m.firstName} {m.lastName}</td>
                    <td className={`${TD} text-slate-600`}>{m.email}</td>
                    <td className={`${TD} text-slate-600`}>{m.site?.name ?? "—"}</td>
                    <td className={`${TD} text-slate-600`}>{m.jobTitle ?? "—"}</td>
                    <td className={`${TD} text-slate-500`}>{m.mobile ?? "—"}</td>
                    <td className={`${TD} text-slate-500`}>{fmtDate(m.lastLoginAt)}</td>
                    <td className={TD}>
                      <button
                        onClick={() => setRemoveId(m.id)}
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
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
