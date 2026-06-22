"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/react";
import { SettingsTabs } from "@/components/settings/tabs";
import { TextField, SaveBar } from "@/components/settings/field";
import { ToggleRow } from "@/components/settings/toggle";
import { FEATURE_LABELS, type FeatureKey } from "@ivaleter/api/plans";

export function OrgSettingsClient() {
  const params = useSearchParams();
  const features = trpc.orgSettings.getFeatures.useQuery();
  const xeroEnabled = features.data?.enabled.xero ?? false;
  const initial = params.get("tab") ?? "profile";
  const [tab, setTab] = useState(initial);

  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "sites", label: "Sites" },
    { key: "services", label: "Services" },
    { key: "features", label: "Features" },
    ...(xeroEnabled ? [{ key: "xero", label: "Xero" }] : []),
  ];

  return (
    <div>
      <SettingsTabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === "profile" && <ProfileTab />}
      {tab === "sites" && <SitesTab />}
      {tab === "services" && <ServicesTab />}
      {tab === "features" && <FeaturesTab />}
      {tab === "xero" && xeroEnabled && <XeroTab />}
    </div>
  );
}

type ProfileForm = {
  name: string;
  billingAddress: string;
  vatNumber: string;
  contactEmail: string;
  contactPhone: string;
};

function ProfileTab() {
  const query = trpc.orgSettings.getProfile.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.orgSettings.updateProfile.useMutation({
    onSuccess: () => utils.orgSettings.getProfile.invalidate(),
  });
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [saved, setSaved] = useState(false);

  if (query.isLoading || !query.data) {
    return <p className="text-slate">Loading…</p>;
  }
  const d = query.data;
  const f: ProfileForm = form ?? {
    name: d.name,
    billingAddress: d.billingAddress,
    vatNumber: d.vatNumber,
    contactEmail: d.contactEmail,
    contactPhone: d.contactPhone,
  };
  const set = (k: keyof ProfileForm, v: string) => setForm({ ...f, [k]: v });

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-line bg-white p-6">
      <TextField label="Organisation name" value={f.name} onChange={(v) => set("name", v)} />
      <TextField label="Billing address" value={f.billingAddress} onChange={(v) => set("billingAddress", v)} />
      <TextField label="VAT number" value={f.vatNumber} onChange={(v) => set("vatNumber", v)} />
      <TextField label="Contact email" type="email" value={f.contactEmail} onChange={(v) => set("contactEmail", v)} />
      <TextField label="Contact phone" value={f.contactPhone} onChange={(v) => set("contactPhone", v)} />
      <SaveBar
        saving={update.isPending}
        saved={saved}
        onSave={async () => {
          setSaved(false);
          await update.mutateAsync({
            name: f.name,
            billingAddress: f.billingAddress,
            vatNumber: f.vatNumber,
            contactEmail: f.contactEmail,
            contactPhone: f.contactPhone,
          });
          setSaved(true);
        }}
      />
    </div>
  );
}

function SitesTab() {
  const query = trpc.sites.list.useQuery();
  const utils = trpc.useUtils();
  const setActive = trpc.sites.setActive.useMutation({
    onSuccess: () => utils.sites.list.invalidate(),
  });

  if (query.isLoading || !query.data) {
    return <p className="text-slate">Loading…</p>;
  }
  return (
    <div className="space-y-3">
      {query.data.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between rounded-xl border border-line bg-white p-4"
        >
          <div>
            <p className="font-heading font-semibold text-navy">{s.name}</p>
            <p className="text-sm text-slate">
              {s.address ?? "No address"} · {s._count.users} staff · {s._count.bookings} bookings
            </p>
          </div>
          <ToggleRow
            label=""
            checked={s.isActive}
            onChange={(v) => setActive.mutate({ id: s.id, isActive: v })}
          />
        </div>
      ))}
    </div>
  );
}

