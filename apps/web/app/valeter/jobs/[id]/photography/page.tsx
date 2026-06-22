"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Camera, Check, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

const TARGET_BY_PACKAGE: Record<string, number> = {
  standard: 10,
  premium: 25,
  full: 40,
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotographyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = params.id;

  const booking = trpc.bookings.getById.useQuery({ id: bookingId });
  const uploadPhoto = trpc.bookings.uploadPhoto.useMutation();

  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pkg = booking.data?.photographyPackage ?? "standard";
  const target = TARGET_BY_PACKAGE[pkg] ?? 10;

  async function onCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const dataUrl = await readFileAsDataUrl(file);
      setPhotos((prev) => [...prev, dataUrl]);
    }
    e.target.value = "";
  }

  function removeAt(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      let n = 1;
      for (const data of photos) {
        await uploadPhoto.mutateAsync({
          bookingId,
          photoData: data,
          type: `photography_${n}`,
          stage: "photography",
          label: `Photo ${n}`,
        });
        n += 1;
      }
      router.push(`/valeter/jobs/${bookingId}?photographed=1`);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to upload photos");
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
        <h1 className="font-heading text-2xl font-bold tracking-wide">Photography</h1>
        <p className="mt-1 text-sm text-white/70">
          Capture the {pkg} set — these photos are shared with the dealership.
        </p>
      </header>

      <div className="space-y-4 p-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm text-slate">
            <span className="font-semibold">
              {photos.length} of {target} photos
            </span>
            {photos.length >= target && (
              <span className="font-semibold text-success">Target reached</span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-cyan transition-all"
              style={{ width: `${Math.min(100, (photos.length / target) * 100)}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-20 w-full items-center justify-center gap-3 rounded-2xl bg-cyan font-heading text-xl font-bold text-navy shadow-lg transition active:scale-[0.98] hover:bg-cyan-600"
        >
          <Camera className="h-7 w-7" /> Add Photos
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={onCapture}
          className="hidden"
        />

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((src, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-lg border border-line bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Photo ${i + 1}`} className="aspect-square w-full object-cover" />
                <button
                  onClick={() => removeAt(i)}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-navy/80 text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {submitError && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {submitError}
          </p>
        )}

        <button
          onClick={submit}
          disabled={submitting || photos.length === 0}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-navy font-heading text-xl font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-navy-600 disabled:opacity-60"
        >
          <Check className="h-6 w-6" />
          {submitting ? "Uploading…" : `Upload ${photos.length} Photos`}
        </button>
      </div>
    </div>
  );
}
