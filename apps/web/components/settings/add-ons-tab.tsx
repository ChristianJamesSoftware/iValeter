"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { PlusCircle, Pencil, Trash2, GripVertical, X, Check } from "lucide-react";

export function AddOnsTab() {
  const utils = trpc.useUtils();
  const { data: addOns = [], isLoading } = trpc.addOns.list.useQuery();

  const create = trpc.addOns.create.useMutation({
    onSuccess: () => utils.addOns.list.invalidate(),
  });
  const update = trpc.addOns.update.useMutation({
    onSuccess: () => utils.addOns.list.invalidate(),
  });
  const remove = trpc.addOns.delete.useMutation({
    onSuccess: () => utils.addOns.list.invalidate(),
  });

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function startEdit(addon: { id: string; name: string; description: string | null }) {
    setEditingId(addon.id);
    setEditName(addon.name);
    setEditDesc(addon.description ?? "");
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    await update.mutateAsync({ id: editingId, name: editName, description: editDesc });
    setEditingId(null);
  }

  async function saveNew() {
    if (!newName.trim()) return;
    await create.mutateAsync({ name: newName, description: newDesc, sortOrder: addOns.length });
    setNewName("");
    setNewDesc("");
    setShowNew(false);
  }

  if (isLoading) return <p className="text-sm text-slate">Loading add-ons…</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-line bg-offwhite px-4 py-3">
        <p className="text-sm text-slate">
          Define the global CSI Sensory Standard add-on catalogue here. Once added, each add-on can be toggled on or off per dealership from the Dealerships page.
        </p>
      </div>

      {/* Add-on list */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {addOns.length === 0 && !showNew ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            No add-ons defined yet. Add one below.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {addOns.map((addon) => (
              <li key={addon.id} className="px-5 py-4">
                {editingId === addon.id ? (
                  /* ── Inline edit row ── */
                  <div className="space-y-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Add-on name"
                      className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                      autoFocus
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={!editName.trim() || update.isPending}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {update.isPending ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-4 text-sm font-medium text-slate transition hover:bg-offwhite"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Display row ── */
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-semibold text-navy">{addon.name}</p>
                        {!addon.isActive && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      {addon.description && (
                        <p className="mt-0.5 text-sm text-slate">{addon.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => startEdit(addon)}
                        className="rounded-lg p-2 text-slate transition hover:bg-offwhite hover:text-navy"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {confirmDeleteId === addon.id ? (
                        <>
                          <button
                            onClick={async () => {
                              await remove.mutateAsync({ id: addon.id });
                              setConfirmDeleteId(null);
                            }}
                            disabled={remove.isPending}
                            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                          >
                            {remove.isPending ? "Removing…" : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-slate transition hover:bg-offwhite"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(addon.id)}
                          className="rounded-lg p-2 text-slate transition hover:bg-red-50 hover:text-red-500"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* New add-on form */}
        {showNew && (
          <div className="border-t border-line px-5 py-4 space-y-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add-on name e.g. Fresh Scent"
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveNew()}
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
            />
            <div className="flex gap-2">
              <button
                onClick={saveNew}
                disabled={!newName.trim() || create.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {create.isPending ? "Adding…" : "Add"}
              </button>
              <button
                onClick={() => { setShowNew(false); setNewName(""); setNewDesc(""); }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-4 text-sm font-medium text-slate transition hover:bg-offwhite"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add button */}
      {!showNew && (
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-navy transition hover:bg-offwhite"
        >
          <PlusCircle className="h-4 w-4 text-cyan" />
          Add add-on
        </button>
      )}
    </div>
  );
}
