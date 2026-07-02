"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Star SVG ────────────────────────────────────────────────────────────────

function StarIcon({ filled, size = 20 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#F59E0B" : "none"} stroke={filled ? "#F59E0B" : "#FCD34D"} strokeWidth={1.5}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// ─── Partial star (for fractional scores) ────────────────────────────────────

function PartialStar({ fill, size = 20 }: { fill: number; size?: number }) {
  // fill = 0..1
  const id = `ps-${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="#F59E0B" />
          <stop offset={`${fill * 100}%`} stopColor="none" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={`url(#${id})`}
        stroke="#FCD34D"
        strokeWidth={1.5}
      />
    </svg>
  );
}

function StarRow({ score, size = 20 }: { score: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const diff = score - (i - 1);
        if (diff >= 1) return <StarIcon key={i} filled size={size} />;
        if (diff > 0)  return <PartialStar key={i} fill={diff} size={size} />;
        return <StarIcon key={i} filled={false} size={size} />;
      })}
    </div>
  );
}

// ─── Score label ─────────────────────────────────────────────────────────────

function scoreLabel(avg: number): { label: string; color: string; bg: string; ring: string } {
  if (avg >= 4.5) return { label: "Excellent",    color: "text-emerald-700", bg: "bg-emerald-50",  ring: "ring-emerald-300" };
  if (avg >= 4.0) return { label: "Very Good",    color: "text-teal-700",   bg: "bg-teal-50",     ring: "ring-teal-300" };
  if (avg >= 3.5) return { label: "Good",         color: "text-sky-700",    bg: "bg-sky-50",      ring: "ring-sky-300" };
  if (avg >= 3.0) return { label: "Satisfactory", color: "text-amber-700",  bg: "bg-amber-50",    ring: "ring-amber-300" };
  return              { label: "Needs Work",   color: "text-red-700",    bg: "bg-red-50",      ring: "ring-red-300" };
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────

function Sparkline({ trend }: { trend: { date: string; avg: number | null; count: number }[] }) {
  const vals = trend.map((t) => t.avg);
  const hasData = vals.some((v) => v !== null);
  if (!hasData) return null;

  const w = 140; const h = 36; const pad = 4;
  const filled = vals.map((v) => v ?? 0);
  const min = Math.max(0, Math.min(...filled.filter(Boolean)) - 0.5);
  const max = Math.min(5, Math.max(...filled.filter(Boolean)) + 0.5);
  const rangeY = max - min || 1;

  const points = filled.map((v, i) => {
    const x = pad + (i / (filled.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / rangeY) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="#F59E0B"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      {filled.map((v, i) => {
        if (!vals[i]) return null;
        const x = pad + (i / (filled.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / rangeY) * (h - pad * 2);
        return <circle key={i} cx={x} cy={y} r={2.5} fill="#F59E0B" />;
      })}
    </svg>
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────

export function CsiScoreBanner(): React.JSX.Element {
  const [days, setDays] = useState(30);
  const { data, isLoading } = trpc.bookings.getCsiScore.useQuery({ days }, { refetchInterval: 60_000 });

  const avg = data?.avg ?? null;
  const label = avg ? scoreLabel(avg) : null;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-all",
      label ? `${label.ring} ring-2` : "border-slate-200",
    )}>
      {/* Subtle amber glow background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-50/60 via-white to-white" />

      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">

        {/* ── Big score ────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 sm:w-44">
          {isLoading ? (
            <div className="h-16 w-16 animate-pulse rounded-full bg-slate-100" />
          ) : avg !== null ? (
            <>
              {/* Circular score ring */}
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg className="absolute inset-0" viewBox="0 0 96 96" width="96" height="96">
                  <circle cx="48" cy="48" r="42" fill="none" stroke="#FEF3C7" strokeWidth="8" />
                  <circle
                    cx="48" cy="48" r="42"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - avg / 5)}`}
                    transform="rotate(-90 48 48)"
                    style={{ transition: "stroke-dashoffset 0.8s ease" }}
                  />
                </svg>
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-black leading-none tracking-tight text-slate-900">
                    {avg.toFixed(1)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
                </div>
              </div>
              <StarRow score={avg} size={18} />
              {label && (
                <span className={cn("mt-1 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider", label.bg, label.color)}>
                  {label.label}
                </span>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-dashed border-slate-200">
                <span className="text-2xl font-black text-slate-300">—</span>
              </div>
              <span className="text-xs text-slate-400">No ratings yet</span>
            </div>
          )}
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400">CSI Score</p>
        </div>

        {/* ── Divider ──────────────────────────────────────────── */}
        <div className="hidden h-28 w-px bg-slate-100 sm:block" />

        {/* ── Stats + trend ─────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-3">

          {/* Row 1: rated / total / coverage */}
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-2xl font-black tracking-tight text-slate-900">
                {isLoading ? <span className="animate-pulse text-slate-300">–</span> : (data?.totalRated ?? 0)}
              </p>
              <p className="text-xs font-medium text-slate-400">Jobs rated</p>
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight text-slate-900">
                {isLoading ? <span className="animate-pulse text-slate-300">–</span> : (data?.totalCompleted ?? 0)}
              </p>
              <p className="text-xs font-medium text-slate-400">Completed jobs</p>
            </div>
            {data && data.coverageRate > 0 && (
              <div>
                <p className={cn("text-2xl font-black tracking-tight", data.coverageRate >= 70 ? "text-emerald-600" : "text-amber-600")}>
                  {data.coverageRate}%
                </p>
                <p className="text-xs font-medium text-slate-400">Rating coverage</p>
              </div>
            )}
          </div>

          {/* Row 2: star breakdown */}
          {data && data.totalRated > 0 && (
            <div className="space-y-1">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = data.breakdown[star] ?? 0;
                const pct = data.totalRated > 0 ? (count / data.totalRated) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-4 shrink-0 text-xs font-semibold text-slate-500">{star}</span>
                    <StarIcon filled size={12} />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-5 text-right text-xs text-slate-400">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Row 3: sparkline */}
          {data && (
            <div className="flex items-end gap-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">7-day trend</p>
                <Sparkline trend={data.trend} />
              </div>
              {/* Period toggle */}
              <div className="ml-auto flex gap-1">
                {([30, 90] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                      days === d ? "bg-amber-100 text-amber-700" : "text-slate-400 hover:bg-slate-100",
                    )}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── "What drives your CSI score?" hint ─────────────────── */}
        <div className="hidden shrink-0 flex-col items-end justify-between gap-2 sm:flex">
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Score based on</p>
            <p className="mt-0.5 text-xs text-amber-600">5-star ratings left by<br/>dealers on completed valets</p>
          </div>
        </div>
      </div>
    </div>
  );
}
