"use client";

import { useState } from "react";
import Link from "next/link";
import { Power, PlusCircle, Search, Building2, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { AddDealershipModal } from "@/components/admin/add-dealership-modal";

// ── Shared styles ───────────────────────────────────────────────────────────
const TH = "px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400";
const BADGE_ACTIVE   = "rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700";
const BADGE_INACTIVE = "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500";

// ── Tab: Head Offices ───────────────────────────────────────────────────────
function HeadOfficesTab() {
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();
  const query = trpc.organisations.list.useQuery({ showInactive });
  const toggleActive = trpc.organisations.setActive.useMutation({
    onSuccess: () => utils.organisations.list.invalidate(),
  });

  if (query.isLoading) return <Skeleton />;

  const orgs = query.data ?? [];
  const filtered = search.trim()
    ? orgs.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : orgs;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search head offices…"
        showInactive={showInactive}
        onToggleInactive={setShowInactive}
        count={filtered.length}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <Empty search={search} noun="head offices" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Head Office</th>
                  <th className={TH}>Dealerships</th>
                  <th className={TH}>Users</th>
                  <th className={TH}>Status</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className={cn(
                      "border-b border-slate-50 last:border-0 hover:bg-slate-50/50",
                      !o.isActive && "opacity-50",
                    )}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <Building2 className="h-4 w-4 text-slate-500" />
                        </div>
                        <span className="font-bold text-slate-900">{o.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{o.sitesCount}</td>
                    <td className="px-5 py-4 text-slate-600">{o.usersCount}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={o.isActive ? BADGE_ACTIVE : BADGE_INACTIVE}>
                          {o.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => toggleActive.mutate({ id: o.id, isActive: !o.isActive })}
                          title={o.isActive ? "Deactivate" : "Reactivate"}
                          className={cn(
                            "rounded-lg p-1.5 transition hover:bg-slate-100",
                            o.isActive ? "text-red-400 hover:text-red-600" : "text-emerald-500 hover:text-emerald-700",
                          )}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/organisations/${o.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-cyan hover:text-cyan"
                      >
                        Open <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
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

// ── Tab: Dealerships ────────────────────────────────────────────────────────
function DealershipsTab() {
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();
  const query = trpc.dealerships.listAll.useQuery({ showInactive });
  const toggleActive = trpc.dealerships.update.useMutation({
    onSuccess: () => utils.dealerships.listAll.invalidate(),
  });

  if (query.isLoading) return <Skeleton />;

  const dealerships = query.data ?? [];
  const filtered = search.trim()
    ? dealerships.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.organisation?.name?.toLowerCase().includes(search.toLowerCase()) ||
          d.contactName?.toLowerCase().includes(search.toLowerCase()) ||
          d.contactEmail?.toLowerCase().includes(search.toLowerCase()),
      )
    : dealerships;

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search dealerships…"
          showInactive={showInactive}
          onToggleInactive={setShowInactive}
          count={filtered.length}
          action={
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <PlusCircle className="h-4 w-4" /> Add dealership
            </button>
          }
        />

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {filtered.length === 0 ? (
            <Empty search={search} noun="dealerships" onAdd={() => setShowModal(true)} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={TH}>Dealership</th>
                    <th className={TH}>Head Office</th>
                    <th className={TH}>Contact</th>
                    <th className={TH}>Sites</th>
                    <th className={TH}>Status</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr
                      key={d.id}
                      className={cn(
                        "border-b border-slate-50 last:border-0 hover:bg-slate-50/50",
                        !d.isActive && "opacity-50",
                      )}
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{d.name}</p>
                        {d.address && (
                          <p className="text-xs text-slate-400">{d.address}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <Link
                          href={`/admin/organisations/${d.organisation.id}`}
                          className="underline-offset-2 hover:text-cyan hover:underline"
                        >
                          {d.organisation.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {d.contactName ?? "—"}
                        {d.contactEmail && (
                          <span className="block text-xs text-slate-400">{d.contactEmail}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{d._count.sites}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={d.isActive ? BADGE_ACTIVE : BADGE_INACTIVE}>
                            {d.isActive ? "Active" : "Inactive"}
                          </span>
                          <button
                            onClick={() => toggleActive.mutate({ id: d.id, isActive: !d.isActive })}
                            title={d.isActive ? "Deactivate" : "Reactivate"}
                            className={cn(
                              "rounded-lg p-1.5 transition hover:bg-slate-100",
                              d.isActive ? "text-red-400 hover:text-red-600" : "text-emerald-500 hover:text-emerald-700",
                            )}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/dealerships/${d.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-cyan hover:text-cyan"
                        >
                          Open <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <AddDealershipModal
          onClose={() => {
            setShowModal(false);
            void utils.dealerships.listAll.invalidate();
          }}
        />
      )}
    </>
  );
}

// ── Shared sub-components ───────────────────────────────────────────────────
function Toolbar({
  search,
  onSearch,
  placeholder,
  showInactive,
  onToggleInactive,
  count,
  action,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  showInactive: boolean;
  onToggleInactive: (v: boolean) => void;
  count: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center rounded-lg border border-slate-200 p-0.5 text-xs font-semibold">
        <button
          onClick={() => onToggleInactive(false)}
          className={cn(
            "rounded-md px-3 py-1.5 transition",
            !showInactive ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700",
          )}
        >
          Active
        </button>
        <button
          onClick={() => onToggleInactive(true)}
          className={cn(
            "rounded-md px-3 py-1.5 transition",
            showInactive ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700",
          )}
        >
          All
        </button>
      </div>

      <span className="text-xs text-slate-400">{count} total</span>
      {action}
    </div>
  );
}

function Empty({ search, noun, onAdd }: { search: string; noun: string; onAdd?: () => void }) {
  return (
    <div className="px-5 py-16 text-center">
      {search.trim() ? (
        <p className="text-sm text-slate-400">No {noun} match &ldquo;{search}&rdquo;</p>
      ) : (
        <>
          <p className="text-sm text-slate-400">No {noun} yet.</p>
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <PlusCircle className="h-4 w-4" /> Add first
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 mt-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

// ── Root export ─────────────────────────────────────────────────────────────
const TABS = [
  { key: "head-offices", label: "Head Offices" },
  { key: "dealerships",  label: "Dealerships"  },
] as const;
type TabKey = typeof TABS[number]["key"];

export function NetworkClient() {
  const [tab, setTab] = useState<TabKey>("head-offices");

  return (
    <div className="mt-4 space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-semibold transition",
              tab === t.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "head-offices" && <HeadOfficesTab />}
      {tab === "dealerships"  && <DealershipsTab />}
    </div>
  );
}
