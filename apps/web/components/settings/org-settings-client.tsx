"use client";

/**
 * Manager Settings — stripped to what a site manager actually controls.
 * Head-office-only sections (Billing, Xero, Features, Services, Profile) removed.
 *
 * Tabs:
 *  1. Sites      — view existing, request a new site (sent to HQ for approval)
 *  2. Valeters   — add a new valeter (sent to HQ for approval before going live)
 *  3. Customers  — add a new dealership user (customer-portal access)
 */

import { useState } from "react";
import { CheckCircle2, Clock, Loader2, Plus, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { SettingsTabs } from "@/components/settings/tabs";
import { TextField } from "@/components/settings/field";
import { cn } from "@/lib/utils";
import { VehicleSizeRatesManager } from "@/components/org/vehicle-size-rates-manager";

export function OrgSettingsClient() {
  const [tab, setTab] = useState("sites");

  const tabs = [
    { key: "sites", label: "Sites" },
    { key: "valeters", label: "Add Valeter" },
    { key: "customers", label: "Add Customer" },
    { key: "rates", label: "Vehicle Rates" },
  ];

  return (
    <div>
      <SettingsTabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === "sites"     && <SitesTab />}
      {tab === "valeters"  && <AddValeterTab />}
      {tab === "customers" && <AddCustomerTab />}
      {tab === "rates"     && <VehicleRatesTab />}
    </div>
  );
}

// ─── Vehicle Rates Tab ──────────────────────────────────────────────────────

