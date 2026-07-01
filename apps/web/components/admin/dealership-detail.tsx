"use client";

import { useState } from "react";
import {
  Building2, MapPin, Phone, Mail, User, PlusCircle, X,
  FileText, Users, Layers, Wrench, ClipboardList, Beaker, Edit2, Check, Car, AlertCircle, CheckCircle2,
} from "lucide-react";
import { DealershipAddOns } from "@/components/admin/dealership-addons";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceType { id: string; name: string; durationMins: number }
interface Department   { id: string; name: string; serviceTypes: ServiceType[] }
interface VehicleSizeRate {
  id: string;
  serviceType: { id: string; name: string };
  basePricePence: number | null;
  baseAllocMins: number | null;
  pctSmall: number; pctMedium: number; pctLarge: number; pctXL: number; pctVan: number;
}
interface TeamMember {
  id: string; firstName: string; lastName: string;
  role: string; payId: string | null; staffType: string | null; siteId: string | null;
  email: string; organisationId: string;
}
interface SiteRow {
  id: string; name: string; address: string | null;
  departments: Department[];
  users: TeamMember[];
  vehicleSizeRates: VehicleSizeRate[];
  _count: { bookings: number; users: number };
}
interface DealershipData {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  specialInstructions: string | null;
  isActive: boolean;
  organisation?: { id: string; name: string } | null;
  sites: SiteRow[];
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",      label: "Overview",            icon: FileText },
  { id: "sites",         label: "Sites",               icon: Layers },
  { id: "valetTypes",    label: "Valet Types",         icon: Wrench },
  { id: "rates",         label: "Vehicle Rates",       icon: ClipboardList },
  { id: "team",          label: "Site Team",           icon: Users },
  { id: "valeters",      label: "Valeters",            icon: Car },
  { id: "addons",        label: "Add-Ons",             icon: Beaker },
  { id: "instructions",  label: "Special Instructions", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, icon: Icon }: { label: string; value: string | null; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-3">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm text-slate-800">{value ?? "—"}</p>
      </div>
    </div>
  );
}

const TH = "px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left";
const TD = "px-4 py-3 text-sm text-slate-700 border-b border-slate-50";

function pct(n: number) { return n >= 0 ? `+${n}%` : `${n}%`; }
function pence(n: number | null) { return n != null ? `£${(n / 100).toFixed(2)}` : "—"; }

// ─── Main component ───────────────────────────────────────────────────────────

