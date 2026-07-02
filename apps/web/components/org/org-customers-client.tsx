"use client";

import React, { useState } from "react";
import { Building2, Phone, Mail, MapPin, Plus, Clock, CheckCircle2, XCircle, X, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dealership {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  siteCount: number;
}

interface CustomerRequest {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  createdAt: string;
  requestedBy: string | null;
}

interface Props {
  initialDealerships: Dealership[];
  initialRequests: CustomerRequest[];
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CustomerRequest["status"] }) {
  if (status === "PENDING")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <Clock className="h-3 w-3" /> Awaiting approval
      </span>
    );
  if (status === "APPROVED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
      <XCircle className="h-3 w-3" /> Rejected
    </span>
  );
}

// ─── Add Customer Modal ───────────────────────────────────────────────────────

function AddCustomerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName]               = useState("");
  const [address, setAddress]         = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes]             = useState("");
  const [error, setError]             = useState("");

  const submit = trpc.dealershipRequests.submit.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setError(e.message),
  });

  const INPUT = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30";
  const LABEL = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Customer name is required"); return; }
    setError("");
    submit.mutate({ name, address: address || undefined, contactName: contactName || undefined, contactEmail: contactEmail || undefined, contactPhone: contactPhone || undefined, notes: notes || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy">Add Customer</h2>
            <p className="text-sm text-slate-500">Request will be reviewed by ops before going live</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL}>Dealership Name <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sytner Birmingham" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Site address" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Contact Name</label>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Key contact at the dealership" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Contact Email</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Contact Phone</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="07700 000000" className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Notes for Ops</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any additional context…" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30" />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={submit.isPending} className="flex-1 rounded-xl bg-navy py-2.5 text-sm font-bold text-white hover:bg-navy/90 disabled:opacity-60">
              {submit.isPending ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrgCustomersClient({ initialDealerships, initialRequests }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab]             = useState<"active" | "requests">("active");

  const requestsQuery = trpc.dealershipRequests.list.useQuery(undefined, {
    initialData: initialRequests as never,
    refetchInterval: 30_000,
  });

  const requests = (requestsQuery.data ?? initialRequests) as unknown as CustomerRequest[];
  const pending  = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div>
      {/* Tabs + Add button */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex gap-1 rounded-xl border border-line bg-slate-50 p-1">
          <button
            onClick={() => setTab("active")}
            className={cn("rounded-lg px-4 py-1.5 text-sm font-semibold transition", tab === "active" ? "bg-white text-navy shadow-sm" : "text-slate-500 hover:text-navy")}
          >
            Active ({initialDealerships.length})
          </button>
          <button
            onClick={() => setTab("requests")}
            className={cn("relative rounded-lg px-4 py-1.5 text-sm font-semibold transition", tab === "requests" ? "bg-white text-navy shadow-sm" : "text-slate-500 hover:text-navy")}
          >
            Requests
            {pending > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pending}
              </span>
            )}
          </button>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy/90"
        >
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* Active dealerships tab */}
      {tab === "active" && (
        <div className="space-y-3">
          {initialDealerships.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-slate-50 py-12 text-center text-sm text-slate-400">
              No active customers yet
            </div>
          )}
          {initialDealerships.map((d) => (
            <div key={d.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Building2 className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-bold text-navy">{d.name}</p>
                    {d.address && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" /> {d.address}
                      </p>
                    )}
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                  {d.siteCount} {d.siteCount === 1 ? "site" : "sites"}
                </span>
              </div>
              {(d.contactName || d.contactEmail || d.contactPhone) && (
                <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3 text-xs text-slate-500">
                  {d.contactName && <span className="font-medium text-slate-700">{d.contactName}</span>}
                  {d.contactEmail && (
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {d.contactEmail}</span>
                  )}
                  {d.contactPhone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {d.contactPhone}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Requests tab */}
      {tab === "requests" && (
        <div className="space-y-3">
          {requests.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-slate-50 py-12 text-center text-sm text-slate-400">
              No requests submitted yet
            </div>
          )}
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-navy">{r.name}</p>
                  {r.address && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3 w-3" /> {r.address}
                    </p>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.rejectionNote && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {r.rejectionNote}
                </p>
              )}
              <div className="mt-2 text-xs text-slate-400">
                Submitted {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {r.requestedBy && ` by ${r.requestedBy}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddCustomerModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { requestsQuery.refetch(); setTab("requests"); }}
        />
      )}
    </div>
  );
}
