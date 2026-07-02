"use client";

import { useMemo, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/react";
import { SettingsTabs } from "@/components/settings/tabs";
import { TextField, SaveBar } from "@/components/settings/field";
import { ToggleRow } from "@/components/settings/toggle";
import { AddOnsTab } from "@/components/settings/add-ons-tab";
import { ManagementTeamTab } from "@/components/settings/management-team-tab";
import { ValetLibraryTab } from "@/components/settings/valet-library-tab";
import { SupportServicesTab } from "@/components/settings/support-services-tab";
import { VehicleSizesTab } from "@/components/settings/vehicle-sizes-tab";
import { PaintProtectionTab } from "@/components/settings/paint-protection-tab";
import { LogoUpload } from "@/components/ui/logo-upload";


const TABS = [
  { key: "platform", label: "Platform" },
  { key: "integrations", label: "Integrations" },
  { key: "flags", label: "Feature Flags" },
  { key: "addons", label: "Add-Ons" },
  { key: "team", label: "Management Team" },
  { key: "library", label: "Valet Library" },
  { key: "support", label: "CSI Services" },
  { key: "vehicle-sizes", label: "Vehicle Sizes" },
  { key: "paint-protection", label: "Paint Protection" },
];

const FLAG_KEYS: Array<{ key: string; label: string; description: string }> = [
  { key: "FLAG_VEHICLE_INSPECTION", label: "Vehicle Inspection", description: "Pre-valet inspection photo capture" },
  { key: "FLAG_PHOTOGRAPHY", label: "Photography", description: "Vehicle photography service" },
  { key: "FLAG_PAINT_PROTECTION", label: "Paint Protection", description: "Paint protection add-on tiers" },
  { key: "FLAG_FRESH_SCENT", label: "Fresh Scent", description: "Cabin fragrance add-on" },
];

export function AdminSettingsClient() {
  const [tab, setTab] = useState("platform");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t && TABS.some((tabItem) => tabItem.key === t)) setTab(t);
  }, []);
  const query = trpc.platform.get.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.platform.update.useMutation({
    onSuccess: () => utils.platform.get.invalidate(),
  });

  const entries = query.data ?? [];
  const get = useMemo(() => {
    const map = new Map(entries.map((e) => [e.key, e]));
    return (key: string) => map.get(key);
  }, [entries]);

  if (query.isLoading) {
    return <p className="text-slate">Loading settings…</p>;
  }

  return (
    <div>
      <SettingsTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "platform" && (
        <PlatformTab get={get} save={(v) => update.mutateAsync({ values: v })} pending={update.isPending} />
      )}
      {tab === "integrations" && (
        <IntegrationsTab get={get} save={(v) => update.mutateAsync({ values: v })} pending={update.isPending} />
      )}
      {tab === "flags" && (
        <FlagsTab get={get} save={(v) => update.mutateAsync({ values: v })} pending={update.isPending} />
      )}
      {tab === "addons" && <AddOnsTab />}
      {tab === "team" && <ManagementTeamTab />}
      {tab === "library" && <ValetLibraryTab />}
      {tab === "support" && <SupportServicesTab />}
      {tab === "vehicle-sizes" && <VehicleSizesTab />}
      {tab === "paint-protection" && <PaintProtectionTab />}

    </div>
  );
}

type GetFn = (key: string) => { value: string; isSet: boolean } | undefined;
type SaveFn = (values: Array<{ key: string; value: string }>) => Promise<unknown>;

