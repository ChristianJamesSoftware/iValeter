"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Camera, Check, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

interface PhotoPosition {
  type: string;
  label: string;
}

const EXTERIOR_4: PhotoPosition[] = [
  { type: "exterior_front", label: "Front of vehicle" },
  { type: "exterior_driver", label: "Driver side" },
  { type: "exterior_rear", label: "Rear of vehicle" },
  { type: "exterior_passenger", label: "Passenger side" },
];

const EXTERIOR_CORNERS: PhotoPosition[] = [
  { type: "exterior_front_driver_corner", label: "Front driver corner" },
  { type: "exterior_rear_driver_corner", label: "Rear driver corner" },
  { type: "exterior_rear_passenger_corner", label: "Rear passenger corner" },
  { type: "exterior_front_passenger_corner", label: "Front passenger corner" },
];

const INTERIOR: PhotoPosition[] = [
  { type: "interior_front", label: "Dashboard & front seats" },
  { type: "interior_rear", label: "Rear seats" },
  { type: "boot", label: "Boot" },
];

const WHEELS: PhotoPosition[] = [
  { type: "wheel_fl", label: "Front left wheel" },
  { type: "wheel_fr", label: "Front right wheel" },
  { type: "wheel_rl", label: "Rear left wheel" },
  { type: "wheel_rr", label: "Rear right wheel" },
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

export default function InspectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = params.id;

  const [step, setStep] = useState<Step>("choose");
  const [fullSet, setFullSet] = useState(true);
  const [includeInterior, setIncludeInterior] = useState(false);
  const [includeWheels, setIncludeWheels] = useState(false);

  const [index, setIndex] = useState(0);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = trpc.bookings.uploadPhoto.useMutation();
  const completeInspection = trpc.bookings.completeInspection.useMutation();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const positions = useMemo(() => {
    let list = [...EXTERIOR_4];
    if (fullSet) list = list.concat(EXTERIOR_CORNERS);
    if (includeInterior) list = list.concat(INTERIOR);
    if (includeWheels) list = list.concat(WHEELS);
    return list;
  }, [fullSet, includeInterior, includeWheels]);

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
    <div className="min-h-screen">
      <header className="bg-navy px-4 pb-5 pt-6 text-white">
        <button
          onClick={() => router.push(`/valeter/jobs/${bookingId}`)}
          className="mb-3 inline-flex items-center gap-1 text-sm text-white/70"
        >
          <ChevronLeft className="h-4 w-4" /> Back to job
        </button>
        <h1 className="font-heading text-2xl font-bold tracking-wide">
          Vehicle Inspection
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Take photos BEFORE starting the valet — they protect you and Total
          Valeting.
        </p>
      </header>

      <div className="p-4">
        {step === "choose" && (
          <ChooseStep
            fullSet={fullSet}
            setFullSet={setFullSet}
            includeInterior={includeInterior}
            setIncludeInterior={setIncludeInterior}
            includeWheels={includeWheels}
            setIncludeWheels={setIncludeWheels}
            onBegin={() => {
              setIndex(0);
              setStep("capture");
            }}
          />
        )}

        {step === "capture" && current && (
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-slate">
                <span className="font-semibold">
                  Photo {index + 1} of {positions.length}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-cyan transition-all"
                  style={{
                    width: `${((index + 1) / positions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-line bg-white p-6 text-center">
              <div className="text-6xl">🚗</div>
              <h2 className="mt-3 font-heading text-2xl font-bold uppercase tracking-wide text-navy">
                {current.label}
              </h2>
            </div>

            {photos[current.type] ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos[current.type]}
                  alt={current.label}
                  className="w-full rounded-xl border border-line object-cover"
                />
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
                className="flex h-20 w-full items-center justify-center gap-3 rounded-2xl bg-cyan font-heading text-xl font-bold text-navy shadow-lg transition active:scale-[0.98] hover:bg-cyan-600"
              >
                <Camera className="h-7 w-7" /> Take Photo
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
            <h2 className="font-heading text-xl font-bold text-navy">
              Review &amp; Submit
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {positions.map((pos) => (
                <div
                  key={pos.type}
                  className="overflow-hidden rounded-xl border border-line bg-white"
                >
                  {photos[pos.type] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photos[pos.type]}
                      alt={pos.label}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-offwhite text-sm text-slate">
                      Missing
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1 p-2">
                    <span className="truncate text-xs font-medium text-navy">
                      {pos.label}
                    </span>
                    <button
                      onClick={() => retakeAt(pos.type)}
                      className="shrink-0 text-xs font-semibold text-cyan-600"
                    >
                      Retake
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
              className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-navy font-heading text-xl font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-navy-600 disabled:opacity-60"
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

function ChooseStep({
  fullSet,
  setFullSet,
  includeInterior,
  setIncludeInterior,
  includeWheels,
  setIncludeWheels,
  onBegin,
}: {
  fullSet: boolean;
  setFullSet: (v: boolean) => void;
  includeInterior: boolean;
  setIncludeInterior: (v: boolean) => void;
  includeWheels: boolean;
  setIncludeWheels: (v: boolean) => void;
  onBegin: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={() => setFullSet(false)}
        className={cn(
          "w-full rounded-2xl border-2 p-5 text-left transition active:scale-[0.99]",
          !fullSet ? "border-cyan bg-cyan/10 ring-2 ring-cyan/30" : "border-line bg-white",
        )}
      >
        <h2 className="font-heading text-xl font-bold text-navy">
          4 Photos — Basic
        </h2>
        <p className="mt-1 text-sm text-slate">
          Front, Driver side, Rear, Passenger side
        </p>
      </button>

      <button
        onClick={() => setFullSet(true)}
        className={cn(
          "w-full rounded-2xl border-2 p-5 text-left transition active:scale-[0.99]",
          fullSet ? "border-cyan bg-cyan/10 ring-2 ring-cyan/30" : "border-line bg-white",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-navy">
            8 Photos — Full
          </h2>
          <span className="rounded-full bg-cyan px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
            Recommended
          </span>
        </div>
        <p className="mt-1 text-sm text-slate">
          All positions including corners
        </p>
      </button>

      <div className="space-y-2 rounded-xl border border-line bg-white p-4">
        <CheckRow
          label="Include interior photos"
          sub="Dashboard, rear seats, boot"
          checked={includeInterior}
          onToggle={() => setIncludeInterior(!includeInterior)}
        />
        <CheckRow
          label="Include wheel photos"
          sub="All 4 wheels"
          checked={includeWheels}
          onToggle={() => setIncludeWheels(!includeWheels)}
        />
      </div>

      <button
        onClick={onBegin}
        className="h-16 w-full rounded-2xl bg-cyan font-heading text-xl font-bold text-navy shadow-lg transition active:scale-[0.98] hover:bg-cyan-600"
      >
        Begin →
      </button>
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
