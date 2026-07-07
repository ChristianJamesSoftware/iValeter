"use client";

import { useState, useMemo } from "react";
import { Check, X, Users, AlertTriangle, CheckCircle2, Bell, UserCheck } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn, formatDate } from "@/lib/utils";

const STATUS_STYLE = {
  PENDING:  "bg-amber-50 text-amber-700 border-amber-100",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECTED: "bg-red-50 text-red-500 border-red-100",
} as const;

function daysUntil(date: Date | string): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function HolidayManager() {
  const utils = trpc.useUtils();
  const requests = trpc.holiday.listRequests.useQuery({});
  const [coverInput, setCoverInput] = useState<Record<string, string>>({});

  const approve      = trpc.holiday.approve.useMutation({ onSuccess: () => utils.holiday.listRequests.invalidate() });
  const reject       = trpc.holiday.reject.useMutation({ onSuccess: () => utils.holiday.listRequests.invalidate() });
  const setCoverMut  = trpc.holiday.setCover.useMutation({ onSuccess: () => utils.holiday.listRequests.invalidate() });
  const confirmCover = trpc.holiday.confirmCover.useMutation({ onSuccess: () => utils.holiday.listRequests.invalidate() });

  const all      = requests.data ?? [];
  const pending  = all.filter((r) => r.status === "PENDING");
  const approved = all.filter((r) => r.status === "APPROVED");
  const resolved = all.filter((r) => r.status === "REJECTED");

  // Approved requests where cover not yet set and start within 7 days
  const needsCoverAttention = useMemo(() =>
    approved.filter((r) => {
      const days = daysUntil(r.startDate);
      return days <= 7 && !r.coverPersonName;
    }),
  [approved]);

  // Approved requests where cover set but not confirmed and starts tomorrow or sooner
  const needs24hConfirm = useMemo(() =>
    approved.filter((r) => {
      const days = daysUntil(r.startDate);
      return days <= 1 && r.coverPersonName && !r.coverConfirmedAt;
    }),
  [approved]);

  function handleSetCover(id: string) {
    const name = coverInput[id]?.trim();
    if (!name) return;
    setCoverMut.mutate({ id, coverPersonName: name });
    setCoverInput((s) => ({ ...s, [id]: "" }));
  }

  return (
    <div className="space-y-8">

      {/* 24h alert */}
      {needs24hConfirm.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-5 py-4">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold text-red-900">24-hour cover check — call replacement now</p>
            <p className="mt-0.5 text-sm text-red-700">
              {needs24hConfirm.map((r) => `${r.user.firstName} ${r.user.lastName} (cover: ${r.coverPersonName})`).join(", ")} — time off starts tomorrow. Confirm cover is still in place.
            </p>
          </div>
        </div>
      )}

      {/* Cover needed alert */}
      {needsCoverAttention.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-900">Cover not organised — time off within 7 days</p>
            <p className="mt-0.5 text-sm text-amber-700">
              {needsCoverAttention.map((r) => `${r.user.firstName} ${r.user.lastName}`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Pending */}
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
                  {r.replacementOrganised && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <UserCheck className="h-3 w-3" />
                      Replacement organised{r.replacementName ? `: ${r.replacementName}` : ""}
                    </p>
                  )}
                  {!r.replacementOrganised && (
                    <p className="mt-1 text-xs font-medium text-amber-600">No replacement organised</p>
                  )}
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

      {/* Approved — with DB-backed cover management */}
      <section>
        <h2 className="mb-3 font-heading text-lg font-bold text-navy">Approved Time Off</h2>
        {approved.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-slate">No approved time off.</p>
        ) : (
          <ul className="space-y-3">
            {approved.map((r) => {
              const days = daysUntil(r.startDate);
              const isSoon = days <= 7;
              const isImminent = days <= 1;
              const hasCover = !!r.coverPersonName;
              const coverConfirmed = !!r.coverConfirmedAt;

              let borderColor = "border-line";
              if (isImminent && hasCover && !coverConfirmed) borderColor = "border-red-300";
              else if (isSoon && !hasCover) borderColor = "border-amber-300";
              else if (hasCover && coverConfirmed) borderColor = "border-emerald-300";

              return (
                <li key={r.id} className={cn("rounded-xl border bg-white p-4", borderColor)}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
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
                        &nbsp;·&nbsp;
                        {days < 0 ? "On leave" : days === 0 ? "Starts today" : `${days} day${days !== 1 ? "s" : ""} away`}
                      </p>
                      {r.replacementOrganised && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700">
                          <UserCheck className="h-3 w-3" />
                          Valeter organised: {r.replacementName ?? "unnamed"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cover management */}
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
                          onClick={() => handleSetCover(r.id)}
                          disabled={!coverInput[r.id]?.trim() || setCoverMut.isPending}
                          className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy/90 disabled:opacity-40"
                        >
                          Save Cover
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-between">
                        <p className="text-sm text-navy">
                          Cover: <span className="font-semibold">{r.coverPersonName}</span>
                        </p>
                        {!coverConfirmed ? (
                          <button
                            onClick={() => confirmCover.mutate({ id: r.id })}
                            disabled={confirmCover.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirm Cover
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600">Confirmed ✓</span>
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
