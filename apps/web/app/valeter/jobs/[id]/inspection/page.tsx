"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Camera, Check, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

interface PhotoPosition {
  type: string;
  label: string;
  instruction: string;
  hint: string;
  /** SVG highlight zone key */
  zone: "front" | "rear" | "driver" | "passenger" | "corner_fl" | "corner_fr" | "corner_rl" | "corner_rr" | "wheel_fl" | "wheel_fr" | "wheel_rl" | "wheel_rr" | "interior" | "boot";
}

// Clockwise from front-left corner around the car, then wheels clockwise from front-left
const FULL_SET: PhotoPosition[] = [
  {
    type: "exterior_front_driver_corner",
    label: "Front Driver Corner",
    instruction: "Stand at the front-left corner of the vehicle",
    hint: "Capture the front bumper, driver-side wing and headlight in one shot",
    zone: "corner_fl",
  },
  {
    type: "exterior_driver",
    label: "Driver Side",
    instruction: "Stand back from the middle of the driver side",
    hint: "Full side profile — both doors, sills and roofline visible",
    zone: "driver",
  },
  {
    type: "exterior_rear_driver_corner",
    label: "Rear Driver Corner",
    instruction: "Stand at the rear-left corner of the vehicle",
    hint: "Capture the rear bumper, driver-side rear quarter and tail light",
    zone: "corner_rl",
  },
  {
    type: "exterior_rear",
    label: "Rear of Vehicle",
    instruction: "Stand directly behind the vehicle",
    hint: "Full rear bumper, number plate and both tail lights",
    zone: "rear",
  },
  {
    type: "exterior_rear_passenger_corner",
    label: "Rear Passenger Corner",
    instruction: "Stand at the rear-right corner of the vehicle",
    hint: "Capture the rear bumper, passenger-side rear quarter and tail light",
    zone: "corner_rr",
  },
  {
    type: "exterior_passenger",
    label: "Passenger Side",
    instruction: "Stand back from the middle of the passenger side",
    hint: "Full side profile — both doors, sills and roofline visible",
    zone: "passenger",
  },
  {
    type: "exterior_front_passenger_corner",
    label: "Front Passenger Corner",
    instruction: "Stand at the front-right corner of the vehicle",
    hint: "Capture the front bumper, passenger-side wing and headlight",
    zone: "corner_fr",
  },
  {
    type: "exterior_front",
    label: "Front of Vehicle",
    instruction: "Stand directly in front of the vehicle",
    hint: "Full front bumper, grille, number plate and both headlights",
    zone: "front",
  },
];

const WHEELS: PhotoPosition[] = [
  {
    type: "wheel_fl",
    label: "Front Left Wheel",
    instruction: "Crouch down at the front-left wheel",
    hint: "Fill the frame with the wheel — alloy, tyre and brake visible",
    zone: "wheel_fl",
  },
  {
    type: "wheel_rl",
    label: "Rear Left Wheel",
    instruction: "Crouch down at the rear-left wheel",
    hint: "Fill the frame with the wheel — alloy, tyre and brake visible",
    zone: "wheel_rl",
  },
  {
    type: "wheel_rr",
    label: "Rear Right Wheel",
    instruction: "Crouch down at the rear-right wheel",
    hint: "Fill the frame with the wheel — alloy, tyre and brake visible",
    zone: "wheel_rr",
  },
  {
    type: "wheel_fr",
    label: "Front Right Wheel",
    instruction: "Crouch down at the front-right wheel",
    hint: "Fill the frame with the wheel — alloy, tyre and brake visible",
    zone: "wheel_fr",
  },
];

const INTERIOR: PhotoPosition[] = [
  {
    type: "interior_front",
    label: "Dashboard & Front Seats",
    instruction: "Open the driver door and photograph the dashboard",
    hint: "Steering wheel, dashboard, front seats — any stains or damage visible",
    zone: "interior",
  },
  {
    type: "interior_rear",
    label: "Rear Seats",
    instruction: "Open a rear door and photograph the rear cabin",
    hint: "Rear seats, footwells and headlining — any stains or damage",
    zone: "interior",
  },
  {
    type: "boot",
    label: "Boot / Load Area",
    instruction: "Open the boot and photograph the load area",
    hint: "Boot floor, sides and any existing marks or damage",
    zone: "boot",
  },
];

