"use client";

import { useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Camera } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type OccStatus = "PENDING" | "CLAIMED" | "COMPLETED" | "MISSED";

function isOverdue(mustDoneByTime: string): boolean {
  const [h, m] = mustDoneByTime.split(":").map(Number);
  const deadline = new Date();
  deadline.setHours(h ?? 17, m ?? 0, 0, 0);
  return new Date() > deadline;
}

// ─── Audit + complete form ────────────────────────────────────────────────────

function CompleteForm({
  occurrenceId,
  questions,
  onDone,
  onCancel,
}: {
  occurrenceId: string;
  questions: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, boolean>>(
    Object.fromEntries(questions.map((_, i) => [i, true])),
  );
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const complete = trpc.recurringJobs.complete.useMutation({
    onSuccess: onDone,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    complete.mutate({
      occurrenceId,
      auditAnswers: questions.map((q, i) => ({ question: q, answer: answers[i] ?? true })),
      completionNote: note.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      {questions.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Completion Checklist</p>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={answers[i] ?? true}
                    onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.checked }))}
                    className="h-5 w-5 rounded border-slate-300 accent-emerald-500"
                  />
                </div>
                <span className="text-sm text-slate-800">{q}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-slate-500">Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any issues to flag…"
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={complete.isPending}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {complete.isPending ? "Submitting…" : "Sign Off Job"}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-white">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Single occurrence card ───────────────────────────────────────────────────

function OccurrenceCard({ occ }: {
  occ: {
    id: string;
    status: string;
    claimedById: string | null;
    completedAt: string | Date | null;
    photoUrl: string | null;
    completionNote: string | null;
    template: {
      name: string;
      description: string | null;
      mustDoneByTime: string;
      auditQuestions: unknown;
      assignedToId: string | null;
    };
    claimedBy: { id: string; firstName: string; lastName: string } | null;
    auditAnswers: { id: string; question: string; answer: boolean }[];
  };
}) {
  const utils = trpc.useUtils();
  const [showComplete, setShowComplete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const claim = trpc.recurringJobs.claim.useMutation({
    onSuccess: () => void utils.recurringJobs.myTodayJobs.invalidate(),
  });

  const status = occ.status as OccStatus;
  const questions = (occ.template.auditQuestions as string[] | null) ?? [];
  const overdue = isOverdue(occ.template.mustDoneByTime);

  const isCompleted = status === "COMPLETED";
  const isMissed = status === "MISSED";
  const isMine = occ.claimedById === null || occ.claimedBy !== null;

  return (
    <div className={cn(
      "rounded-2xl border bg-white p-4 shadow-sm",
      isCompleted && "border-emerald-200 bg-emerald-50/30",
      isMissed && "border-red-200 bg-red-50/30",
      !isCompleted && !isMissed && overdue && "border-red-200",
      !isCompleted && !isMissed && !overdue && "border-slate-100",
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isCompleted && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
            {isMissed && <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />}
            {!isCompleted && !isMissed && overdue && <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />}
            {!isCompleted && !isMissed && !overdue && <Clock className="h-4 w-4 shrink-0 text-amber-500" />}
            <p className="font-bold text-slate-900">{occ.template.name}</p>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {isCompleted
              ? `Completed · ${occ.completedAt ? new Date(occ.completedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}`
              : isMissed
              ? "Missed today"
              : `Must be done by ${occ.template.mustDoneByTime}${overdue ? " — OVERDUE" : ""}`}
          </p>
        </div>

        {/* Status badge */}
        {isCompleted && (
          <button onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
            Done {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Description */}
      {occ.template.description && !isCompleted && (
        <p className="mt-2 text-sm text-slate-600">{occ.template.description}</p>
      )}

      {/* Completed detail (expandable) */}
      {isCompleted && expanded && (
        <div className="mt-3 border-t border-emerald-100 pt-3">
          {occ.auditAnswers.length > 0 && (
            <div className="mb-2 space-y-1">
              {occ.auditAnswers.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  {a.answer
                    ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                  <span>{a.question}</span>
                </div>
              ))}
            </div>
          )}
          {occ.completionNote && (
            <p className="text-xs italic text-slate-500">"{occ.completionNote}"</p>
          )}
        </div>
      )}

      {/* Actions */}
      {!isCompleted && !isMissed && (
        <div className="mt-3">
          {showComplete ? (
            <CompleteForm
              occurrenceId={occ.id}
              questions={questions}
              onDone={() => {
                setShowComplete(false);
                void utils.recurringJobs.myTodayJobs.invalidate();
              }}
              onCancel={() => setShowComplete(false)}
            />
          ) : status === "PENDING" ? (
            <div className="flex gap-2">
              <button
                onClick={() => claim.mutate({ occurrenceId: occ.id })}
                disabled={claim.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                {claim.isPending ? "Starting…" : "Start Job"}
              </button>
            </div>
          ) : (
            // CLAIMED — show sign-off button
            <button
              onClick={() => setShowComplete(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
            >
              <CheckCircle2 className="h-4 w-4" />
              Sign Off
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main section (shown on valeter home) ────────────────────────────────────

export function RecurringJobsSection() {
  const { data: jobs, isLoading } = trpc.recurringJobs.myTodayJobs.useQuery(
    undefined,
    { refetchInterval: 120_000 },
  );

  if (isLoading) return null;
  if (!jobs || jobs.length === 0) return null;

  const pending = jobs.filter((j) => j.status === "PENDING" || j.status === "CLAIMED");
  const done = jobs.filter((j) => j.status === "COMPLETED" || j.status === "MISSED");

  return (
    <div className="mt-4">
      <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wider text-slate-400">
        Daily Tasks · {jobs.length} today
      </h2>

      {/* Pending / in-progress first */}
      {pending.length > 0 && (
        <div className="space-y-3 mb-3">
          {pending.map((j) => (
            <OccurrenceCard key={j.id} occ={{
              ...j,
              completedAt: j.completedAt ? j.completedAt.toString() : null,
              template: {
                ...j.template,
                auditQuestions: j.template.auditQuestions,
              },
            }} />
          ))}
        </div>
      )}

      {/* Completed at the bottom */}
      {done.length > 0 && (
        <div className="space-y-2">
          {done.map((j) => (
            <OccurrenceCard key={j.id} occ={{
              ...j,
              completedAt: j.completedAt ? j.completedAt.toString() : null,
              template: {
                ...j.template,
                auditQuestions: j.template.auditQuestions,
              },
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
