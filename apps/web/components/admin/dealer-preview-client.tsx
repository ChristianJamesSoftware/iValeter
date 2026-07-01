"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Search, Building2, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { startImpersonation } from "@/app/admin/impersonate/actions";
import type { Role } from "@ivaleter/db";

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

interface Props {
  dealerships: DealershipItem[];
}

export function DealerPreviewClient({ dealerships }: Props) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const filtered = dealerships.filter((d) => {
    const q = query.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.organisationName.toLowerCase().includes(q)
    );
  });

  // Group by head office
  const grouped = filtered.reduce<Record<string, DealershipItem[]>>((acc, d) => {
    const key = d.organisationName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  function handlePreview(site: SiteItem, dealershipId: string) {
    if (!site.previewUser || pending) return;
    const key = `${dealershipId}-${site.id}`;
    setLoadingKey(key);
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

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Preview Dealer View"
        subtitle="Select a dealership and site to view the platform as a dealer user. A banner lets you switch or exit at any time."
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search dealership or head office…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400"
        />
      </div>

      {Object.keys(grouped).length === 0 && (
        <p className="py-12 text-center text-sm text-slate-400">
          No dealerships found
        </p>
      )}

      <div className="space-y-8">
        {Object.entries(grouped).map(([hoName, items]) => (
          <div key={hoName}>
            {/* Head office label */}
            <div className="mb-2 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {hoName}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {items.map((d, idx) => {
                const hasSites = d.sites.length > 0;
                const singleSite = d.sites.length === 1 ? d.sites[0] : null;
                const isExpanded = expanded === d.id;
                const isLast = idx === items.length - 1;

                return (
                  <div key={d.id} className={!isLast ? "border-b border-slate-100" : ""}>
                    {/* Dealership row */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{d.name}</p>
                        {!hasSites && (
                          <p className="mt-0.5 text-xs text-slate-400">No site users set up yet</p>
                        )}
                        {singleSite && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {singleSite.name} — preview as {singleSite.previewUser!.firstName}{" "}
                            {singleSite.previewUser!.lastName}
                          </p>
                        )}
                        {d.sites.length > 1 && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {d.sites.length} sites — pick one below
                          </p>
                        )}
                      </div>

                      {/* Action */}
                      {!hasSites && (
                        <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
                          <ExternalLink className="h-3.5 w-3.5" />
                          No user
                        </span>
                      )}

                      {/* Single site — direct preview */}
                      {singleSite && (() => {
                        const key = `${d.id}-${singleSite.id}`;
                        const isLoading = loadingKey === key && pending;
                        return (
                          <button
                            onClick={() => handlePreview(singleSite, d.id)}
                            disabled={isLoading || pending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isLoading ? (
                              <>
                                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                                </svg>
                                Loading…
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-3.5 w-3.5" />
                                Preview
                              </>
                            )}
                          </button>
                        );
                      })()}

                      {/* Multiple sites — expand/collapse */}
                      {d.sites.length > 1 && (
                        <button
                          onClick={() => toggleExpand(d.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          {isExpanded ? "Hide sites" : "Choose site"}
                        </button>
                      )}
                    </div>

                    {/* Site list (expanded, multi-site only) */}
                    {d.sites.length > 1 && isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50">
                        {d.sites.map((site, sIdx) => {
                          const key = `${d.id}-${site.id}`;
                          const isLoading = loadingKey === key && pending;
                          return (
                            <div
                              key={site.id}
                              className={`flex items-center justify-between px-6 py-2.5 ${
                                sIdx !== d.sites.length - 1 ? "border-b border-slate-100" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                <div>
                                  <p className="text-xs font-medium text-slate-700">{site.name}</p>
                                  {site.previewUser && (
                                    <p className="text-xs text-slate-400">
                                      Preview as {site.previewUser.firstName} {site.previewUser.lastName}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handlePreview(site, d.id)}
                                disabled={isLoading || pending}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {isLoading ? (
                                  <>
                                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                                    </svg>
                                    Loading…
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Preview
                                  </>
                                )}
                              </button>
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
    </div>
  );
}