type Step = "choose" | "capture" | "review";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Car diagram SVG ──────────────────────────────────────────────────────────
function CarDiagram({ zone }: { zone: PhotoPosition["zone"] }) {
  const active = "fill-[#00B5C8] opacity-80";
  const dim    = "fill-[#1C2B4A] opacity-20";

  const isCornerFL  = zone === "corner_fl";
  const isCornerFR  = zone === "corner_fr";
  const isCornerRL  = zone === "corner_rl";
  const isCornerRR  = zone === "corner_rr";
  const isDriver    = zone === "driver";
  const isPassenger = zone === "passenger";
  const isFront     = zone === "front";
  const isRear      = zone === "rear";
  const isWheelFL   = zone === "wheel_fl";
  const isWheelFR   = zone === "wheel_fr";
  const isWheelRL   = zone === "wheel_rl";
  const isWheelRR   = zone === "wheel_rr";
  const isInterior  = zone === "interior";
  const isBoot      = zone === "boot";

  return (
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[260px]">
      {/* Car body */}
      <rect x="30" y="40" width="160" height="60" rx="12" fill="#1C2B4A" opacity="0.15" />
      {/* Roof */}
      <rect x="60" y="25" width="100" height="30" rx="8" fill="#1C2B4A" opacity="0.10" />

      {/* FRONT zone */}
      <rect x="158" y="42" width="20" height="56" rx="4"
        className={isFront ? active : dim}
        style={{ transition: "opacity 0.2s" }} />
      {/* REAR zone */}
      <rect x="42" y="42" width="20" height="56" rx="4"
        className={isRear ? active : dim}
        style={{ transition: "opacity 0.2s" }} />

      {/* DRIVER side (top in plan view) */}
      <rect x="60" y="28" width="100" height="16" rx="4"
        className={isDriver ? active : dim}
        style={{ transition: "opacity 0.2s" }} />
      {/* PASSENGER side (bottom) */}
      <rect x="60" y="96" width="100" height="16" rx="4"
        className={isPassenger ? active : dim}
        style={{ transition: "opacity 0.2s" }} />

      {/* CORNER FL — front-driver */}
      <ellipse cx="172" cy="42" rx="10" ry="10"
        className={isCornerFL ? active : dim}
        style={{ transition: "opacity 0.2s" }} />
      {/* CORNER RL — rear-driver */}
      <ellipse cx="48" cy="42" rx="10" ry="10"
        className={isCornerRL ? active : dim}
        style={{ transition: "opacity 0.2s" }} />
      {/* CORNER RR — rear-passenger */}
      <ellipse cx="48" cy="98" rx="10" ry="10"
        className={isCornerRR ? active : dim}
        style={{ transition: "opacity 0.2s" }} />
      {/* CORNER FR — front-passenger */}
      <ellipse cx="172" cy="98" rx="10" ry="10"
        className={isCornerFR ? active : dim}
        style={{ transition: "opacity 0.2s" }} />

      {/* WHEELS */}
      <ellipse cx="155" cy="35" rx="10" ry="7"
        className={isWheelFL ? active : "fill-[#1C2B4A] opacity-25"}
        style={{ transition: "opacity 0.2s" }} />
      <ellipse cx="65" cy="35" rx="10" ry="7"
        className={isWheelRL ? active : "fill-[#1C2B4A] opacity-25"}
        style={{ transition: "opacity 0.2s" }} />
      <ellipse cx="65" cy="105" rx="10" ry="7"
        className={isWheelRR ? active : "fill-[#1C2B4A] opacity-25"}
        style={{ transition: "opacity 0.2s" }} />
      <ellipse cx="155" cy="105" rx="10" ry="7"
        className={isWheelFR ? active : "fill-[#1C2B4A] opacity-25"}
        style={{ transition: "opacity 0.2s" }} />

      {/* INTERIOR */}
      {isInterior && (
        <rect x="80" y="45" width="60" height="50" rx="6" className={active} />
      )}
      {/* BOOT */}
      {isBoot && (
        <rect x="42" y="55" width="25" height="30" rx="5" className={active} />
      )}

      {/* Camera icon arrow pointing to active zone */}
      {/* Photographer position marker */}
      {(isFront) && (
        <text x="200" y="72" fontSize="16" textAnchor="middle">📷</text>
      )}
      {(isRear) && (
        <text x="20" y="72" fontSize="16" textAnchor="middle">📷</text>
      )}
      {(isDriver) && (
        <text x="110" y="14" fontSize="16" textAnchor="middle">📷</text>
      )}
      {(isPassenger) && (
        <text x="110" y="130" fontSize="16" textAnchor="middle">📷</text>
      )}
      {(isCornerFL) && (
        <text x="204" y="24" fontSize="14" textAnchor="middle">📷</text>
      )}
      {(isCornerRL) && (
        <text x="18" y="24" fontSize="14" textAnchor="middle">📷</text>
      )}
      {(isCornerRR) && (
        <text x="18" y="122" fontSize="14" textAnchor="middle">📷</text>
      )}
      {(isCornerFR) && (
        <text x="204" y="122" fontSize="14" textAnchor="middle">📷</text>
      )}
      {(isWheelFL) && (
        <text x="155" y="17" fontSize="13" textAnchor="middle">📷</text>
      )}
      {(isWheelRL) && (
        <text x="65" y="17" fontSize="13" textAnchor="middle">📷</text>
      )}
      {(isWheelRR) && (
        <text x="65" y="128" fontSize="13" textAnchor="middle">📷</text>
      )}
      {(isWheelFR) && (
        <text x="155" y="128" fontSize="13" textAnchor="middle">📷</text>
      )}

      {/* Labels */}
      <text x="178" y="71" fontSize="7" fill="#1C2B4A" opacity="0.4" textAnchor="middle" transform="rotate(90,178,71)">FRONT</text>
      <text x="42" y="71" fontSize="7" fill="#1C2B4A" opacity="0.4" textAnchor="middle" transform="rotate(90,42,71)">REAR</text>
      <text x="110" y="23" fontSize="7" fill="#1C2B4A" opacity="0.4" textAnchor="middle">DRIVER</text>
      <text x="110" y="117" fontSize="7" fill="#1C2B4A" opacity="0.4" textAnchor="middle">PASSENGER</text>
    </svg>
  );
}

