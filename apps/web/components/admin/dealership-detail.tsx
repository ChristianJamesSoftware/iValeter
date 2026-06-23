"use client";

import { useState } from "react";
import { PlusCircle, X, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

interface SiteRow {
  id: string;
  name: string;
  address: string | null;
  bookings: number;
  users: number;
}

interface DealershipData {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  sites: SiteRow[];
}

export function DealershipDetail({
  dealership,
}: {
  dealership: DealershipData;
}) {
  const [showForm, setShowForm] = useState(false);
  const utils = trpc.useUtils();
  const detail = trpc.dealerships.getById.useQuery(
    { id: dealership.id },
    { initialData: undefined },
  );

  const sites = (detail.data?.sites ?? dealership.sites).map((s) =>
    "bookings" in s
      ? (s as SiteRow)
      : {
          id: s.id,
          name: s.name,
          address: s.address,
          bookings: (s as { _count: { bookings: number } })._count.bookings,
          users: (s as { _count: { users: number } })._count.users,
        },
  );

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-cyan" />
            <h1 className="font-heading text-2xl font-bold text-navy">
              {dealership.name}
            </h1>
            <span
              className={
                dealership.isActive
                  ? "rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                  : "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500"
              }
            >
              {dealership.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {dealership.address && (
            <p className="mt-1 text-sm text-slate">{dealership.address}</p>
          )}
        </div>
      </div>

      {/* HQ info */}
      <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-3">
        <Info label="Contact name" value={dealership.contactName} />
        <Info label="Contact email" value={dealership.contactEmail} />
        <Info label="Contact phone" value={dealership.contactPhone} />
      </div>

      {/* Sites */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Sites
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {sites.length}
            </span>
          </h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-cyan px-4 text-sm font-semibold text-navy transition hover:bg-cyan-600"
          >
            <PlusCircle className="h-4 w-4" /> Add site
          </button>
        </div>

        {showForm && (
          <div className="border-b border-slate-100 p-5">
            <AddSiteForm
              dealershipId={dealership.id}
              onDone={async () => {
                await utils.dealerships.getById.invalidate({
                  id: dealership.id,
                });
                setShowForm(false);
              }}
            />
          </div>
        )}

        {sites.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-slate-400">
            No sites under this dealership yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Name</th>
                  <th className={TH}>Address</th>
                  <th className={TH}>Bookings</th>
                  <th className={TH}>Users</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {s.name}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {s.address ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{s.bookings}</td>
                    <td className="px-5 py-4 text-slate-600">{s.users}</td>
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

function AddSiteForm({
  dealershipId,
  onDone,
}: {
  dealershipId: string;
  onDone: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const create = trpc.sites.create.useMutation({
    onSuccess: async () => {
      await onDone();
    },
  });

  const canSubmit = name.trim().length > 0 && !create.isPending;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading font-bold text-navy">New site</h3>
        <button onClick={() => onDone()} className="rounded-lg p-1 hover:bg-offwhite">
          <X className="h-5 w-5 text-slate" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Site name"
          className="h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
      </div>
      {create.error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {create.error.message}
        </p>
      )}
      <button
        disabled={!canSubmit}
        onClick={() =>
          create.mutate({
            name: name.trim(),
            address: address.trim() || undefined,
            dealershipId,
          })
        }
        className="mt-4 h-11 rounded-lg bg-cyan px-6 font-heading font-semibold text-navy transition hover:bg-cyan-600 disabled:opacity-60"
      >
        {create.isPending ? "Creating…" : "Create site"}
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-navy">{value ?? "—"}</p>
    </div>
  );
}

const TH =
  "px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400";
