"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { SettingsTabs } from "@/components/settings/tabs";
import { TextField, SaveBar } from "@/components/settings/field";
import { ToggleRow } from "@/components/settings/toggle";
import { FEATURE_LABELS, type FeatureKey } from "@ivaleter/api/plans";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "sites", label: "Sites" },
  { key: "services", label: "Services" },
  { key: "features", label: "Features" },
];

export function OrgSettingsClient() {
  const [tab, setTab] = useState("profile");
  return (
    <div>
      <SettingsTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "profile" && <ProfileTab />}
      {tab === "sites" && <SitesTab />}
      {tab === "services" && <ServicesTab />}
      {tab === "features" && <FeaturesTab />}
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