function ServicesTab() {
  const query = trpc.orgSettings.listServiceTypes.useQuery();
  const utils = trpc.useUtils();
  const saveCodes = trpc.orgSettings.saveNominalCodes.useMutation({
    onSuccess: () => utils.orgSettings.listServiceTypes.invalidate(),
  });
  const setActive = trpc.orgSettings.setServiceActive.useMutation({
    onSuccess: () => utils.orgSettings.listServiceTypes.invalidate(),
  });
  const [codes, setCodes] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);

  if (query.isLoading || !query.data) {
    return <p className="text-slate">Loading…</p>;
  }
  const rows = query.data;
  const codeFor = (name: string) =>
    codes?.[name] ?? rows.find((r) => r.name === name)?.nominalCode ?? "";

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate">
        Service nominal codes map each service to a Xero account code for invoicing.
      </p>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-slate">
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Nominal code</th>
              <th className="px-4 py-3 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-navy">{r.name}</td>
                <td className="px-4 py-3 text-slate">{r.durationMins} min</td>
                <td className="px-4 py-3">
                  <input
                    value={codeFor(r.name)}
                    onChange={(e) =>
                      setCodes({ ...(codes ?? {}), [r.name]: e.target.value })
                    }
                    placeholder="e.g. 200"
                    className="h-9 w-28 rounded-lg border border-line bg-white px-2 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                  />
                </td>
                <td className="px-4 py-3">
                  <ToggleRow
                    label=""
                    checked={r.isActive}
                    onChange={(v) => setActive.mutate({ name: r.name, isActive: v })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SaveBar
        saving={saveCodes.isPending}
        saved={saved}
        label="Save nominal codes"
        onSave={async () => {
          setSaved(false);
          await saveCodes.mutateAsync({
            codes: rows.map((r) => ({ name: r.name, nominalCode: codeFor(r.name) })),
          });
          setSaved(true);
        }}
      />
    </div>
  );
}

function FeaturesTab() {
  const query = trpc.orgSettings.getFeatures.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.orgSettings.updateFeatures.useMutation({
    onSuccess: () => utils.orgSettings.getFeatures.invalidate(),
  });
  const [state, setState] = useState<Record<FeatureKey, boolean> | null>(null);
  const [saved, setSaved] = useState(false);

  if (query.isLoading || !query.data) {
    return <p className="text-slate">Loading…</p>;
  }
  const data = query.data;
  const available = new Set(data.available);
  const enabled = state ?? data.enabled;
  const keys: FeatureKey[] = ["inspection", "photography", "freshScent", "paintProtection", "xero"];

  return (
    <div className="max-w-xl space-y-3">
      <p className="text-sm text-slate">
        Your plan: <span className="font-semibold text-navy">{data.planName}</span>. Greyed-out
        features require a plan upgrade.
      </p>
      {keys.map((k) => {
        const inPlan = available.has(k);
        return (
          <div key={k} className={inPlan ? "" : "opacity-50"}>
            <ToggleRow
              label={FEATURE_LABELS[k]}
              description={inPlan ? undefined : "Not included in your plan"}
              checked={(enabled[k] ?? false) && inPlan}
              onChange={(v) => inPlan && setState({ ...enabled, [k]: v })}
            />
          </div>
        );
      })}
      <SaveBar
        saving={update.isPending}
        saved={saved}
        onSave={async () => {
          setSaved(false);
          await update.mutateAsync({
            inspection: enabled.inspection,
            photography: enabled.photography,
            freshScent: enabled.freshScent,
            paintProtection: enabled.paintProtection,
            xero: enabled.xero,
          });
          setSaved(true);
        }}
      />
    </div>
  );
}

