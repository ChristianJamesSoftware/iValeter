"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldCheck, Sparkles, Droplets, Camera } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type PaintTier = "essential" | "standard" | "premium" | "ultimate";
type PhotoPackage = "standard" | "premium" | "full";

const PHOTO_PACKAGES: { key: PhotoPackage; name: string; count: number }[] = [
  { key: "standard", name: "Standard", count: 10 },
  { key: "premium", name: "Premium", count: 25 },
  { key: "full", name: "Full", count: 40 },
];

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
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColour, setVehicleColour] = useState("");
  const [dvlaStatus, setDvlaStatus] = useState<"idle"|"loading"|"found"|"error">("idle");
  const dvlaTimerRef = React.useRef<ReturnType<typeof setTimeout>|null>(null);
  const [customerName, setCustomerName] = useState("");
  const [readyByTime, setReadyByTime] = useState(defaultReadyBy());
  const [isPriority, setIsPriority] = useState(false);
  const [includeInspection, setIncludeInspection] = useState(false);
  const [includeFreshScent, setIncludeFreshScent] = useState(false);
  const [includePaintProtection, setIncludePaintProtection] = useState(false);
  const [paintProtectionTier, setPaintProtectionTier] =
    useState<PaintTier>("essential");
  const [includePhotography, setIncludePhotography] = useState(false);
  const [photographyPackage, setPhotographyPackage] =
    useState<PhotoPackage>("standard");

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
          <div className="space-y-2">
            {/* UK rear number plate — yellow, England flag, dealer name */}
            <div style={{ background: "#FFC700", border: "4px solid #1a1a1a", borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
              {/* Main plate row */}
              <div className="relative flex items-center gap-3 px-3 py-1">
                {/* England flag badge */}
                <div className="shrink-0 flex flex-col items-center gap-0.5">
                  <div style={{ width: 30, height: 38, border: "1.5px solid #aaa", borderRadius: 3, overflow: "hidden" }}>
                    <svg width="30" height="38" viewBox="0 0 60 38" xmlns="http://www.w3.org/2000/svg">
                      <rect width="60" height="38" fill="#012169"/>
                      <polygon points="0,0 8,0 60,34 60,38 52,38 0,4" fill="white"/>
                      <polygon points="60,0 52,0 0,34 0,38 8,38 60,4" fill="white"/>
                      <polygon points="0,0 5,0 60,36 60,38 55,38 0,2" fill="#C8102E"/>
                      <polygon points="60,0 55,0 0,36 0,38 5,38 60,2" fill="#C8102E"/>
                      <rect x="24" y="0" width="12" height="38" fill="white"/>
                      <rect x="0" y="13" width="60" height="12" fill="white"/>
                      <rect x="26" y="0" width="8" height="38" fill="#C8102E"/>
                      <rect x="0" y="15" width="60" height="8" fill="#C8102E"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", color: "#1a1a1a" }}>GB</span>
                </div>
                {/* Reg input */}
                <input
                  value={vehicleReg}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "");
                    setVehicleReg(val);
                    setDvlaStatus("idle");
                    setVehicleMake(""); setVehicleModel(""); setVehicleColour("");
                    if (dvlaTimerRef.current) clearTimeout(dvlaTimerRef.current);
                    const clean = val.replace(/\s/g, "");
                    if (clean.length >= 5) {
                      dvlaTimerRef.current = setTimeout(async () => {
                        setDvlaStatus("loading");
                        try {
                          const res = await fetch("/api/dvla", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ registrationNumber: clean }),
                          });
                          if (!res.ok) { setDvlaStatus("error"); return; }
                          const data = await res.json() as { make?: string; model?: string; colour?: string };
                          setVehicleMake(data.make ?? "");
                          setVehicleModel(data.model ?? "");
                          setVehicleColour(data.colour ?? "");
                          setDvlaStatus("found");
                        } catch { setDvlaStatus("error"); }
                      }, 600);
                    }
                  }}
                  placeholder="AB12 CDE"
                  maxLength={8}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    textAlign: "center",
                    fontSize: 44,
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    color: "#1a1a1a",
                    height: 64,
                    fontFamily: "'Charles Wright', 'Arial Black', Arial, sans-serif",
                  }}
                />
                {/* Status indicator */}
                <div className="shrink-0 w-5 flex items-center justify-center">
                  {dvlaStatus === "loading" && <svg className="h-4 w-4 animate-spin text-slate-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                  {dvlaStatus === "found" && <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  {dvlaStatus === "error" && <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>}
                </div>
              </div>
              {/* Dealer name strip — bottom of plate */}
              <div style={{ background: "#1a1a1a", padding: "3px 8px", display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.25em", color: "white", textTransform: "uppercase" }}>
                  {site?.name ?? "iValeter"}
                </span>
              </div>
            </div>
            {dvlaStatus === "found" && (vehicleMake || vehicleColour) && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                <svg className="h-3.5 w-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span className="text-sm font-semibold text-slate-800">
                  {[vehicleMake, vehicleModel, vehicleColour].filter(Boolean).join(" · ")}
                </span>
              </div>
            )}
            {dvlaStatus === "error" && (
              <p className="text-xs text-red-500 px-1">Vehicle not found — enter details manually below</p>
            )}
          </div>
        </Field>
        {(dvlaStatus === "found" || vehicleMake) && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Make">
              <input value={vehicleMake} onChange={e => setVehicleMake(e.target.value.toUpperCase())} placeholder="VOLKSWAGEN" className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </Field>
            <Field label="Model">
              <input value={vehicleModel} onChange={e => setVehicleModel(e.target.value.toUpperCase())} placeholder="GOLF" className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </Field>
            <Field label="Colour">
              <input value={vehicleColour} onChange={e => setVehicleColour(e.target.value.toUpperCase())} placeholder="SILVER" className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </Field>
          </div>
        )}

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

        {/* ---- Photography ---- */}
        <div className="rounded-xl border border-line bg-offwhite p-4">
          <button
            type="button"
            onClick={() => setIncludePhotography((v) => !v)}
            className={cn(
              "w-full rounded-lg border-2 px-4 py-3 text-left transition",
              includePhotography ? "border-cyan bg-cyan/10" : "border-line bg-white",
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "flex items-center gap-2 font-semibold",
                  includePhotography ? "text-navy" : "text-slate",
                )}
              >
                <Camera className="h-5 w-5 text-cyan-600" />
                Vehicle Photography
              </span>
              <span
                className={cn(
                  "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
                  includePhotography ? "bg-cyan" : "bg-line",
                )}
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded-full bg-white transition",
                    includePhotography && "translate-x-5",
                  )}
                />
              </span>
            </div>
            <p className="mt-1 pl-7 text-sm text-slate">
              Professional photo set shared with the dealership for listings
            </p>
          </button>

          {includePhotography && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {PHOTO_PACKAGES.map((p) => {
                const selected = photographyPackage === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPhotographyPackage(p.key)}
                    className={cn(
                      "rounded-lg border-2 p-3 text-center transition",
                      selected
                        ? "border-cyan bg-cyan/10 ring-2 ring-cyan/30"
                        : "border-line bg-white hover:border-cyan/50",
                    )}
                  >
                    <span className="block font-heading font-bold text-navy">
                      {p.name}
                    </span>
                    <span className="block text-sm text-cyan-600">
                      {p.count} photos
                    </span>
                  </button>
                );
              })}
            </div>
          )}
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
              photographyPackage: includePhotography ? photographyPackage : null,
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