function VehicleRatesTab() {
  const sitesQuery = trpc.sites.list.useQuery({});
  const sites = sitesQuery.data ?? [];
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const activeSiteId = selectedSiteId ?? sites[0]?.id ?? null;

  if (sitesQuery.isLoading) return <LoadingSpinner />;

  if (sites.length === 0) {
    return (
      <p className="text-sm text-[#7A7974] py-4">
        No active sites found. Add a site first before configuring vehicle rates.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-[#7A7974] mb-3">
          Set a base price and time allocation per service type, then configure the percentage
          uplift for each vehicle size. These rates are used for piece-work pricing and daily
          capacity planning.
        </p>
        {/* Site selector */}
        {sites.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {sites.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSiteId(s.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  activeSiteId === s.id
                    ? "border-[#01696F] bg-[#01696F]/10 text-[#01696F]"
                    : "border-[#D4D1CA] bg-white text-[#7A7974] hover:text-[#28251D]",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {activeSiteId && <VehicleSizeRatesManager siteId={activeSiteId} />}
    </div>
  );
}

// ─── Sites Tab ────────────────────────────────────────────────────────────────

function SitesTab() {
  const query = trpc.sites.list.useQuery({});
  const [showRequest, setShowRequest] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (query.isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Existing sites */}
      {(query.data ?? []).map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between rounded-xl border border-line bg-white p-4"
        >
          <div>
            <p className="font-semibold text-navy">{s.name}</p>
            <p className="text-sm text-slate">{s.address ?? "No address"}</p>
          </div>
          <span className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate",
          )}>
            {s.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      ))}

      {/* Request new site */}
      {!showRequest && !submitted && (
        <button
          onClick={() => setShowRequest(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-line bg-white px-4 py-3 text-sm font-medium text-slate transition hover:border-navy hover:text-navy"
        >
          <Plus className="h-4 w-4" />
          Request a new site
        </button>
      )}

      {showRequest && !submitted && (
        <div className="rounded-xl border border-line bg-white p-5 space-y-4">
          <p className="text-sm font-semibold text-navy">Request New Site</p>
          <p className="text-xs text-slate">
            This will be sent to Total Valeting head office for approval before going live.
          </p>
          <TextField label="Site name" value={siteName} onChange={setSiteName} />
          <TextField label="Address" value={siteAddress} onChange={setSiteAddress} />
          <div className="flex gap-3">
            <button
              onClick={() => {
                // In a full implementation this fires a tRPC mutation or email.
                // For now, flag as submitted — HQ approval workflow TBD.
                setSubmitted(true);
                setShowRequest(false);
              }}
              disabled={!siteName.trim()}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-40"
            >
              Submit for approval
            </button>
            <button
              onClick={() => setShowRequest(false)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-slate hover:bg-offwhite"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Request submitted</p>
            <p className="text-xs mt-0.5">Total Valeting head office will review and activate the site.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Valeter Tab ──────────────────────────────────────────────────────────

function AddValeterTab() {
  const sitesQuery = trpc.sites.list.useQuery({});
  const createUser = trpc.users.create.useMutation();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    siteId: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const sites = sitesQuery.data ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createUser.mutateAsync({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      mobile: form.phone || undefined,
      siteId: form.siteId || undefined,
      role: "valeter",
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <SuccessPanel
        title="Valeter added — pending HQ approval"
        message="The valeter account has been created as inactive. Total Valeting head office will activate it once approved."
        onReset={() => { setSubmitted(false); setForm({ firstName: "", lastName: "", email: "", phone: "", siteId: "" }); }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg rounded-xl border border-line bg-white p-6 space-y-4">
      <InfoBanner message="New valeters require head office approval before they can log in." />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" value={form.firstName} onChange={(v) => set("firstName", v)} />
        <TextField label="Last name" value={form.lastName} onChange={(v) => set("lastName", v)} />
      </div>
      <TextField label="Email address" type="email" value={form.email} onChange={(v) => set("email", v)} />
      <TextField label="Mobile number" value={form.phone} onChange={(v) => set("phone", v)} />
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
          Assign to site
        </label>
        <select
          value={form.siteId}
          onChange={(e) => set("siteId", e.target.value)}
          className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        >
          <option value="">— Select site —</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {createUser.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{createUser.error.message}</p>
      )}
      <button
        type="submit"
        disabled={!form.firstName || !form.lastName || !form.email || createUser.isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-40"
      >
        {createUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add Valeter
      </button>
    </form>
  );
}

// ─── Add Customer Tab ─────────────────────────────────────────────────────────

function AddCustomerTab() {
  const sitesQuery = trpc.sites.list.useQuery({});
  const createUser = trpc.users.create.useMutation();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    siteId: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const sites = sitesQuery.data ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createUser.mutateAsync({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      mobile: form.phone || undefined,
      jobTitle: form.jobTitle || undefined,
      siteId: form.siteId || undefined,
      role: "dealership_user",
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <SuccessPanel
        title="Customer user added"
        message="They will receive an email to set their password and can then access the customer portal."
        onReset={() => { setSubmitted(false); setForm({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "", siteId: "" }); }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg rounded-xl border border-line bg-white p-6 space-y-4">
      <InfoBanner message="This creates a customer portal login for a dealership contact. They will only see their own site's bookings." />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" value={form.firstName} onChange={(v) => set("firstName", v)} />
        <TextField label="Last name" value={form.lastName} onChange={(v) => set("lastName", v)} />
      </div>
      <TextField label="Email address" type="email" value={form.email} onChange={(v) => set("email", v)} />
      <TextField label="Mobile number" value={form.phone} onChange={(v) => set("phone", v)} />
      <TextField label="Job title" value={form.jobTitle} onChange={(v) => set("jobTitle", v)} />
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
          Customer site
        </label>
        <select
          required
          value={form.siteId}
          onChange={(e) => set("siteId", e.target.value)}
          className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        >
          <option value="">— Select site —</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {createUser.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{createUser.error.message}</p>
      )}
      <button
        type="submit"
        disabled={!form.firstName || !form.lastName || !form.email || !form.siteId || createUser.isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-40"
      >
        {createUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add Customer User
      </button>
    </form>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16 text-slate">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

function InfoBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      {message}
    </div>
  );
}

function SuccessPanel({ title, message, onReset }: { title: string; message: string; onReset: () => void }) {
  return (
    <div className="max-w-lg rounded-xl border border-emerald-200 bg-emerald-50 p-6 space-y-3">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        <p className="font-semibold text-emerald-900">{title}</p>
      </div>
      <p className="text-sm text-emerald-800">{message}</p>
      <button onClick={onReset} className="text-sm font-medium text-emerald-700 underline underline-offset-2">
        Add another
      </button>
    </div>
  );
}