function PlatformTab({ get, save, pending }: { get: GetFn; save: SaveFn; pending: boolean }) {
  const [name, setName] = useState(get("PLATFORM_NAME")?.value ?? "");
  const [email, setEmail] = useState(get("SUPPORT_EMAIL")?.value ?? "");
  const [leave, setLeave] = useState(get("DEFAULT_LEAVE_DAYS")?.value ?? "");
  const [tvLogo, setTvLogo] = useState(get("TV_LOGO_URL")?.value ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-line bg-white p-6">
      <TextField label="Platform name" value={name} onChange={setName} />
      <TextField label="Support email" value={email} onChange={setEmail} type="email" />
      <TextField label="Default leave allowance (days/year)" value={leave} onChange={setLeave} type="number" />

      <div className="border-t border-line pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate">Branding</p>
        <LogoUpload
          value={tvLogo}
          onChange={setTvLogo}
          label="Total Valeting logo"
          hint="PNG, JPG, SVG or WEBP · Max 500 KB · Shown on the customer dashboard partnership banner."
        />
      </div>

      <SaveBar
        saving={pending}
        saved={saved}
        onSave={async () => {
          setSaved(false);
          await save([
            { key: "PLATFORM_NAME", value: name },
            { key: "SUPPORT_EMAIL", value: email },
            { key: "DEFAULT_LEAVE_DAYS", value: leave },
            { key: "TV_LOGO_URL", value: tvLogo },
          ]);
          setSaved(true);
        }}
      />
    </div>
  );
}

function IntegrationsTab({ get, save, pending }: { get: GetFn; save: SaveFn; pending: boolean }) {
  const [redirect, setRedirect] = useState(get("XERO_REDIRECT_URI")?.value ?? "");
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-line bg-white p-6">
      <h2 className="font-heading text-lg font-bold text-navy">Xero credentials</h2>
      <p className="text-sm text-slate">
        Total Valeting registers one Xero app; every organisation connects through it via OAuth.
      </p>
      <SecretField label="Xero Client ID" isSet={get("XERO_CLIENT_ID")?.isSet ?? false} value={clientId} onChange={setClientId} />
      <SecretField label="Xero Client Secret" isSet={get("XERO_CLIENT_SECRET")?.isSet ?? false} value={secret} onChange={setSecret} />
      <TextField
        label="Xero Redirect URI"
        value={redirect}
        onChange={setRedirect}
        placeholder="https://app.example.com/api/xero/callback"
        hint="Must match the redirect URI registered in your Xero app."
      />
      <SaveBar
        saving={pending}
        saved={saved}
        onSave={async () => {
          setSaved(false);
          await save([
            { key: "XERO_CLIENT_ID", value: clientId },
            { key: "XERO_CLIENT_SECRET", value: secret },
            { key: "XERO_REDIRECT_URI", value: redirect },
          ]);
          setClientId("");
          setSecret("");
          setSaved(true);
        }}
      />
    </div>
  );
}

function FlagsTab({ get, save, pending }: { get: GetFn; save: SaveFn; pending: boolean }) {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FLAG_KEYS.map((f) => [f.key, (get(f.key)?.value ?? "true") === "true"])),
  );
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-xl space-y-3">
      <p className="text-sm text-slate">
        Global toggles. These apply as defaults when onboarding new organisations.
      </p>
      {FLAG_KEYS.map((f) => (
        <ToggleRow
          key={f.key}
          label={f.label}
          description={f.description}
          checked={state[f.key] ?? false}
          onChange={(v) => setState((s) => ({ ...s, [f.key]: v }))}
        />
      ))}
      <SaveBar
        saving={pending}
        saved={saved}
        onSave={async () => {
          setSaved(false);
          await save(FLAG_KEYS.map((f) => ({ key: f.key, value: state[f.key] ? "true" : "false" })));
          setSaved(true);
        }}
      />
    </div>
  );
}

function SecretField({
  label,
  isSet,
  value,
  onChange,
}: {
  label: string;
  isSet: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(!isSet);
  if (!editing) {
    return (
      <div>
        <span className="mb-1 block text-sm font-medium text-navy">{label}</span>
        <div className="flex items-center gap-3">
          <span className="flex h-11 flex-1 items-center rounded-lg border border-line bg-offwhite px-3 font-mono text-slate">
            •••••••••••••
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-11 rounded-lg border border-line px-4 font-semibold text-navy transition hover:bg-offwhite"
          >
            Update
          </button>
        </div>
      </div>
    );
  }
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      placeholder={isSet ? "Enter new value to replace" : "Enter value"}
    />
  );
}
