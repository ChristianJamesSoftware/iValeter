"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import {
  X, Plus, Car, AlertCircle, ChevronDown, CheckCircle2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type VehicleSize = "SMALL" | "MEDIUM" | "LARGE" | "XL" | "VAN";

const VEHICLE_SIZES: { key: VehicleSize; label: string; example: string }[] = [
  { key: "SMALL",  label: "Small",  example: "Fiesta, Polo" },
  { key: "MEDIUM", label: "Medium", example: "Golf, Focus" },
  { key: "LARGE",  label: "Large",  example: "Passat, A4" },
  { key: "XL",     label: "XL",     example: "X5, Discovery" },
  { key: "VAN",    label: "Van",    example: "Transit, Sprinter" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayAtHour(h: number) {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

const INP =
  "h-11 w-full rounded-xl bg-white/15 border border-white/10 px-4 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/40 transition";
const LBL =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/60";

// ── Component ─────────────────────────────────────────────────────────────────

export function AddJobSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    vehicleReg:      "",
    vehicleMake:     "",
    vehicleModel:    "",
    vehicleColour:   "",
    vehicleSize:     "LARGE" as VehicleSize,
    serviceTypeId:   "",
    customerName:    "",
    keyNumber:       "",
    vehicleLocation: "",
    readyByTime:     todayAtHour(17),
    notes:           "",
  });

  const { data: serviceTypes, isLoading: loadingTypes } =
    trpc.bookings.valeterListServiceTypes.useQuery(undefined, { enabled: open });

  const utils = trpc.useUtils();
  const create = trpc.bookings.valeterCreate.useMutation({
    onSuccess: () => {
      void utils.bookings.list.invalidate();
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setForm({
          vehicleReg: "", vehicleMake: "", vehicleModel: "",
          vehicleColour: "", vehicleSize: "LARGE", serviceTypeId: "",
          customerName: "", keyNumber: "", vehicleLocation: "",
          readyByTime: todayAtHour(17), notes: "",
        });
        router.refresh();
      }, 1200);
    },
  });

  function f(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicleReg.trim() || !form.serviceTypeId) return;
    create.mutate({
      ...form,
      vehicleReg: form.vehicleReg.toUpperCase().trim(),
    });
  }

  const canSubmit = form.vehicleReg.trim().length >= 2 && !!form.serviceTypeId;

  return (
    <>
      {/* ── FAB trigger ───────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 active:scale-95"
      >
        <Plus className="h-4 w-4" />
        Add Job
      </button>

      {/* ── Sheet overlay ─────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel — slides up from bottom, max-w on tablet+ */}
          <div className="relative mt-auto mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#2A2720] shadow-2xl sm:rounded-3xl sm:mb-4">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#2A2720] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Car className="h-4 w-4 text-orange-400" />
                <h2 className="text-sm font-bold text-white">Add Job</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Success state */}
            {done && (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <p className="text-base font-bold text-white">Job added</p>
                <p className="text-sm text-white/50">It&apos;s now in your list.</p>
              </div>
            )}

            {/* Form */}
            {!done && (
              <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 pb-8">

                {/* ── Vehicle registration ─────────────────────────────── */}
                <div>
                  <label className={LBL}>Registration *</label>
                  <input
                    type="text"
                    autoCapitalize="characters"
                    className={cn(INP, "font-mono text-base uppercase tracking-widest")}
                    placeholder="AB21 XYZ"
                    maxLength={12}
                    value={form.vehicleReg}
                    onChange={f("vehicleReg")}
                    required
                  />
                </div>

                {/* ── Vehicle size ──────────────────────────────────────── */}
                <div>
                  <label className={LBL}>Vehicle size *</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {VEHICLE_SIZES.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, vehicleSize: s.key }))}
                        className={cn(
                          "flex flex-col items-center rounded-xl border py-2.5 text-center transition",
                          form.vehicleSize === s.key
                            ? "border-orange-500 bg-orange-500/25 text-orange-300"
                            : "border-white/15 bg-white/10 text-white/70 hover:border-white/30 hover:text-white",
                        )}
                      >
                        <span className="text-xs font-bold">{s.label}</span>
                        <span className="mt-0.5 hidden text-[9px] text-white/30 sm:block truncate w-full px-1">{s.example}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Service type ─────────────────────────────────────── */}
                <div>
                  <label className={LBL}>Service type *</label>
                  {loadingTypes ? (
                    <div className={cn(INP, "flex items-center text-white/30")}>Loading…</div>
                  ) : (
                    <div className="relative">
                      <select
                        className={cn(INP, "appearance-none pr-9")}
                        value={form.serviceTypeId}
                        onChange={f("serviceTypeId")}
                        required
                      >
                        <option value="">Select service…</option>
                        {serviceTypes?.map((st) => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    </div>
                  )}
                </div>

                {/* ── Ready by time ─────────────────────────────────────── */}
                <div>
                  <label className={LBL}>Ready by *</label>
                  <input
                    type="datetime-local"
                    className={cn(INP, "[color-scheme:dark]")}
                    value={form.readyByTime}
                    onChange={f("readyByTime")}
                    required
                  />
                </div>

                {/* ── Vehicle details ──────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LBL}>Make</label>
                    <input type="text" className={INP} placeholder="Ford" value={form.vehicleMake} onChange={f("vehicleMake")} />
                  </div>
                  <div>
                    <label className={LBL}>Model</label>
                    <input type="text" className={INP} placeholder="Focus" value={form.vehicleModel} onChange={f("vehicleModel")} />
                  </div>
                  <div>
                    <label className={LBL}>Colour</label>
                    <input type="text" className={INP} placeholder="Silver" value={form.vehicleColour} onChange={f("vehicleColour")} />
                  </div>
                  <div>
                    <label className={LBL}>Key number</label>
                    <input type="text" className={INP} placeholder="K12" value={form.keyNumber} onChange={f("keyNumber")} />
                  </div>
                </div>

                {/* ── Customer & location ──────────────────────────────── */}
                <div>
                  <label className={LBL}>Customer name</label>
                  <input type="text" className={INP} placeholder="Mr J Smith" value={form.customerName} onChange={f("customerName")} />
                </div>

                <div>
                  <label className={LBL}>Vehicle location</label>
                  <input type="text" className={INP} placeholder="Bay 3, forecourt" value={form.vehicleLocation} onChange={f("vehicleLocation")} />
                </div>

                {/* ── Notes ────────────────────────────────────────────── */}
                <div>
                  <label className={LBL}>Notes</label>
                  <textarea
                    rows={3}
                    className={cn(INP, "h-auto resize-none py-3")}
                    placeholder="Any special instructions…"
                    value={form.notes}
                    onChange={f("notes")}
                  />
                </div>

                {/* ── Error ────────────────────────────────────────────── */}
                {create.error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {create.error.message}
                  </div>
                )}

                {/* ── Submit ───────────────────────────────────────────── */}
                <button
                  type="submit"
                  disabled={!canSubmit || create.isPending}
                  className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-40 active:scale-[0.98]"
                >
                  {create.isPending ? "Adding job…" : "Add job to my list"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
