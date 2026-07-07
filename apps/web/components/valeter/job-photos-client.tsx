"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type BookingStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "QC_CHECK" | "COMPLETED" | "CANCELLED";

interface Props {
  bookingId: string;
  status: BookingStatus;
}

export function JobPhotosClient({ bookingId, status }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const preValetInputRef = useRef<HTMLInputElement>(null);
  const postValetInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const photosQuery = trpc.bookings.getPhotos.useQuery({ bookingId });
  const uploadMut = trpc.bookings.uploadPhoto.useMutation({
    onSuccess: () => utils.bookings.getPhotos.invalidate({ bookingId }),
  });

  const photos = photosQuery.data ?? [];
  const prePhotos = photos.filter((p) => p.stage === "pre_valet");
  const postPhotos = photos.filter((p) => p.stage === "post_valet");

  const showPre = status === "ASSIGNED" || status === "IN_PROGRESS";
  const showPost = status === "IN_PROGRESS" || status === "QC_CHECK" || status === "COMPLETED";

  function compressImage(file: File, maxPx = 1280, quality = 0.82): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = url;
    });
  }

  function handleFileSelect(stage: "pre_valet" | "post_valet") {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const dataUrl = await compressImage(file);
      uploadMut.mutate({
        bookingId,
        photoData: dataUrl,
        type: "other",
        stage,
        label: stage === "pre_valet" ? "Pre-Valet" : "Post-Valet",
      });
      // Reset input so same file can be selected again
      e.target.value = "";
    };
  }

  return (
    <div className="space-y-5 rounded-xl border border-line bg-white p-4">
      <h2 className="font-heading font-bold text-navy">Photos</h2>

      {/* Pre-Valet / Damage */}
      {showPre && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Camera className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">Damage / Pre-Valet</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {prePhotos.map((p) => (
              <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="Pre-valet" className="h-full w-full object-cover" />
              </button>
            ))}
            <button
              onClick={() => preValetInputRef.current?.click()}
              disabled={uploadMut.isPending}
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-red-300 bg-red-50 text-red-400 transition hover:border-red-400",
                uploadMut.isPending && "opacity-50",
              )}
            >
              <Camera className="h-6 w-6" />
            </button>
            <input
              ref={preValetInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect("pre_valet")}
            />
          </div>
        </section>
      )}

      {/* Post-Valet / After */}
      {showPost && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">After / Post-Valet</span>
          </div>
          <p className="mb-2 text-xs text-slate-500">These will be visible to the customer after job completion</p>
          <div className="flex flex-wrap gap-2">
            {postPhotos.map((p) => (
              <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="Post-valet" className="h-full w-full object-cover" />
              </button>
            ))}
            <button
              onClick={() => postValetInputRef.current?.click()}
              disabled={uploadMut.isPending}
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-400 transition hover:border-emerald-400",
                uploadMut.isPending && "opacity-50",
              )}
            >
              <Camera className="h-6 w-6" />
            </button>
            <input
              ref={postValetInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect("post_valet")}
            />
          </div>
        </section>
      )}

      {uploadMut.error && (
        <p className="text-xs text-red-500">{uploadMut.error.message}</p>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40">
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
