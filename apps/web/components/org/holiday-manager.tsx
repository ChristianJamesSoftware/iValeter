"use client";

import { useState, useMemo } from "react";
import { Check, X, Users, AlertTriangle, CheckCircle2, Bell } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn, formatDate } from "@/lib/utils";

const STATUS_STYLE = {
  PENDING:  "bg-amber-50 text-amber-700 border-amber-100",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECTED: "bg-red-50 text-red-500 border-red-100",
} as const;

/**
 * Extended local state for cover management.
 * (Cover DB model is Phase 4 — local state for now.)
 */
type CoverState = {
  coverName: string;     // who is covering
  coverConfirmed: boolean; // 24h confirm done
};

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function HolidayManager() {
  const utils = trpc.useUtils();
  const requests = trpc.holiday.listRequests.useQuery({});
  const [coverState, setCoverState] = useState<Record<string, CoverState>>({});
  const [coverInput, setCoverInput] = useState<Record<string, string>>({});

  const approve = trpc.holiday.approve.useMutation({ onSuccess: () => utils.holiday.listRequests.invalidate() });
  const reject  = trpc.holiday.reject.useMutation({ onSuccess: () => utils.holiday.listRequests.invalidate() });

  const pending  = (requests.data ?? []).filter((r) => r.status === "PENDING");
  const approved = (requests.data ?? []).filter((r) => r.status === "APPROVED");
  const resolved = (requests.data ?? []).filter((r) => r.status === "REJECTED");

  // Flag approved holidays where cover not organised and start is within 7 days
  const needsCoverAttention = useMemo(() =>
    approved.filter((r) => {
      const cs = coverState[r.id];
      const days = daysUntil(r.startDate.toString());
      return days <= 7 && !cs?.coverName;
    }),
  [approved, coverState]);

  const needs24hConfirm = useMemo(() =>
    approved.filter((r) => {
      const cs = coverState[r.id];
      const days = daysUntil(r.startDate.toString());
      return days <= 1 && cs?.coverName && !cs?.coverConfirmed;
    }),
  [approved, coverState]);

  function setCover(id: string) {
    const name = coverInput[id]?.trim();
    if (!name) return;
    setCoverState((s) => ({ ...s, [id]: { coverName: name, coverConfirmed: false } }));
    setCoverInput((s) => ({ ...s, [id]: "" }));
  }

  function confirmCover(id: string) {
    setCoverState((s) => {
      const existing = s[id];
      if (!existing) return s;
      return { ...s, [id]: { coverName: existing.coverName, coverConfirmed: true } };
    });
  }

  return (
    <div className="space-y-8">

      {/* Alerts */}
      {needs24hConfirm.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-5 py-4">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold text-red-900">24-hour cover confirmation needed</p>
            <p className="text-sm text-red-700 mt-0.5">
              {needs24hConfirm.map((r) => `${r.user.firstName} ${r.user.lastName}`).join(", ")} — holiday starts tomorrow. Confirm cover is still in place.
            </p>
          </div>
        </div>
      )}

      {needsCoverAttention.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-900">Cover not organised — holiday within 7 days</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {needsCoverAttention.map((r) => `${r.user.firstName} ${r.user.lastName}`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Pending approvals */}
      <section>
        <h2 className="mb-3 font-heading text-lg font-bold text-navy">Pending ({pending.length})</h2>
        {requests.isLoading ? (
          <p className="text-slate">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-slate">No pending requests.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-navy">
                    {r.user.firstName} {r.user.lastName}
                    {r.user.site && <span className="ml-2 text-sm font-normal text-slate">· {r.user.site.name}</span>}
                  </p>
                  <p className="text-sm text-slate">
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                    {r.reason && ` · ${r.reason}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={approve.isPending}
                    onClick={() => approve.mutate({ id: r.id })}
                    className="flex h-10 items-center gap-1.5 rounded-lg bg-success px-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button
                    disabled={reject.isPending}
                    onClick={() => reject.mutate({ id: r.id })}
                    className="flex h-10 items-center gap-1.5 rounded-lg bg-danger px-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Approved — with cover management */}
      <section>
        <h2 className="mb-3 font-heading text-lg font-bold text-navy">Approved Holidays</h2>
        {approved.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-slate">No approved holidays.</p>
        ) : (
          <ul className="space-y-3">
            {approved.map((r) => {
              const cs = coverState[r.id];
              const days = daysUntil(r.startDate.toString());
              const isSoon = days <= 7;
              const isImminent = days <= 1;
              const hasCover = !!cs?.coverName;
              const coverConfirmed = !!cs?.coverConfirmed;

              let coverStatusColor = "border-line";
              if (isImminent && hasCover && !coverConfirmed) coverStatusColor = "border-red-300";
              else if (isSoon && !hasCover) coverStatusColor = "border-amber-300";
              else if (hasCover && coverConfirmed) coverStatusColor = "border-emerald-300";

              return (
                <li key={r.id} className={cn("rounded-xl border bg-white p-4", coverStatusColor)}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-navy">{r.user.firstName} {r.user.lastName}</p>
                        {isSoon && !hasCover && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Cover needed</span>
                        )}
                        {hasCover && !coverConfirmed && isImminent && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Confirm cover</span>
                        )}
                        {coverConfirmed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Cover confirmed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate">
                        {formatDate(r.startDate)} → {formatDate(r.endDate)}
                        {r.user.site && ` · ${r.user.site.name}`}
                        &nbsp;·&nbsp; {days < 0 ? "On leave" : days === 0 ? "Starts today" : `${days} day${days !== 1 ? "s" : ""} away`}
                      </p>
                    </div>
                  </div>

                  {/* Cover organisation */}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Users className="h-4 w-4 shrink-0 text-slate" />
                    {!hasCover ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          value={coverInput[r.id] ?? ""}
                          onChange={(e) => setCoverInput((s) => ({ ...s, [r.id]: e.target.value }))}
                          placeholder="Who is covering? (name or role)"
                          className="h-9 flex-1 rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                        />
                        <button
                          onClick={() => setCover(r.id)}
                          disabled={!coverInput[r.id]?.trim()}
                          className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy/90 disabled:opacity-40"
                        >
                          Organise Cover
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-between">
                        <p className="text-sm text-navy">Cover: <span className="font-semibold">{cs.coverName}</span></p>
                        {!coverConfirmed ? (
                          <button
                            onClick={() => confirmCover(r.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirm Cover
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">Confirmed ✓</span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Rejected */}
      {resolved.length > 0 && (
        <section>
          <h2 className="mb-3 font-heading text-lg font-bold text-navy">Rejected</h2>
          <ul className="space-y-2">
            {resolved.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm">
                <span className="text-navy">{r.user.firstName} {r.user.lastName}</span>
                <span className="text-slate">{formatDate(r.startDate)} → {formatDate(r.endDate)}</span>
                <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE.REJECTED)}>Rejected</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
