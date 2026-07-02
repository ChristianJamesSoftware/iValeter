"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldCheck, Sparkles, Droplets, Camera, Ban } from "lucide-react";
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

/** Returns today's date as YYYY-MM-DD */
function defaultBookingDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Default time: next slot at or after now, capped to 08:00–17:00 */
function defaultBookingTime(): string {
  const now = new Date();
  let h = now.getHours();
  let m = Math.ceil(now.getMinutes() / 15) * 15;
  if (m >= 60) { h += 1; m = 0; }
  if (h < 8) { h = 8; m = 0; }
  if (h >= 17) { h = 17; m = 0; }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Build ISO-like string for datetime from date YYYY-MM-DD + time HH:MM */
function combineDateAndTime(date: string, time: string): string {
  return `${date}T${time}`;
}

/** All 15-min slots from 08:00 to 17:00 */
const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 8; h <= 17; h++) {
    const maxM = h === 17 ? 0 : 45;
    for (let m = 0; m <= maxM; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
})();

function formatSlotLabel(time: string): string {
  const [hStr = "0", mStr = "00"] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m} ${period}`;
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
  type VehicleSizeOption = "" | "SMALL" | "MEDIUM" | "LARGE" | "XL" | "VAN";
  const [vehicleReg, setVehicleReg] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleSize, setVehicleSize] = useState<VehicleSizeOption>("");
  const [vehicleColour, setVehicleColour] = useState("");
  const [dvlaStatus, setDvlaStatus] = useState<"idle"|"loading"|"found"|"error">("idle");
  const dvlaTimerRef = React.useRef<ReturnType<typeof setTimeout>|null>(null);
  const [customerName, setCustomerName] = useState("");
  const [bookingDate, setBookingDate] = useState(defaultBookingDate());
  const [bookingTime, setBookingTime] = useState(defaultBookingTime());
  // Combined value used by allocation check and form submit
  const readyByTime = combineDateAndTime(bookingDate, bookingTime);
  const [isPriority, setIsPriority] = useState(false);
  const [doNotClean, setDoNotClean] = useState(false);

  const [overrideDuplicate, setOverrideDuplicate] = useState(false);
  const dupTimerRef = React.useRef<ReturnType<typeof setTimeout>|null>(null);
  const [dupCheckReg, setDupCheckReg] = useState("");
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

  // Allocation check — runs when site + date are both set
  const allocationDate = readyByTime ? new Date(readyByTime) : null;
  const allocationQuery = trpc.bookings.getDayAllocation.useQuery(
    {
      siteId,
      date: allocationDate!,
      capacityMinsPerValeter: 480,
    },
    {
      enabled: !!(siteId && allocationDate && !isNaN(allocationDate.getTime())),
      staleTime: 30_000,
    },
  );

  // Duplicate check — fires debounced 500ms when vehicleReg >= 3 chars
  const dupQuery = trpc.bookings.checkDuplicate.useQuery(
    { vehicleReg: dupCheckReg, siteId },
    { enabled: dupCheckReg.length >= 3 && !!siteId },
  );

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

  const hasDuplicate = !!(dupQuery.data && !overrideDuplicate);

  const canSubmit =
    siteId &&
    departmentId &&
    serviceTypeId &&
    vehicleReg.trim() &&
    readyByTime &&
    !create.isPending &&
    !hasDuplicate;

  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div className="space-y-4">
        <Field label="Vehicle Registration">
          <div className="space-y-2">
            {/* UK rear number plate — yellow, GB badge, dealer name */}
            <div style={{ background: "#F5C500", border: "2px solid #333", borderRadius: 6, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
              {/* Main plate row — position:relative so reg input can span full width */}
              <div style={{ position: "relative", display: "flex", alignItems: "stretch", height: 80 }}>
                {/* GB badge — sits in the top-left, does NOT push reg off-centre */}
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 52, background: "#003399", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px 5px", zIndex: 1 }}>
                  <svg width="36" height="24" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 2, display: "block" }}>
                    <rect width="60" height="40" fill="#012169"/>
                    <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="10"/>
                    <path d="M0,0 L60,40" stroke="#C8102E" strokeWidth="6"/>
                    <path d="M60,0 L0,40" stroke="#C8102E" strokeWidth="6"/>
                    <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="14"/>
                    <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="8"/>
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.04em", color: "#F5C500", fontFamily: "'Arial Black', Arial, sans-serif", lineHeight: 1 }}>GB</span>
                </div>
                {/* Reg input — absolutely spans full plate width so text-align:center is truly centred */}
                <input
                  value={vehicleReg}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "");
                    setVehicleReg(val);
                    setDvlaStatus("idle");
                    setVehicleMake(""); setVehicleModel(""); setVehicleColour("");
                    setOverrideDuplicate(false);
                    if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
                    dupTimerRef.current = setTimeout(() => {
                      const clean = val.replace(/\s/g, "");
                      if (clean.length >= 3) setDupCheckReg(clean);
                      else setDupCheckReg("");
                    }, 500);
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
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    textAlign: "center",
                    fontSize: 44,
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    color: "#1a1a1a",
                    fontFamily: "'Charles Wright', 'Arial Black', Arial, sans-serif",
                    zIndex: 0,
                  }}
                />
                {/* Status indicator — top-right corner */}
                <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
                  {dvlaStatus === "loading" && <svg className="h-4 w-4 animate-spin text-slate-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                  {dvlaStatus === "found" && <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  {dvlaStatus === "error" && <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>}
                </div>
              </div>
              {/* Customer name strip — full width so text-align:center is centred across the whole plate */}
              <div style={{ background: "#1a1a1a", padding: "3px 8px", textAlign: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.25em", color: "white", textTransform: "uppercase" }}>
                  {customerName.trim() || site?.name || "iValeter"}
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

        <Field label="Vehicle Size">
          <Select value={vehicleSize} onChange={(v) => setVehicleSize(v as VehicleSizeOption)}>
            <option value="">Select size…</option>
            <option value="SMALL">Small — e.g. Hatchback, City Car</option>
            <option value="MEDIUM">Medium — e.g. Saloon, Small SUV (baseline)</option>
            <option value="LARGE">Large — e.g. Estate, Large SUV</option>
            <option value="XL">XL — e.g. Large 4×4, Pickup</option>
            <option value="VAN">Van — e.g. Transit, Sprinter</option>
          </Select>
        </Field>

        <Field label="Ready By">
          <div className="flex gap-3">
            {/* Date */}
            <input
              type="date"
              value={bookingDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBookingDate(e.target.value)}
              className="h-12 flex-1 rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
            />
            {/* Time — restricted to 08:00–17:00 in 15-min slots */}
            <select
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              className="h-12 w-36 rounded-lg border border-line bg-white px-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {formatSlotLabel(slot)}
                </option>
              ))}
            </select>
          </div>
        </Field>

        {/* ── Over-allocation warning ─────────────────────────── */}
        {allocationQuery.data?.isOverAllocated && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold">Valeters over capacity on this day</p>
              <p className="mt-0.5 text-xs text-amber-700">
                One or more valeters already have more than 8 hours of bookings on{" "}
                {allocationDate
                  ? allocationDate.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : "this date"}
                . You can still book — but you may need to arrange extra valeting resource.
              </p>
              {allocationQuery.data.overAllocatedValeters.map((v) => (
                <p key={v.id} className="mt-1 text-xs text-amber-700">
                  {v.name}: {Math.round(v.bookedMins / 60 * 10) / 10}h booked
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ── Duplicate booking warning ─────────────────────────── */}
        {dupQuery.data && !overrideDuplicate && (
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900">Active job already exists for {dupQuery.data.vehicleReg}</p>
                <p className="mt-1 text-sm text-amber-800">
                  Site: {dupQuery.data.site?.name ?? "—"} · Status: {dupQuery.data.status} · Booked: {new Date(dupQuery.data.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
                <p className="mt-1 text-sm text-amber-700">This may be a demo or cleaning vehicle.</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideDuplicate(true)}
                    className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                  >
                    Continue anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* ---- Do Not Clean — least used, sits at the bottom ---- */}
        <button
          type="button"
          onClick={() => setDoNotClean((v) => !v)}
          className={cn(
            "w-full rounded-lg border-2 px-4 py-3 text-left transition",
            doNotClean
              ? "border-red-500 bg-red-50"
              : "border-line bg-white",
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "flex items-center gap-2 font-bold",
                doNotClean ? "text-red-700" : "text-slate",
              )}
            >
              <Ban className="h-5 w-5" />
              {doNotClean ? "DO NOT CLEAN — Flag is ON" : "Do Not Clean this vehicle"}
            </span>
            <span
              className={cn(
                "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
                doNotClean ? "bg-red-600" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "h-5 w-5 rounded-full bg-white transition",
                  doNotClean && "translate-x-5",
                )}
              />
            </span>
          </div>
          <p className={cn("mt-1 pl-7 text-sm", doNotClean ? "text-red-600 font-semibold" : "text-slate")}>
            {doNotClean
              ? "Valeters will see a red warning — this vehicle must not be washed"
              : "Customer has requested no cleaning on this vehicle"}
          </p>
        </button>

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
              customerName: undefined,
              readyByTime: new Date(readyByTime),
              isPriority,
              includeInspection,
              includeFreshScent,
              paintProtectionTier: includePaintProtection
                ? paintProtectionTier
                : null,
              photographyPackage: includePhotography ? photographyPackage : null,
              vehicleSize: vehicleSize || undefined,
              doNotClean,
              budgetLimit: null,
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