export default function InspectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = params.id;

  const [step, setStep] = useState<Step>("choose");
  const [includeWheels, setIncludeWheels] = useState(true);
  const [includeInterior, setIncludeInterior] = useState(false);

  const [index, setIndex] = useState(0);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = trpc.bookings.uploadPhoto.useMutation();
  const completeInspection = trpc.bookings.completeInspection.useMutation();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const positions = useMemo(() => {
    let list = [...FULL_SET];
    if (includeWheels) list = list.concat(WHEELS);
    if (includeInterior) list = list.concat(INTERIOR);
    return list;
  }, [includeWheels, includeInterior]);

  const current = positions[index];

  async function onCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !current) return;
    const dataUrl = await readFileAsDataUrl(file);
    setPhotos((prev) => ({ ...prev, [current.type]: dataUrl }));
    e.target.value = "";
  }

  function next() {
    if (index < positions.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setStep("review");
    }
  }

  function retakeAt(type: string) {
    const at = positions.findIndex((p) => p.type === type);
    if (at >= 0) {
      setIndex(at);
      setStep("capture");
    }
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      for (const pos of positions) {
        const data = photos[pos.type];
        if (!data) continue;
        await uploadPhoto.mutateAsync({
          bookingId,
          photoData: data,
          type: pos.type,
          stage: "pre_valet",
          label: pos.label,
        });
      }
      await completeInspection.mutateAsync({ bookingId });
      router.push(`/valeter/jobs/${bookingId}?inspected=1`);
      router.refresh();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit inspection",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <header className="bg-navy px-4 pb-5 pt-6 text-white">
        <button
          onClick={() => router.push(`/valeter/jobs/${bookingId}`)}
          className="mb-3 inline-flex items-center gap-1 text-sm text-white/70"
        >
          <ChevronLeft className="h-4 w-4" /> Back to job
        </button>
        <h1 className="font-heading text-2xl font-bold tracking-wide">
          Pre-Valet Inspection
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Take photos BEFORE starting — they protect you and the business.
        </p>
      </header>

      <div className="p-4">
        {step === "choose" && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-cyan bg-cyan/10 p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-2xl">🔄</span>
                <div>
                  <h2 className="font-heading text-lg font-bold text-navy">Walk around the car clockwise</h2>
                  <p className="mt-1 text-sm text-slate">
                    Starting at the front-left corner — 8 exterior photos total.
                    The app will guide you to each position.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <CarDiagram zone="corner_fl" />
              </div>
            </div>

            <div className="rounded-xl border border-line bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-navy">Optional extras</p>
              <CheckRow
                label="Include all 4 wheels"
                sub="Front-left → rear-left → rear-right → front-right"
                checked={includeWheels}
                onToggle={() => setIncludeWheels((v) => !v)}
              />
              <CheckRow
                label="Include interior"
                sub="Dashboard, rear seats, boot"
                checked={includeInterior}
                onToggle={() => setIncludeInterior((v) => !v)}
              />
            </div>

            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-xs font-semibold text-slate uppercase tracking-wide mb-2">
                Photo sequence — {positions.length} shots
              </p>
              <div className="flex flex-wrap gap-1.5">
                {positions.map((p, i) => (
                  <span key={p.type} className="rounded-full bg-offwhite border border-line px-2 py-0.5 text-xs text-navy font-medium">
                    {i + 1}. {p.label}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setIndex(0); setStep("capture"); }}
              className="h-16 w-full rounded-2xl bg-cyan font-heading text-xl font-bold text-navy shadow-lg transition active:scale-[0.98] hover:bg-cyan-600"
            >
              Start Inspection →
            </button>
          </div>
        )}

        {step === "capture" && current && (
          <div className="space-y-4">
            {/* Progress */}
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-semibold text-navy">
                  Photo {index + 1} of {positions.length}
                </span>
                <span className="text-slate">{Math.round(((index) / positions.length) * 100)}% done</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-cyan transition-all duration-300"
                  style={{ width: `${((index + 1) / positions.length) * 100}%` }}
                />
              </div>
              {/* Step dots */}
              <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                {positions.map((p, i) => (
                  <div
                    key={p.type}
                    className={cn(
                      "h-1.5 flex-shrink-0 rounded-full transition-all",
                      i === index
                        ? "w-6 bg-cyan"
                        : photos[p.type]
                        ? "w-3 bg-success"
                        : "w-3 bg-line",
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Guide card */}
            <div className="rounded-2xl border-2 border-cyan bg-white overflow-hidden">
              {/* Position label */}
              <div className="bg-navy px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan/80">
                  Shot {index + 1} of {positions.length}
                </p>
                <h2 className="font-heading text-xl font-bold text-white mt-0.5">
                  {current.label}
                </h2>
              </div>

              {/* Car diagram */}
              <div className="flex justify-center bg-offwhite py-4 border-b border-line">
                <CarDiagram zone={current.zone} />
              </div>

              {/* Instructions */}
              <div className="px-4 py-4 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-white text-xs font-bold">1</span>
                  <p className="text-sm font-semibold text-navy">{current.instruction}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan/20 text-navy text-xs font-bold">2</span>
                  <p className="text-sm text-slate">{current.hint}</p>
                </div>
              </div>
            </div>

            {/* Photo taken / take photo */}
            {photos[current.type] ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos[current.type]}
                  alt={current.label}
                  className="w-full rounded-xl border-2 border-success object-cover max-h-64"
                />
                <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 border border-success/30">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span className="text-sm font-semibold text-success">Photo captured</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-line bg-white font-semibold text-slate transition active:scale-[0.98]"
                  >
                    <RotateCcw className="h-5 w-5" /> Retake
                  </button>
                  <button
                    onClick={next}
                    className="flex h-14 items-center justify-center gap-2 rounded-xl bg-cyan font-heading text-lg font-bold text-navy transition active:scale-[0.98] hover:bg-cyan-600"
                  >
                    {index < positions.length - 1 ? "Next →" : "Review →"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-full items-center justify-center gap-3 rounded-2xl bg-navy font-heading text-xl font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-navy/90"
              >
                <Camera className="h-8 w-8" /> Take Photo
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onCapture}
              className="hidden"
            />
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-navy">Review & Submit</h2>
              <span className="text-sm text-slate">{Object.keys(photos).length}/{positions.length} captured</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {positions.map((pos) => (
                <div
                  key={pos.type}
                  className={cn(
                    "overflow-hidden rounded-xl border-2 bg-white",
                    photos[pos.type] ? "border-success/40" : "border-red-300",
                  )}
                >
                  {photos[pos.type] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photos[pos.type]}
                      alt={pos.label}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-red-50 text-center px-2">
                      <div>
                        <Camera className="h-6 w-6 text-red-300 mx-auto mb-1" />
                        <span className="text-xs text-red-400 font-medium">Missing</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1 p-2">
                    <span className="truncate text-xs font-semibold text-navy">
                      {pos.label}
                    </span>
                    <button
                      onClick={() => retakeAt(pos.type)}
                      className="shrink-0 text-xs font-semibold text-cyan-600"
                    >
                      {photos[pos.type] ? "Retake" : "Take"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {submitError && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {submitError}
              </p>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-navy font-heading text-xl font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-navy/90 disabled:opacity-60"
            >
              <Check className="h-6 w-6" />
              {submitting ? "Submitting…" : "Submit Inspection"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckRow({
  label,
  sub,
  checked,
  onToggle,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 py-2 text-left"
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition",
          checked ? "border-cyan bg-cyan text-navy" : "border-line bg-white",
        )}
      >
        {checked && <Check className="h-4 w-4" />}
      </span>
      <span>
        <span className="block font-semibold text-navy">{label}</span>
        <span className="block text-sm text-slate">{sub}</span>
      </span>
    </button>
  );
}