export function DealershipDetail({ dealership: initial }: { dealership: DealershipData }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showAddSite, setShowAddSite] = useState(false);

  const utils = trpc.useUtils();
  const { data: fresh } = trpc.dealerships.getById.useQuery({ id: initial.id });

  // Merge server data with initial SSR data
  const d: DealershipData = fresh
    ? {
        ...fresh,
        organisation: fresh.organisation ?? initial.organisation,
        sites: fresh.sites.map((s) => ({
          ...s,
          departments: s.departments ?? [],
          users: s.users ?? [],
          vehicleSizeRates: s.vehicleSizeRates ?? [],
        })),
      }
    : initial;

  const updateDetails = trpc.dealerships.updateDetails.useMutation({
    onSuccess: () => utils.dealerships.getById.invalidate({ id: d.id }),
  });

  // All users across all sites (deduplicated by user id)
  const allUsers = Array.from(
    new Map(
      d.sites.flatMap((s) =>
        (s.users ?? []).map((u) => [u.id, { ...u, siteName: s.name }]),
      ),
    ).values(),
  );
  // Split: site staff vs valeters
  const allTeam = allUsers.filter((u) => u.role !== "valeter");
  const allValeters = allUsers.filter((u) => u.role === "valeter");

  // All service types across all sites (deduplicated)
  const allServiceTypes = Array.from(
    new Map(
      d.sites.flatMap((s) =>
        s.departments.flatMap((dept) =>
          dept.serviceTypes.map((st) => [st.id, st]),
        ),
      ),
    ).values(),
  );

  // All vehicle size rates across all sites
  const allRates = d.sites.flatMap((s) =>
    (s.vehicleSizeRates ?? []).map((r) => ({ ...r, siteName: s.name })),
  );

  return (
    <div>
      {/* Header card */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-black tracking-tight text-slate-900">
                  {d.name}
                </h1>
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  d.isActive
                    ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border border-slate-200 bg-slate-100 text-slate-500",
                )}>
                  {d.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              {d.organisation && (
                <p className="mt-0.5 text-sm text-slate-500">{d.organisation.name}</p>
              )}
              {d.address && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-400">
                  <MapPin className="h-3.5 w-3.5" /> {d.address}
                </p>
              )}
            </div>
          </div>

          {/* Quick contact */}
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            {d.contactName && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" /> {d.contactName}
              </span>
            )}
            {d.contactEmail && (
              <a href={`mailto:${d.contactEmail}`} className="flex items-center gap-1.5 hover:text-slate-900">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {d.contactEmail}
              </a>
            )}
            {d.contactPhone && (
              <a href={`tel:${d.contactPhone}`} className="flex items-center gap-1.5 hover:text-slate-900">
                <Phone className="h-3.5 w-3.5 text-slate-400" /> {d.contactPhone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-100 bg-white p-1 shadow-sm">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition",
              activeTab === id
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "overview" && (
        <OverviewTab d={d} onSave={(data) => updateDetails.mutate({
          id: d.id,
          name: data.name ?? undefined,
          address: data.address ?? undefined,
          contactName: data.contactName ?? undefined,
          contactEmail: data.contactEmail ?? undefined,
          contactPhone: data.contactPhone ?? undefined,
          specialInstructions: data.specialInstructions ?? undefined,
          isActive: data.isActive,
        })} saving={updateDetails.isPending} />
      )}
      {activeTab === "sites" && (
        <SitesTab
          d={d}
          showAddSite={showAddSite}
          setShowAddSite={setShowAddSite}
          onSiteAdded={() => utils.dealerships.getById.invalidate({ id: d.id })}
        />
      )}
      {activeTab === "valetTypes" && <ValetTypesTab serviceTypes={allServiceTypes} sites={d.sites} />}
      {activeTab === "rates"      && <VehicleRatesTab rates={allRates} />}
      {activeTab === "team"       && <TeamTab members={allTeam} />}
      {activeTab === "valeters"    && <ValetersTab valeters={allValeters} />}
      {activeTab === "addons"     && <DealershipAddOns dealershipId={d.id} />}
      {activeTab === "instructions" && (
        <InstructionsTab
          value={d.specialInstructions}
          onSave={(v) => updateDetails.mutate({ id: d.id, specialInstructions: v })}
          saving={updateDetails.isPending}
        />
      )}
    </div>
  );
}