function XeroTab() {
  const utils = trpc.useUtils();
  const conn = trpc.xero.getConnection.useQuery();
  const disconnect = trpc.xero.disconnect.useMutation({
    onSuccess: () => utils.xero.getConnection.invalidate(),
  });

  if (conn.isLoading) {
    return <p className="text-slate">Loading…</p>;
  }

  if (!conn.data) {
    return (
      <div className="max-w-xl space-y-4 rounded-xl border border-line bg-white p-6">
        <h2 className="font-heading text-lg font-bold text-navy">Connect to Xero</h2>
        <p className="text-sm text-slate">
          Link your Xero organisation to push valeting invoices straight into your accounts.
        </p>
        <a
          href="/api/xero/connect"
          className="inline-flex h-11 items-center rounded-lg px-6 font-heading font-semibold text-white"
          style={{ backgroundColor: "#1AB4D7" }}
        >
          Connect to Xero
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-line bg-white p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <p className="font-heading font-semibold text-navy">
              Connected to {conn.data.tenantName}
            </p>
          </div>
          <p className="mt-1 text-sm text-slate">
            {conn.data.lastSyncAt
              ? `Last sync ${new Date(conn.data.lastSyncAt).toLocaleString("en-GB")}`
              : "No invoices synced yet"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
          className="h-11 rounded-lg border border-danger px-4 font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-60"
        >
          Disconnect
        </button>
      </div>

      <NominalMappingCard />
      <InvoiceSettingsCard
        prefix={conn.data.invoicePrefix}
        paymentTerms={conn.data.paymentTerms}
        taxType={conn.data.taxType}
        autoPush={conn.data.autoPush}
      />
    </div>
  );
}

function NominalMappingCard() {
  const utils = trpc.useUtils();
  const services = trpc.orgSettings.listServiceTypes.useQuery();
  const mappings = trpc.xero.getNominalMappings.useQuery();
  const accounts = trpc.xero.getXeroAccounts.useQuery(undefined, { retry: false });
  const save = trpc.xero.saveNominalMappings.useMutation({
    onSuccess: () => utils.xero.getNominalMappings.invalidate(),
  });
  const [codes, setCodes] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);

  if (services.isLoading || mappings.isLoading) {
    return <p className="text-slate">Loading…</p>;
  }
  const rows = services.data ?? [];
  const existing = new Map((mappings.data ?? []).map((m) => [m.serviceTypeId, m.xeroAccountCode]));
  const codeFor = (id: string) => codes?.[id] ?? existing.get(id) ?? "";

  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-6">
      <h2 className="font-heading text-lg font-bold text-navy">Nominal code mapping</h2>
      <p className="text-sm text-slate">
        Map each service to a Xero account code. Invoices use these codes when posted.
      </p>
      {accounts.error && (
        <p className="text-sm text-warning">
          Could not load Xero accounts — enter codes manually.
        </p>
      )}
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-slate">
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Xero account</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-navy">{r.name}</td>
                <td className="px-4 py-3">
                  {accounts.data && accounts.data.length > 0 ? (
                    <select
                      value={codeFor(r.id)}
                      onChange={(e) => setCodes({ ...(codes ?? {}), [r.id]: e.target.value })}
                      className="h-9 w-64 rounded-lg border border-line bg-white px-2 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                    >
                      <option value="">— Not mapped —</option>
                      {accounts.data.map((a) => (
                        <option key={a.accountId} value={a.code}>
                          {a.code} · {a.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={codeFor(r.id)}
                      onChange={(e) => setCodes({ ...(codes ?? {}), [r.id]: e.target.value })}
                      placeholder="e.g. 200"
                      className="h-9 w-32 rounded-lg border border-line bg-white px-2 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SaveBar
        saving={save.isPending}
        saved={saved}
        label="Save mapping"
        onSave={async () => {
          setSaved(false);
          await save.mutateAsync({
            mappings: rows.map((r) => {
              const code = codeFor(r.id);
              const account = accounts.data?.find((a) => a.code === code);
              return {
                serviceTypeId: r.id,
                xeroAccountCode: code,
                xeroAccountId: account?.accountId ?? null,
                xeroAccountName: account?.name ?? null,
                taxType: account?.taxType,
              };
            }),
          });
          setSaved(true);
        }}
      />
    </div>
  );
}

function InvoiceSettingsCard({
  prefix,
  paymentTerms,
  taxType,
  autoPush,
}: {
  prefix: string;
  paymentTerms: number;
  taxType: string;
  autoPush: string;
}) {
  const utils = trpc.useUtils();
  const update = trpc.xero.updateInvoiceSettings.useMutation({
    onSuccess: () => utils.xero.getConnection.invalidate(),
  });
  const [form, setForm] = useState({ prefix, paymentTerms, taxType, autoPush });
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-line bg-white p-6">
      <h2 className="font-heading text-lg font-bold text-navy">Invoice settings</h2>
      <TextField
        label="Invoice prefix"
        value={form.prefix}
        onChange={(v) => setForm({ ...form, prefix: v })}
      />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">Payment terms</span>
        <select
          value={form.paymentTerms}
          onChange={(e) => setForm({ ...form, paymentTerms: Number(e.target.value) })}
          className="h-11 w-full rounded-lg border border-line bg-white px-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </label>
      <TextField
        label="Default tax type"
        value={form.taxType}
        onChange={(v) => setForm({ ...form, taxType: v })}
        hint="Xero tax type code, e.g. OUTPUT2 for 20% VAT."
      />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">Auto-push invoices</span>
        <select
          value={form.autoPush}
          onChange={(e) => setForm({ ...form, autoPush: e.target.value })}
          className="h-11 w-full rounded-lg border border-line bg-white px-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        >
          <option value="manual">Manual — push from billing page</option>
          <option value="generated">When generated</option>
          <option value="approved">When approved</option>
        </select>
      </label>
      <SaveBar
        saving={update.isPending}
        saved={saved}
        onSave={async () => {
          setSaved(false);
          await update.mutateAsync({
            invoicePrefix: form.prefix,
            paymentTerms: form.paymentTerms,
            taxType: form.taxType,
            autoPush: form.autoPush as "generated" | "approved" | "manual",
          });
          setSaved(true);
        }}
      />
    </div>
  );
}
