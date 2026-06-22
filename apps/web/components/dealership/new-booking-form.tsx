"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldCheck, Sparkles, Droplets } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type PaintTier = "essential" | "standard" | "premium" | "ultimate";

const PAINT_TIERS: {
  key: PaintTier;
  name: string;
  duration: string;
  description: string;
  popular?: boolean;
}[] = [
  {
    key: "essential",
    name: "Essential",
    duration: "6 months",
    description: "Entry-level gloss and hydrophobic protection",
    popular: true,
  },
  {
    key: "standard",
    name: "Standard",
    duration: "1 year",
    description: "Durable sealant for everyday driving",
  },
  {
    key: "premium",
    name: "Premium",
    duration: "5 years",
    description: "Ceramic-grade protection and deep shine",
  },
  {
    key: "ultimate",
    name: "Ultimate",
    duration: "10 years",
    description: "Showroom finish with maximum longevity",
  },
];

interface ServiceTypeOpt {
  id: string;
  name: string;
  durationMins: number;
}
interface DeptOpt {
  id: string;
  name: string;
  serviceTypes: ServiceTypeOpt[];
}
interface SiteOpt {
  id: string;
  name: string;
  departments: DeptOpt[];
}

function defaultReadyBy(): string {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  // round to nearest 5 min, format for datetime-local
  d.setMinutes(Math.round(d.getMinutes() / 5) * 5, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewBookingForm({ sites }: { sites: SiteOpt[] }) {
  const router = useRouter();
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [departmentId, setDepartmentId] = useState(
    sites[0]?.departments[0]?.id ?? "",
  );
  const [serviceTypeId, setServiceTypeId] = useState(
    sites[0]?.departments[0]?.serviceTypes[0]?.id ?? "",
  );
  const [vehicleReg, setVehicleReg] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [readyByTime, setReadyByTime] = useState(defaultReadyBy());
  const [isPriority, setIsPriority] = useState(false);
  const [includeInspection, setIncludeInspection] = useState(false);
  const [includeFreshScent, setIncludeFreshScent] = useState(false);
  const [includePaintProtection, setIncludePaintProtection] = useState(false);
  const [paintProtectionTier, setPaintProtectionTier] =
    useState<PaintTier>("essential");

  const site = useMemo(() => sites.find((s) => s.id === siteId), [sites, siteId]);
  const departments = site?.departments ?? [];
  const department = departments.find((d) => d.id === departmentId);
  const serviceTypes = department?.serviceTypes ?? [];

  const create = trpc.bookings.create.useMutation({
    onSuccess: () => {
      router.push("/dealership");
      router.refresh();
    },
  });

  function onSiteChange(id: string) {
    setSiteId(id);
    const s = sites.find((x) => x.id === id);
    const d = s?.departments[0];
    setDepartmentId(d?.id ?? "");
    setServiceTypeId(d?.serviceTypes[0]?.id ?? "");
  }
  function onDeptChange(id: string) {
    setDepartmentId(id);
    const d = departments.find((x) => x.id === id);
    setServiceTypeId(d?.serviceTypes[0]?.id ?? "");
  }

  const canSubmit =
    siteId &&
    departmentId &&
    serviceTypeId &&
    vehicleReg.trim() &&
    customerName.trim() &&
    readyByTime &&
    !create.isPending;

  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div className="space-y-4">
        <Field label="Vehicle Registration">
          <input
            value={vehicleReg}
            onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
            placeholder="MK21 ABC"
            className="h-14 w-full rounded-lg border border-line bg-white px-4 font-heading text-2xl font-bold tracking-widest text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </Field>

        <Field label="Customer Name">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="John Smith"
            className="h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </Field>

        {sites.length > 1 && (
          <Field label="Site">
            <Select value={siteId} onChange={onSiteChange}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Department">
          <Select value={departmentId} onChange={onDeptChange}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Service Type">
          <Select value={serviceTypeId} onChange={setServiceTypeId}>
            {serviceTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.durationMins}m)
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Ready By">
          <input
            type="datetime-local"
            value={readyByTime}
            onChange={(e) => setReadyByTime(e.target.value)}
            className="h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </Field>

        <button
          type="button"
          onClick={() => setIsPriority((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 font-semibold transition",
            isPriority
              ? "border-danger bg-danger/10 text-danger"
              : "border-line bg-white text-slate",
          )}
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Mark as Priority
          </span>
          <span
            className={cn(
              "flex h-6 w-11 items-center rounded-full p-0.5 transition",
              isPriority ? "bg-danger" : "bg-line",
            )}
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full bg-white transition",
                isPriority && "translate-x-5",
              )}
            />
          </span>
        </button>

        {/* ---- Vehicle inspection ---- */}
        <button
          type="button"
          onClick={() => setIncludeInspection((v) => !v)}
          className={cn(
            "w-full rounded-lg border-2 px-4 py-3 text-left transition",
            includeInspection
              ? "border-warning bg-warning/10"
              : "border-line bg-white",
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "flex items-center gap-2 font-semibold",
                includeInspection ? "text-warning" : "text-slate",
              )}
            >
              <ShieldCheck className="h-5 w-5" />
              Include pre-valet vehicle inspection (+5 mins)
            </span>
            <span
              className={cn(
                "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
                includeInspection ? "bg-warning" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "h-5 w-5 rounded-full bg-white transition",
                  includeInspection && "translate-x-5",
                )}
              />
            </span>
          </div>
          <p className="mt-1 pl-7 text-sm text-slate">
            Photos taken before valeting protect against damage claims
          </p>
        </button>

        {/* ---- Sensory add-ons ---- */}
        <div className="rounded-xl border border-line bg-offwhite p-4">
          <h3 className="font-heading text-lg font-bold text-navy">
            CSI Sensory Standard Add-Ons
          </h3>
          <p className="mb-3 text-sm text-slate">
            See it. Smell it. Feel it. Hear it.
          </p>

          <div className="space-y-3">
            {/* Fresh scent */}
            <button
              type="button"
              onClick={() => setIncludeFreshScent((v) => !v)}
              className={cn(
                "w-full rounded-lg border-2 px-4 py-3 text-left transition",
                includeFreshScent
                  ? "border-success bg-success/10"
                  : "border-line bg-white",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex items-center gap-2 font-semibold",
                    includeFreshScent ? "text-success" : "text-slate",
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                  Fresh Scent (+2 mins)
                </span>
                <span
                  className={cn(
                    "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
                    includeFreshScent ? "bg-success" : "bg-line",
                  )}
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full bg-white transition",
                      includeFreshScent && "translate-x-5",
                    )}
                  />
                </span>
              </div>
              <p className="mt-1 pl-7 text-sm text-slate">
                Premium cabin fragrance — improves customer CSI scores
              </p>
            </button>

            {/* Paint protection */}
            <button
              type="button"
              onClick={() => setIncludePaintProtection((v) => !v)}
              className={cn(
                "w-full rounded-lg border-2 px-4 py-3 text-left transition",
                includePaintProtection
                  ? "border-cyan bg-cyan/10"
                  : "border-line bg-white",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex items-center gap-2 font-semibold",
                    includePaintProtection ? "text-navy" : "text-slate",
                  )}
                >
                  <Droplets className="h-5 w-5 text-cyan-600" />
                  Paint Protection (+60 mins)
                </span>
                <span
                  className={cn(
                    "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
                    includePaintProtection ? "bg-cyan" : "bg-line",
                  )}
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full bg-white transition",
                      includePaintProtection && "translate-x-5",
                    )}
                  />
                </span>
              </div>
            </button>

            {includePaintProtection && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PAINT_TIERS.map((tier) => {
                  const selected = paintProtectionTier === tier.key;
                  return (
                    <button
                      key={tier.key}
                      type="button"
                      onClick={() => setPaintProtectionTier(tier.key)}
                      className={cn(
                        "rounded-lg border-2 p-3 text-left transition",
                        selected
                          ? "border-cyan bg-cyan/10 ring-2 ring-cyan/30"
                          : "border-line bg-white hover:border-cyan/50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-navy">
                          {tier.name}
                        </span>
                        {tier.popular && (
                          <span className="rounded-full bg-cyan px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-cyan-600">
                        {tier.duration}
                      </p>
                      <p className="mt-0.5 text-xs text-slate">
                        {tier.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {create.error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {create.error.message}
          </p>
        )}

        <button
          disabled={!canSubmit}
          onClick={() =>
            create.mutate({
              siteId,
              departmentId,
              serviceTypeId,
              vehicleReg: vehicleReg.trim(),
              customerName: customerName.trim(),
              readyByTime: new Date(readyByTime),
              isPriority,
              includeInspection,
              includeFreshScent,
              paintProtectionTier: includePaintProtection
                ? paintProtectionTier
                : null,
            })
          }
          className="h-14 w-full rounded-lg bg-cyan font-heading text-lg font-bold text-navy transition hover:bg-cyan-600 disabled:opacity-60"
        >
          {create.isPending ? "Creating…" : "Create Booking"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-navy">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full rounded-lg border border-line bg-white px-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
    >
      {children}
    </select>
  );
}
