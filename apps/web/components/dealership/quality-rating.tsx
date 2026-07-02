"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Label config ─────────────────────────────────────────────────────────────

const SCORE_LABELS: Record<number, { emoji: string; headline: string; sub: string; color: string; bg: string; ring: string }> = {
  1: { emoji: "😞", headline: "Room for improvement",    sub: "We take all feedback seriously.",           color: "text-red-700",    bg: "bg-red-50",    ring: "ring-red-200" },
  2: { emoji: "😐", headline: "Below expectations",      sub: "Thanks for letting us know.",               color: "text-orange-700", bg: "bg-orange-50", ring: "ring-orange-200" },
  3: { emoji: "🙂", headline: "Satisfactory",            sub: "Glad it was okay — we'll keep improving.",  color: "text-amber-700",  bg: "bg-amber-50",  ring: "ring-amber-200" },
  4: { emoji: "😄", headline: "Great job!",              sub: "Really pleased to hear that.",              color: "text-teal-700",   bg: "bg-teal-50",   ring: "ring-teal-200" },
  5: { emoji: "🌟", headline: "Outstanding!",            sub: "That's what we aim for — thank you!",       color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
};

// ─── Star SVG ─────────────────────────────────────────────────────────────────

function Star({
  index,
  hoveredIndex,
  selectedIndex,
  onHover,
  onClick,
  interactive,
}: {
  index: number;
  hoveredIndex: number | null;
  selectedIndex: number | null;
  onHover?: (i: number | null) => void;
  onClick?: (i: number) => void;
  interactive: boolean;
}) {
  const active = hoveredIndex !== null ? index <= hoveredIndex : selectedIndex !== null ? index <= selectedIndex : false;
  const isHot = hoveredIndex !== null && index <= hoveredIndex;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={() => onClick?.(index)}
      onMouseEnter={() => onHover?.(index)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "rounded-full p-1 transition-transform duration-100",
        interactive ? "hover:scale-125 active:scale-110 cursor-pointer" : "cursor-default",
      )}
      aria-label={`${index} star`}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill={active ? (isHot ? "#FCD34D" : "#F59E0B") : "none"}
        stroke={active ? (isHot ? "#FCD34D" : "#F59E0B") : "#CBD5E1"}
        strokeWidth={1.5}
        style={{ filter: active ? "drop-shadow(0 0 6px rgba(245,158,11,0.45))" : "none", transition: "all 0.12s ease" }}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </button>
  );
}

// ─── Read-only display stars (smaller) ───────────────────────────────────────

function DisplayStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="28" height="28" viewBox="0 0 24 24"
          fill={i <= score ? "#F59E0B" : "none"}
          stroke={i <= score ? "#F59E0B" : "#CBD5E1"}
          strokeWidth={1.5}
          style={{ filter: i <= score ? "drop-shadow(0 0 4px rgba(245,158,11,0.35))" : "none" }}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  bookingId: string;
  currentScore: number | null;
  currentNote: string | null;
  status: string;
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
  const [localScore, setLocalScore] = useState<number | null>(currentScore);
  const [localNote, setLocalNote] = useState<string | null>(currentNote);
  const [submitted, setSubmitted] = useState(false);

  const submitQuality = trpc.bookings.submitQuality.useMutation({
    onSuccess: (data) => {
      setLocalScore(data.qualityScore ?? null);
      setLocalNote(data.qualityNote ?? null);
      setSubmitted(true);
      setSelected(null);
      setNote("");
    },
  });

  if (status !== "COMPLETED") return null;

  const activeScore = hovered ?? selected;
  const label = activeScore ? SCORE_LABELS[activeScore] : null;

  // ── Already rated ─────────────────────────────────────────────────────────
  if (localScore !== null) {
    const ratedLabel = SCORE_LABELS[localScore];
    return (
      <div className={cn(
        "mt-4 overflow-hidden rounded-2xl border-2 bg-white shadow-sm",
        ratedLabel?.ring ?? "border-slate-200",
      )}>
        <div className={cn("px-5 py-3", ratedLabel?.bg ?? "bg-slate-50")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {submitted && (
                  <span className="text-xl">🎉</span>
                )}
                <p className={cn("text-sm font-bold", ratedLabel?.color ?? "text-slate-700")}>
                  {submitted ? "Thank you for your feedback!" : ratedLabel?.headline}
                </p>
              </div>
              {(submitted ? ratedLabel?.sub : localNote) && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {submitted ? ratedLabel?.sub : localNote}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <DisplayStars score={localScore} />
              <p className="mt-1 text-sm font-black text-slate-800">{localScore}.0 / 5</p>
            </div>
          </div>
        </div>
        {!submitted && localNote && (
          <div className="border-t border-slate-100 px-5 py-2.5">
            <p className="text-xs text-slate-500 italic">&ldquo;{localNote}&rdquo;</p>
          </div>
        )}
      </div>
    );
  }

  // ── Interactive rating ────────────────────────────────────────────────────
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border-2 border-dashed border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm">
      <div className="px-5 py-4">
        {/* Header */}
        <div className="mb-3 flex items-start gap-2">
          <span className="text-2xl leading-none">⭐</span>
          <div>
            <p className="font-heading text-base font-bold text-slate-900">
              How did we do?
            </p>
            <p className="text-xs text-slate-500">
              Your rating helps us maintain CSI standards — it only takes a second.
            </p>
          </div>
        </div>

        {/* Stars */}
        <div
          className="flex items-center justify-center gap-1 py-1"
          onMouseLeave={() => setHovered(null)}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              index={i}
              hoveredIndex={hovered}
              selectedIndex={selected}
              onHover={setHovered}
              onClick={(v) => {
                setSelected(v);
              }}
              interactive
            />
          ))}
        </div>

        {/* Dynamic label beneath stars */}
        <div className="mt-1 flex min-h-[28px] items-center justify-center gap-2">
          {label ? (
            <span className={cn("text-sm font-semibold", label.color)}>
              {label.emoji} {label.headline}
            </span>
          ) : (
            <span className="text-xs text-slate-400">Tap a star to rate</span>
          )}
        </div>

        {/* Note + submit */}
        {selected !== null && (
          <div className="mt-3 space-y-2.5 border-t border-amber-100 pt-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)…"
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
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
              className="w-full rounded-xl bg-amber-500 py-2.5 font-heading text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 active:scale-[0.99] disabled:opacity-60"
            >
              {submitQuality.isPending ? "Submitting…" : `Submit ${selected}-Star Rating`}
            </button>
            {submitQuality.error && (
              <p className="text-center text-sm text-red-600">
                {submitQuality.error.message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
