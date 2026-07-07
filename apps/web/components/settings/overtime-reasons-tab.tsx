"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { Plus, Trash2, GripVertical, Eye, EyeOff, Loader2, Check } from "lucide-react";

export function OvertimeReasonsTab() {
  const utils = trpc.useUtils();
  const { data: reasons, isLoading } = trpc.overtimeReasons.listAll.useQuery();

  const createMut = trpc.overtimeReasons.create.useMutation({
    onSuccess: () => { void utils.overtimeReasons.listAll.invalidate(); setNewLabel(""); },
  });
  const updateMut = trpc.overtimeReasons.update.useMutation({
    onSuccess: () => void utils.overtimeReasons.listAll.invalidate(),
  });
  const deleteMut = trpc.overtimeReasons.delete.useMutation({
    onSuccess: () => void utils.overtimeReasons.listAll.invalidate(),
  });

  const [newLabel, setNewLabel] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  function flash(id: string) {
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading reasons…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Info */}
      <div className="rounded-xl border border-[#01696F]/20 bg-[#01696F]/5 px-4 py-3 text-sm text-[#28251D]">
        <span className="font-semibold">Overtime reasons</span> appear as a dropdown when a
        valeter submits an overtime request. They can also free-type if none apply.
        Inactive reasons are hidden from valeters but kept for historical records.
      </div>

      {/* Existing reasons */}
      <div className="rounded-xl border border-[#D4D1CA] bg-white divide-y divide-[#F0EDE8]">
        {(reasons?.length ?? 0) === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No reasons yet — add one below.</p>
        )}
        {reasons?.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3">
            <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
            <span className={`flex-1 text-sm font-medium ${r.isActive ? "text-[#28251D]" : "text-slate-400 line-through"}`}>
              {r.label}
            </span>
            {saved === r.id && (
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
            )}
            {/* Toggle active */}
            <button
              onClick={() => {
                updateMut.mutate({ id: r.id, isActive: !r.isActive });
                flash(r.id);
              }}
              title={r.isActive ? "Hide from valeters" : "Show to valeters"}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              {r.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            {/* Delete */}
            <button
              onClick={() => deleteMut.mutate({ id: r.id })}
              disabled={deleteMut.isPending}
              title="Remove"
              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newLabel.trim().length >= 2) {
              createMut.mutate({ label: newLabel });
            }
          }}
          placeholder="e.g. Dealership Event"
          className="h-9 flex-1 rounded-lg border border-[#D4D1CA] bg-white px-3 text-sm text-[#28251D] outline-none focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20"
        />
        <button
          onClick={() => { if (newLabel.trim().length >= 2) createMut.mutate({ label: newLabel }); }}
          disabled={createMut.isPending || newLabel.trim().length < 2}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-[#01696F] px-4 text-sm font-semibold text-white transition hover:bg-[#015a5f] disabled:opacity-50"
        >
          {createMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </button>
      </div>
      {createMut.error && (
        <p className="text-sm text-red-600">{createMut.error.message}</p>
      )}
    </div>
  );
}
