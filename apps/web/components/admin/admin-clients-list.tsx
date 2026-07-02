"use client";

import { useState } from "react";
import { Power, Search, Mail, Phone, Building2, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function AdminClientsList() {
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");

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

        <span className="text-xs text-slate-400">
          {users.length} client{users.length !== 1 ? "s" : ""}
        </span>
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

                  {/* Job title */}
                  <td className="px-5 py-3">
                    <span className="text-xs text-slate-600">{u.jobTitle ?? "Dealer User"}</span>
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
