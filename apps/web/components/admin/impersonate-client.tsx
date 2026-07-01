"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Building2, ChevronDown, ChevronRight, ExternalLink, MapPin, Search } from "lucide-react";
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

interface PreviewUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organisationId: string;
  siteId: string | null;
}

interface SiteItem {
  id: string;
  name: string;
  previewUser: PreviewUser | null;
}

interface DealershipItem {
  id: string;
  name: string;
  organisationId: string;
  organisationName: string;
  sites: SiteItem[];
}

const ROLE_BADGE: Record<string, string> = {
  super_admin:      "bg-slate-900 text-white border-slate-900",
  org_admin:        "bg-blue-50 text-blue-600 border-blue-200",
  dealership_user:  "bg-amber-50 text-amber-700 border-amber-200",
  valeter:          "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function ImpersonateClient({
  orgs,
  dealerships,
}: {
  orgs: OrgUsers[];
  dealerships: DealershipItem[];
}) {
  const [userQuery, setUserQuery]   = useState("");
  const [dealerQuery, setDealerQuery] = useState("");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [pending, startTransition]  = useTransition();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // ── Dealer preview helpers ─────────────────────────────────────────────────

  const filteredDealers = dealerships.filter((d) => {
    const q = dealerQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.organisationName.toLowerCase().includes(q);
  });

  const groupedDealers = filteredDealers.reduce<Record<string, DealershipItem[]>>((acc, d) => {
    const key = d.organisationName;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(d);
    return acc;
  }, {});

  function handlePreview(site: SiteItem, dealershipId: string) {
    if (!site.previewUser || pending) return;
    setLoadingKey(`${dealershipId}-${site.id}`);
    startTransition(async () => {
      await startImpersonation({
        userId: site.previewUser!.id,
        organisationId: site.previewUser!.organisationId,
        siteId: site.previewUser!.siteId ?? null,
        role: site.previewUser!.role as Role,
        email: site.previewUser!.email,
        firstName: site.previewUser!.firstName,
        lastName: site.previewUser!.lastName,
      });
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PageHeader
        title="Impersonate User"
        subtitle="View the app exactly as another user sees it. A banner will let you exit at any time."
      />

      {/* ── Section 1: Preview Dealer Site ──────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Preview Dealer Site</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter any dealer site directly. If no site user exists yet, you enter as super admin.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search dealership or head office…"
            value={dealerQuery}
            onChange={(e) => setDealerQuery(e.target.value)}
            className="h-9 w-full max-w-sm rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400"
          />
        </div>

        {Object.keys(groupedDealers).length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No dealerships found</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDealers).map(([hoName, items]) => (
              <div key={hoName}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{hoName}</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {items.map((d, idx) => {
                    const singleSite  = d.sites.length === 1 ? d.sites[0] : null;
                    const multiSite   = d.sites.length > 1;
                    const isExpanded  = expanded === d.id;
                    const isLast      = idx === items.length - 1;
                    const hasAnyUser  = d.sites.some((s) => s.previewUser);

                    return (
                      <div key={d.id} className={!isLast ? "border-b border-slate-100" : ""}>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{d.name}</p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {d.sites.length === 0
                                ? "No sites set up"
                                : !hasAnyUser
                                ? "No site users — will enter as super admin"
                                : singleSite?.previewUser
                                ? `Preview as ${singleSite.previewUser.firstName} ${singleSite.previewUser.lastName}`
                                : `${d.sites.length} sites — pick one`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* No site users → direct super admin entry to /dealership */}
                            {!hasAnyUser && (
                              <Link
                                href="/dealership"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Enter as admin
                              </Link>
                            )}

                            {/* Single site with user → direct impersonate */}
                            {singleSite?.previewUser && (() => {
                              const key = `${d.id}-${singleSite.id}`;
                              const isLoading = loadingKey === key && pending;
                              return (
                                <button
                                  onClick={() => handlePreview(singleSite, d.id)}
                                  disabled={isLoading || pending}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                                >
                                  {isLoading ? "Loading…" : <><ExternalLink className="h-3.5 w-3.5" />Preview</>}
                                </button>
                              );
                            })()}

                            {/* Multi-site → expand */}
                            {multiSite && (
                              <button
                                onClick={() => setExpanded(isExpanded ? null : d.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                {isExpanded ? "Hide" : "Choose site"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Multi-site expanded rows */}
                        {multiSite && isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50">
                            {d.sites.map((site, sIdx) => {
                              const key = `${d.id}-${site.id}`;
                              const isLoading = loadingKey === key && pending;
                              return (
                                <div
                                  key={site.id}
                                  className={`flex items-center justify-between px-6 py-2.5 ${sIdx !== d.sites.length - 1 ? "border-b border-slate-100" : ""}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                    <div>
                                      <p className="text-xs font-medium text-slate-700">{site.name}</p>
                                      <p className="text-xs text-slate-400">
                                        {site.previewUser
                                          ? `Preview as ${site.previewUser.firstName} ${site.previewUser.lastName}`
                                          : "No user — will enter as admin"}
                                      </p>
                                    </div>
                                  </div>
                                  {site.previewUser ? (
                                    <button
                                      onClick={() => handlePreview(site, d.id)}
                                      disabled={isLoading || pending}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                                    >
                                      {isLoading ? "Loading…" : <><ExternalLink className="h-3.5 w-3.5" />Preview</>}
                                    </button>
                                  ) : (
                                    <Link
                                      href="/dealership"
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      Enter as admin
                                    </Link>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100" />

      {/* ── Section 2: Impersonate any user ──────────────────────────────────── */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-900">Impersonate Any User</h2>
          <p className="text-xs text-slate-400 mt-0.5">View the app as a specific named user across any role.</p>
        </div>

        <input
          type="search"
          placeholder="Search by name or email…"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          className="mb-4 h-9 w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400"
        />

        <div className="space-y-6">
          {orgs.map((org) => {
            const users = org.users.filter((u) => {
              const q = userQuery.toLowerCase();
              return (
                `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q)
              );
            });
            if (users.length === 0) return null;
            return (
              <div key={org.organisationId}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {org.organisationName}
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[u.role] ?? "border-slate-200 bg-slate-100 text-slate-600"}`}>
                          {u.role.replace("_", " ")}
                        </span>
                        <form action={startImpersonation.bind(null, {
                          userId: u.id,
                          organisationId: org.organisationId,
                          siteId: u.siteId,
                          role: u.role,
                          email: u.email,
                          firstName: u.firstName,
                          lastName: u.lastName,
                        })}>
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
      </section>
    </div>
  );
}
