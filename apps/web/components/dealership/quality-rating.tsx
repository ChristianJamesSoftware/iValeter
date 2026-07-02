"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/react";

interface Props {
  bookingId: string;
  currentScore: number | null;
  currentNote: string | null;
  status: string;
}

function Star({
  filled,
  hovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  interactive,
}: {
  filled: boolean;
  hovered: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  interactive: boolean;
}) {
  const fill = hovered ? "#FCD34D" : filled ? "#F59E0B" : "none";
  const stroke = hovered ? "#FCD34D" : filled ? "#F59E0B" : "#D1D5DB";

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: interactive ? "pointer" : "default" }}
    >
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </svg>
  );
}

export function QualityRating({
  bookingId,
  currentScore,
  currentNote,
  status,
}: Props): React.JSX.Element | null {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [showNoteBox, setShowNoteBox] = useState(false);
  const [localScore, setLocalScore] = useState<number | null>(currentScore);
  const [localNote, setLocalNote] = useState<string | null>(currentNote);

  const submitQuality = trpc.bookings.submitQuality.useMutation({
    onSuccess: (data) => {
      setLocalScore(data.qualityScore ?? null);
      setLocalNote(data.qualityNote ?? null);
      setShowNoteBox(false);
      setSelected(null);
      setNote("");
    },
  });

  if (status !== "COMPLETED") return null;

  // Read-only view when score already set
  if (localScore !== null) {
    return (
      <div className="mt-4 rounded-xl border border-line bg-white p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">
          CSI Score
        </p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              filled={i <= localScore}
              hovered={false}
              interactive={false}
            />
          ))}
          <span className="ml-2 text-sm font-semibold text-navy">
            {localScore}/5
          </span>
        </div>
        {localNote && (
          <p className="mt-2 text-sm text-slate">{localNote}</p>
        )}
      </div>
    );
  }

  // Interactive star rating
  return (
    <div className="mt-4 rounded-xl border border-line bg-white p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">
        Rate this job
      </p>
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHovered(null)}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            filled={selected !== null ? i <= selected : false}
            hovered={hovered !== null ? i <= hovered : false}
            interactive
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              setSelected(i);
              setShowNoteBox(true);
            }}
          />
        ))}
      </div>

      {showNoteBox && selected !== null && (
        <div className="mt-3 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note…"
            rows={2}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20"
          />
          <button
            type="button"
            disabled={submitQuality.isPending}
            onClick={() =>
              submitQuality.mutate({
                bookingId,
                qualityScore: selected,
                qualityNote: note.trim() || undefined,
              })
            }
            className="h-9 rounded-lg bg-[#01696F] px-4 font-heading text-sm font-semibold text-white transition hover:bg-[#015559] disabled:opacity-60"
          >
            {submitQuality.isPending ? "Saving…" : "Submit Rating"}
          </button>
          {submitQuality.error && (
            <p className="text-sm text-danger">
              {submitQuality.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