// ─── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab({
  d, onSave, saving,
}: {
  d: DealershipData;
  onSave: (data: Partial<DealershipData>) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: d.name,
    address: d.address ?? "",
    contactName: d.contactName ?? "",
    contactEmail: d.contactEmail ?? "",
    contactPhone: d.contactPhone ?? "",
  });

  function save() {
    onSave({
      name: form.name || undefined,
      address: form.address || undefined,
      contactName: form.contactName || undefined,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
    });
    setEditing(false);
  }

  const inputCls = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-900">Contact Details</h2>
        <button
          onClick={() => editing ? save() : setEditing(true)}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {editing ? <><Check className="h-3.5 w-3.5" /> Save</> : <><Edit2 className="h-3.5 w-3.5" /> Edit</>}
        </button>
      </div>

      <div className="divide-y divide-slate-50 px-5">
        {editing ? (
          <div className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-2">
            {(["name","address","contactName","contactEmail","contactPhone"] as const).map((f) => (
              <div key={f}>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {f === "contactName" ? "Contact Name" : f === "contactEmail" ? "Contact Email" : f === "contactPhone" ? "Contact Phone" : f.charAt(0).toUpperCase() + f.slice(1)}
                </label>
                <input
                  value={form[f]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            <InfoRow label="Dealership Name"  value={d.name}         icon={Building2} />
            <InfoRow label="Address"          value={d.address}      icon={MapPin} />
            <InfoRow label="Contact Name"     value={d.contactName}  icon={User} />
            <InfoRow label="Contact Email"    value={d.contactEmail} icon={Mail} />
            <InfoRow label="Contact Phone"    value={d.contactPhone} icon={Phone} />
          </>
        )}
      </div>

      {/* Stats strip */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
        <Stat label="Sites"    value={d.sites.length} />
        <Stat label="Valeters" value={allUniq(d.sites.flatMap((s) => s.users ?? []), "id")} />
        <Stat label="Bookings" value={d.sites.reduce((acc, s) => acc + s._count.bookings, 0)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-5 py-4 text-center">
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function allUniq<T>(arr: T[], key: keyof T): number {
  return new Set(arr.map((i) => i[key])).size;
}

// ─── Sites tab ────────────────────────────────────────────────────────────────

function SitesTab({
  d, showAddSite, setShowAddSite, onSiteAdded,
}: {
  d: DealershipData;
  showAddSite: boolean;
  setShowAddSite: (v: boolean) => void;
  onSiteAdded: () => void | Promise<void>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-900">
          Sites
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {d.sites.length}
          </span>
        </h2>
        <button
          onClick={() => setShowAddSite(!showAddSite)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <PlusCircle className="h-4 w-4" /> Add site
        </button>
      </div>

      {showAddSite && (
        <div className="border-b border-slate-100 p-5">
          <AddSiteForm
            dealershipId={d.id}
            onDone={async () => { await onSiteAdded(); setShowAddSite(false); }}
          />
        </div>
      )}

      {d.sites.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-slate-400">No sites yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className={TH}>Name</th>
              <th className={TH}>Address</th>
              <th className={TH}>Departments</th>
              <th className={TH}>Bookings</th>
              <th className={TH}>Users</th>
            </tr>
          </thead>
          <tbody>
            {d.sites.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50">
                <td className={`${TD} font-semibold text-slate-900`}>{s.name}</td>
                <td className={TD}>{s.address ?? "—"}</td>
                <td className={TD}>{s.departments.length}</td>
                <td className={TD}>{s._count.bookings}</td>
                <td className={TD}>{s._count.users}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Valet Types tab ─────────────────────────────────────────────────────────

function ValetTypesTab({ serviceTypes, sites }: { serviceTypes: { id: string; name: string; durationMins: number }[]; sites: SiteRow[] }) {
  if (serviceTypes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white px-5 py-16 text-center shadow-sm">
        <p className="text-sm text-slate-400">No valet types configured yet. Add departments and service types to this dealership&apos;s sites.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-900">
          Valet Types
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {serviceTypes.length}
          </span>
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">Service types configured across all sites for this dealership.</p>
      </div>

      {sites.map((site) => {
        const siteServiceTypes = site.departments.flatMap((d) => d.serviceTypes);
        if (siteServiceTypes.length === 0) return null;
        return (
          <div key={site.id}>
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{site.name}</p>
            </div>
            {site.departments.map((dept) => dept.serviceTypes.length > 0 && (
              <div key={dept.id}>
                <div className="border-b border-slate-50 px-5 py-1.5">
                  <p className="text-xs font-semibold text-slate-400">{dept.name}</p>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className={TH}>Service Type</th>
                      <th className={TH}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dept.serviceTypes.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/50">
                        <td className={`${TD} font-medium text-slate-900`}>{st.name}</td>
                        <td className={TD}>{st.durationMins} mins</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Vehicle Rates tab ───────────────────────────────────────────────────────

function VehicleRatesTab({ rates }: { rates: (VehicleSizeRate & { siteName: string })[] }) {
  if (rates.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white px-5 py-16 text-center shadow-sm">
        <p className="text-sm text-slate-400">No vehicle size rates set yet. Configure rates per site in Platform Settings.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-900">Vehicle Rates</h2>
        <p className="mt-0.5 text-xs text-slate-400">Base price + percentage modifiers by vehicle size across all sites.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr>
              <th className={TH}>Site</th>
              <th className={TH}>Service Type</th>
              <th className={TH}>Base Price</th>
              <th className={TH}>Alloc (mins)</th>
              <th className={TH}>Small</th>
              <th className={TH}>Medium</th>
              <th className={TH}>Large</th>
              <th className={TH}>XL</th>
              <th className={TH}>Van</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50">
                <td className={`${TD} text-slate-500`}>{r.siteName}</td>
                <td className={`${TD} font-medium text-slate-900`}>{r.serviceType.name}</td>
                <td className={TD}>{pence(r.basePricePence)}</td>
                <td className={TD}>{r.baseAllocMins ?? "—"}</td>
                <td className={TD}>{pct(r.pctSmall)}</td>
                <td className={TD}>{pct(r.pctMedium)}</td>
                <td className={TD}>{pct(r.pctLarge)}</td>
                <td className={TD}>{pct(r.pctXL)}</td>
                <td className={TD}>{pct(r.pctVan)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Team tab ─────────────────────────────────────────────────────────────────

function TeamTab({ members }: { members: (TeamMember & { siteName: string })[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-900">
          Team Members
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {members.length}
          </span>
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">Site staff and dealership users assigned to this dealership.</p>
      </div>

      {members.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-slate-400">No site team members assigned yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className={TH}>Name</th>
              <th className={TH}>Site</th>
              <th className={TH}>Pay ID</th>
              <th className={TH}>Staff Type</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/50">
                <td className={`${TD} font-medium text-slate-900`}>
                  {m.firstName} {m.lastName}
                </td>
                <td className={TD}>{m.siteName}</td>
                <td className={`${TD} font-mono text-xs`}>{m.payId ?? "—"}</td>
                <td className={TD}>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    m.staffType === "SSS"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600",
                  )}>
                    {m.staffType ?? "SITE"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Valeters tab ────────────────────────────────────────────────────────────

function ValetersTab({ valeters }: { valeters: (TeamMember & { siteName: string })[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-900">
          Valeters
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {valeters.length}
          </span>
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">Valeters assigned to sites under this dealership.</p>
      </div>

      {valeters.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-slate-400">No valeters assigned to this dealership yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className={TH}>Name</th>
              <th className={TH}>Site</th>
              <th className={TH}>Pay Reference</th>
              <th className={TH}>Staff Type</th>
            </tr>
          </thead>
          <tbody>
            {valeters.map((v) => (
              <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className={`${TD} font-medium text-slate-900`}>
                  {v.firstName} {v.lastName}
                </td>
                <td className={TD}>{v.siteName}</td>
                <td className={`${TD} font-mono text-xs text-slate-500`}>{v.payId ?? "—"}</td>
                <td className={TD}>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    v.staffType === "SSS"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600",
                  )}>
                    {v.staffType ?? "SITE"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Special Instructions tab ─────────────────────────────────────────────────

function InstructionsTab({
  value, onSave, saving,
}: {
  value: string | null;
  onSave: (v: string) => void;
  saving: boolean;
}) {
  const [text, setText] = useState(value ?? "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const dirty = text !== (value ?? "");

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-900">Special Instructions</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Notes visible to all valeters and managers working with this dealership — access requirements, parking, contact preferences, etc.
        </p>
      </div>
      <div className="p-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="e.g. Use staff car park via rear entrance. Report to reception on arrival. No vehicles to be moved without supervisor sign-off..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">{text.length} characters</p>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={cn(
              "h-9 rounded-lg px-5 text-sm font-semibold transition",
              saved
                ? "bg-emerald-500 text-white"
                : "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40",
            )}
          >
            {saved ? "Saved" : saving ? "Saving…" : "Save Instructions"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Site form ────────────────────────────────────────────────────────────

function AddSiteForm({ dealershipId, onDone }: { dealershipId: string; onDone: () => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const create = trpc.sites.create.useMutation({ onSuccess: async () => onDone() });
  const inputCls = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">New site</h3>
        <button onClick={() => onDone()} className="rounded-lg p-1 hover:bg-slate-50">
          <X className="h-5 w-5 text-slate-400" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Site name" className={inputCls} />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className={inputCls} />
      </div>
      {create.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{create.error.message}</p>
      )}
      <button
        disabled={!name.trim() || create.isPending}
        onClick={() => create.mutate({ name: name.trim(), address: address.trim() || undefined, dealershipId })}
        className="mt-4 h-10 rounded-lg bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
      >
        {create.isPending ? "Creating…" : "Create site"}
      </button>
    </div>
  );
}
