"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Search, Building2 } from "lucide-react";
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

interface DealershipItem {
  id: string;
  name: string;
  organisationId: string;
  organisationName: string;
  previewUser: PreviewUser | null;
}

interface Props {
  dealerships: DealershipItem[];
}

export function DealerPreviewClient({ dealerships }: Props) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

  function handlePreview(d: DealershipItem) {
    if (!d.previewUser || pending) return;
    setLoadingId(d.id);
    startTransition(async () => {
      await startImpersonation({
        userId: d.previewUser!.id,
        organisationId: d.previewUser!.organisationId,
        siteId: d.previewUser!.siteId ?? null,
        role: d.previewUser!.role as Role,
        email: d.previewUser!.email,
        firstName: d.previewUser!.firstName,
        lastName: d.previewUser!.lastName,
      });
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Preview Dealer View"
        subtitle="Select a dealership to view the platform exactly as a dealer user sees it. A banner lets you exit at any time."
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
                const hasUser = !!d.previewUser;
                const isLoading = loadingId === d.id && pending;

                return (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between px-4 py-3 ${
                      idx !== items.length - 1
                        ? "border-b border-slate-100"
                        : ""
                    }`}
                  >
                    {/* Name */}
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {d.name}
                      </p>
                      {d.previewUser && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Preview as {d.previewUser.firstName}{" "}
                          {d.previewUser.lastName}
                        </p>
                      )}
                      {!d.previewUser && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          No dealer user set up yet
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    {hasUser ? (
                      <button
                        onClick={() => handlePreview(d)}
                        disabled={isLoading || pending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <svg
                              className="h-3.5 w-3.5 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
                              />
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
                    ) : (
                      <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
                        <ExternalLink className="h-3.5 w-3.5" />
                        No user
                      </span>
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
