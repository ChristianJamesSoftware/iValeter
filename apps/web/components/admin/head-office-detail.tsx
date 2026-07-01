"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, PlusCircle, X, Power } from "lucide-react";
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
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-cyan px-4 text-sm font-semibold text-navy transition hover:bg-cyan-600"
          >
            <PlusCircle className="h-4 w-4" /> Add dealership
          </button>
        </div>

        {showForm && (
          <div className="border-b border-slate-100 p-5">
            <AddDealershipForm
              headOfficeId={headOffice.id}
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

function AddDealershipForm({
  headOfficeId,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  headOfficeId: string;
  pending: boolean;
  error: string | null;
  onSubmit: (data: { name: string; address?: string; contactName?: string; contactEmail?: string; contactPhone?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading font-bold text-navy">New dealership</h3>
        <button onClick={onCancel} className="rounded-lg p-1 hover:bg-offwhite">
          <X className="h-5 w-5 text-slate" />
        </button>
      </div>
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
        {pending ? "Creating…" : "Create dealership"}
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
