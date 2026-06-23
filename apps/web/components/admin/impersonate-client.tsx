"use client";

import { useState } from "react";
import type { Role } from "@ivaleter/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { startImpersonation } from "@/app/admin/impersonate/actions";

export interface OrgUsers {
  organisationId: string;
  organisationName: string;
  users: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    siteId: string | null;
  }[];
}

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-slate-900 text-white border-slate-900",
  org_admin: "bg-blue-50 text-blue-600 border-blue-200",
  dealership_user: "bg-amber-50 text-amber-700 border-amber-200",
  valeter: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function ImpersonateClient({ orgs }: { orgs: OrgUsers[] }) {
  const [query, setQuery] = useState("");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Impersonate User"
        subtitle="View the app exactly as another user sees it. A banner will let you exit at any time."
      />

      <input
        type="search"
        placeholder="Search by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-6 h-10 w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400"
      />

      <div className="space-y-6">
        {orgs.map((org) => {
          const users = org.users.filter((u) => {
            const q = query.toLowerCase();
            return (
              `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q)
            );
          });
          if (users.length === 0) return null;
          return (
            <div key={org.organisationId}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {org.organisationName}
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                          ROLE_BADGE[u.role] ??
                          "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role.replace("_", " ")}
                      </span>
                      <form
                        action={startImpersonation.bind(null, {
                          userId: u.id,
                          organisationId: org.organisationId,
                          siteId: u.siteId,
                          role: u.role,
                          email: u.email,
                          firstName: u.firstName,
                          lastName: u.lastName,
                        })}
                      >
                        <button
                          type="submit"
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                        >
                          View as
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
