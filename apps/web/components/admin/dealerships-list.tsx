"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, X } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

export function DealershipsList() {
  const [showForm, setShowForm] = useState(false);
  const query = trpc.dealerships.list.useQuery();

  if (query.isLoading) {
    return <p className="text-slate-400">Loading…</p>;
  }
  const dealerships = query.data ?? [];

  return (
    <div>
      {showForm && (
        <div className="mb-4">
          <DealershipForm onDone={() => setShowForm(false)} />
        </div>
      )}

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
        {dealerships.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-slate-400">
            No dealerships yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Name</th>
                  <th className={TH}>Contact</th>
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
                    <td className="px-5 py-4 font-bold text-slate-900">
                      <Link
                        href={`/admin/dealerships/${d.id}`}
                        className="underline-offset-2 hover:text-cyan hover:underline"
                      >
                        {d.name}
                      </Link>
                      {d.address && (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {d.address}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {d.contactName ?? "—"}
                      {d.contactEmail && (
                        <span className="block text-xs text-slate-400">
                          {d.contactEmail}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {d._count.sites}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          d.isActive
                            ? "rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                            : "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500"
                        }
                      >
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

export function DealershipForm({
  onDone,
  redirectOnDone,
}: {
  onDone?: () => void;
  redirectOnDone?: boolean;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const create = trpc.dealerships.create.useMutation({
    onSuccess: async () => {
      await utils.dealerships.list.invalidate();
      if (redirectOnDone) router.push("/admin/dealerships");
      onDone?.();
    },
  });

  const canSubmit = name.trim().length > 0 && !create.isPending;

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading font-bold text-navy">New dealership</h2>
        {onDone && (
          <button onClick={onDone} className="rounded-lg p-1 hover:bg-offwhite">
            <X className="h-5 w-5 text-slate" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input value={name} onChange={setName} placeholder="Name" />
        <Input value={address} onChange={setAddress} placeholder="Address" />
        <Input
          value={contactName}
          onChange={setContactName}
          placeholder="Contact name"
        />
        <Input
          value={contactEmail}
          onChange={setContactEmail}
          placeholder="Contact email"
          type="email"
        />
        <Input
          value={contactPhone}
          onChange={setContactPhone}
          placeholder="Contact phone"
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
            contactName: contactName.trim() || undefined,
            contactEmail: contactEmail.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
          })
        }
        className="mt-4 h-11 w-full rounded-lg bg-cyan font-heading font-semibold text-navy transition hover:bg-cyan-600 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {create.isPending ? "Creating…" : "Create dealership"}
      </button>
    </div>
  );
}

const TH =
  "px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400";

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
    />
  );
}
