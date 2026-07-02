"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Building2, PlusCircle, X, Power, Link2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

interface HeadOfficeData {
  id: string;
  name: string;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
}

export function HeadOfficeDetail({ headOffice }: { headOffice: HeadOfficeData }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isActive, setIsActive] = useState(headOffice.isActive);

  const dealershipsQ = trpc.organisations.getDealerships.useQuery({ id: headOffice.id });
  const dealerships = dealershipsQ.data ?? [];

  const setActive = trpc.organisations.setActive.useMutation({
    onSuccess: (_, vars) => {
      setIsActive(vars.isActive);
      utils.organisations.list.invalidate();
    },
  });

  const createDealership = trpc.dealerships.createForHeadOffice.useMutation({
    onSuccess: async () => {
      await utils.organisations.getDealerships.invalidate({ id: headOffice.id });
      setShowForm(false);
    },
  });

  const allDealershipsQ = trpc.dealerships.listAll.useQuery({ showInactive: true }, { enabled: showAttach });
  const reassign = trpc.dealerships.reassignToHeadOffice.useMutation({
    onSuccess: async () => {
      await utils.organisations.getDealerships.invalidate({ id: headOffice.id });
      await utils.dealerships.listAll.invalidate();
      setShowAttach(false);
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Building2 className="h-6 w-6 text-cyan" />
        <h1 className="font-heading text-2xl font-bold text-navy">{headOffice.name}</h1>
        <span className={isActive ? BADGE_ACTIVE : BADGE_INACTIVE}>
          {isActive ? "Active" : "Inactive"}
        </span>
        <button
          onClick={() => setActive.mutate({ id: headOffice.id, isActive: !isActive })}
          disabled={setActive.isPending}
          title={isActive ? "Set inactive" : "Set active"}
          className={cn(
            "ml-1 rounded-lg p-1.5 transition hover:bg-slate-100 disabled:opacity-50",
            isActive ? "text-red-400 hover:text-red-600" : "text-emerald-500 hover:text-emerald-700",
          )}
        >
          <Power className="h-4 w-4" />
        </button>
      </div>

      {/* Info strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-3">
        <Info label="Address" value={headOffice.address} />
        <Info label="Contact email" value={headOffice.contactEmail} />
        <Info label="Contact phone" value={headOffice.contactPhone} />
      </div>

      {/* Dealerships */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Dealerships
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {dealerships.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAttach((v) => !v); setShowForm(false); }}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-cyan hover:text-cyan"
            >
              <Link2 className="h-4 w-4" /> Attach existing
            </button>
            <button
              onClick={() => { setShowForm((v) => !v); setShowAttach(false); }}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-cyan px-4 text-sm font-semibold text-navy transition hover:bg-cyan-600"
            >
              <PlusCircle className="h-4 w-4" /> Add new
            </button>
          </div>
        </div>

        {showAttach && (
          <div className="border-b border-slate-100 p-5">
            <AttachDealershipPanel
              headOfficeId={headOffice.id}
              headOfficeName={headOffice.name}
              currentIds={new Set(dealerships.map((d) => d.id))}
              allDealerships={allDealershipsQ.data ?? []}
              loading={allDealershipsQ.isLoading}
              pending={reassign.isPending}
              error={reassign.error?.message ?? null}
              onAttach={(id) => reassign.mutate({ dealershipId: id, headOfficeId: headOffice.id })}
              onCancel={() => setShowAttach(false)}
            />
          </div>
        )}

        {showForm && (
          <div className="border-b border-slate-100 p-5">
            <AddDealershipForm
              headOfficeId={headOffice.id}
              headOfficeName={headOffice.name}
              headOfficeAddress={headOffice.address}
              headOfficeContactEmail={headOffice.contactEmail}
              headOfficeContactPhone={headOffice.contactPhone}
              pending={createDealership.isPending}
              error={createDealership.error?.message ?? null}
              onSubmit={(data) => createDealership.mutate({ ...data, organisationId: headOffice.id })}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {dealerships.length === 0 && !showForm ? (
          <p className="px-5 py-14 text-center text-sm text-slate-400">
            No dealerships yet — add one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Name</th>
                  <th className={TH}>Address</th>
                  <th className={TH}>Sites</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dealerships.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900">
                      <Link
                        href={`/admin/dealerships/${d.id}`}
                        className="underline-offset-2 hover:text-cyan hover:underline"
                      >
                        {d.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{d.address ?? "—"}</td>
                    <td className="px-5 py-4 text-slate-500">{d._count.sites}</td>
                    <td className="px-5 py-4">
                      <span className={d.isActive ? BADGE_ACTIVE : BADGE_INACTIVE}>
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
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

function AttachDealershipPanel({
  headOfficeName,
  currentIds,
  allDealerships,
  loading,
  pending,
  error,
  onAttach,
  onCancel,
}: {
  headOfficeId: string;
  headOfficeName: string;
  currentIds: Set<string>;
  allDealerships: { id: string; name: string; organisation: { name: string }; isActive: boolean }[];
  loading: boolean;
  pending: boolean;
  error: string | null;
  onAttach: (id: string) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");

  const available = useMemo(() =>
    allDealerships.filter(
      (d) => !currentIds.has(d.id) &&
        (search.trim() === "" ||
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.organisation.name.toLowerCase().includes(search.toLowerCase())),
    ),
    [allDealerships, currentIds, search],
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-navy">Attach existing dealership</h3>
          <p className="mt-0.5 text-xs text-slate-400">Move a dealership from another head office into <span className="font-semibold text-navy">{headOfficeName}</span></p>
        </div>
        <button onClick={onCancel} className="rounded-lg p-1 hover:bg-offwhite">
          <X className="h-5 w-5 text-slate" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by dealership or current head office…"
          className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 placeholder:text-slate-400"
        />
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Loading dealerships…</p>
      ) : available.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          {search ? "No dealerships match that search." : "All dealerships are already attached to this head office."}
        </p>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-line">
          {available.map((d, i) => (
            <div
              key={d.id}
              className={cn(
                "flex items-center justify-between px-4 py-3 hover:bg-offwhite transition",
                i > 0 && "border-t border-line",
              )}
            >
              <div>
                <p className="text-sm font-semibold text-navy">{d.name}</p>
                <p className="text-xs text-slate-400">Currently: {d.organisation.name}</p>
              </div>
              <button
                disabled={pending}
                onClick={() => onAttach(d.id)}
                className="h-8 rounded-lg bg-cyan px-3 text-xs font-bold text-navy transition hover:bg-cyan-600 disabled:opacity-50"
              >
                Attach
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

function AddDealershipForm({
  headOfficeId: _headOfficeId,
  headOfficeName,
  headOfficeAddress,
  headOfficeContactEmail,
  headOfficeContactPhone,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  headOfficeId: string;
  headOfficeName: string;
  headOfficeAddress: string | null;
  headOfficeContactEmail: string | null;
  headOfficeContactPhone: string | null;
  pending: boolean;
  error: string | null;
  onSubmit: (data: { name: string; address?: string; contactName?: string; contactEmail?: string; contactPhone?: string }) => void;
  onCancel: () => void;
}) {
  const [sameAsHO, setSameAsHO] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const handleSameToggle = () => {
    const next = !sameAsHO;
    setSameAsHO(next);
    if (next) {
      setName(headOfficeName);
      setAddress(headOfficeAddress ?? "");
      setContactEmail(headOfficeContactEmail ?? "");
      setContactPhone(headOfficeContactPhone ?? "");
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading font-bold text-navy">New dealership</h3>
        <button onClick={onCancel} className="rounded-lg p-1 hover:bg-offwhite">
          <X className="h-5 w-5 text-slate" />
        </button>
      </div>

      {/* Same as Head Office toggle */}
      <button
        type="button"
        onClick={handleSameToggle}
        className={cn(
          "mb-4 flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition",
          sameAsHO ? "border-cyan bg-cyan/5" : "border-line bg-offwhite hover:border-slate-300",
        )}
      >
        <span
          className={cn(
            "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
            sameAsHO ? "bg-cyan" : "bg-line",
          )}
        >
          <span
            className={cn(
              "h-5 w-5 rounded-full bg-white shadow-sm transition",
              sameAsHO && "translate-x-5",
            )}
          />
        </span>
        <div>
          <span className="text-sm font-semibold text-navy">Head Office is also the Dealership</span>
          <p className="mt-0.5 text-xs text-slate">Pre-fills details from the head office record</p>
        </div>
      </button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dealership name *" className={INPUT} autoFocus />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className={INPUT} />
        <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" className={INPUT} />
        <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" type="email" className={INPUT} />
        <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact phone" className={INPUT} />
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      <button
        disabled={!name.trim() || pending}
        onClick={() => onSubmit({
          name: name.trim(),
          address: address.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        })}
        className="mt-4 h-11 rounded-lg bg-cyan px-6 font-heading font-semibold text-navy transition hover:bg-cyan-600 disabled:opacity-60"
      >
        {pending ? "Creating\u2026" : "Create dealership"}
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-navy">{value ?? "—"}</p>
    </div>
  );
}

const TH = "px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400";
const INPUT = "h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-navy outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/30 placeholder:text-slate-400";
const BADGE_ACTIVE = "rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700";
const BADGE_INACTIVE = "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500";
