"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { PlusCircle, Pencil, Trash2, X, Check, ShieldCheck, Power } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  detailedDescription: string | null;
  durationMonths: number;
  guaranteeNote: string | null;
  priceGbp: number;
  applicationMins: number;
  popular: boolean;
  isActive: boolean;
  sortOrder: number;
};

const blank = {
  name: "",
  description: "",
  detailedDescription: "",
  durationMonths: 12,
  guaranteeNote: "",
  priceGbp: 0,
  applicationMins: 30,
  popular: false,
};

function durationLabel(months: number) {
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
  const years = months / 12;
  return `${years} year${years !== 1 ? "s" : ""}`;
}

function ProductForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: typeof blank;
  onSave: (v: typeof blank) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [v, setV] = useState(initial);

  const f = (field: keyof typeof blank) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.type === "number" ? Number(e.target.value) : e.target.value;
      setV((prev) => ({ ...prev, [field]: val }));
    };

  return (
    <div className="space-y-3 rounded-xl border border-cyan/40 bg-offwhite p-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Name */}
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate">Product Name</label>
          <input
            value={v.name}
            onChange={f("name")}
            placeholder="e.g. Essential, Ceramic Pro"
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate">Short Description</label>
          <input
            value={v.description}
            onChange={f("description")}
            placeholder="One line shown on the booking card"
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </div>

        {/* Detailed description */}
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate">Detailed Description</label>
          <textarea
            value={v.detailedDescription}
            onChange={f("detailedDescription")}
            rows={3}
            placeholder="Full detail shown when customer taps the info icon (e.g. what the product contains, how it works)"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate">Guarantee (months, 0 = none)</label>
          <input
            type="number"
            min={0}
            value={v.durationMonths}
            onChange={f("durationMonths")}
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
          <p className="mt-1 text-xs text-slate">
            {v.durationMonths === 0 ? "No guarantee" : `${durationLabel(v.durationMonths)} guarantee`}
          </p>
        </div>

        {/* Price */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate">Price (£)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={v.priceGbp}
            onChange={f("priceGbp")}
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </div>

        {/* Application time */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate">Application time (mins)</label>
          <input
            type="number"
            min={0}
            step={5}
            value={v.applicationMins}
            onChange={f("applicationMins")}
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
          <p className="mt-1 text-xs text-slate">Added to booking slot duration</p>
        </div>

        {/* Guarantee note */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate">Guarantee Note (optional)</label>
          <input
            value={v.guaranteeNote}
            onChange={f("guaranteeNote")}
            placeholder="e.g. Transferable to new owner"
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </div>

        {/* Popular toggle */}
        <div className="col-span-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setV((prev) => ({ ...prev, popular: !prev.popular }))}
            className={`relative h-6 w-11 rounded-full transition-colors ${v.popular ? "bg-cyan" : "bg-line"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${v.popular ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
          <span className="text-sm text-navy">Mark as Most Popular</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-4 text-sm text-slate hover:bg-offwhite"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
        <button
          disabled={!v.name.trim() || saving}
          onClick={() => onSave(v)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-navy px-4 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" /> Save
        </button>
      </div>
    </div>
  );
}

export function PaintProtectionTab() {
  const utils = trpc.useUtils();
  const { data: products = [], isLoading } = trpc.paintProtection.listAll.useQuery();

  const create = trpc.paintProtection.create.useMutation({
    onSuccess: () => utils.paintProtection.listAll.invalidate(),
  });
  const update = trpc.paintProtection.update.useMutation({
    onSuccess: () => utils.paintProtection.listAll.invalidate(),
  });
  const remove = trpc.paintProtection.delete.useMutation({
    onSuccess: () => utils.paintProtection.listAll.invalidate(),
  });

  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleCreate(v: typeof blank) {
    await create.mutateAsync({ ...v, sortOrder: products.length });
    setShowNew(false);
  }

  async function handleUpdate(id: string, v: typeof blank) {
    await update.mutateAsync({ id, ...v });
    setEditingId(null);
  }

  async function handleToggleActive(p: Product) {
    await update.mutateAsync({ id: p.id, isActive: !p.isActive });
  }

  if (isLoading) return <p className="text-sm text-slate">Loading paint protection products…</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-line bg-offwhite px-4 py-3">
        <p className="text-sm text-slate">
          Define your paint protection catalogue here. Each product appears as a selectable tier on the
          customer booking form. The <strong>application time</strong> is automatically added to the booking
          slot duration when a customer selects that product.
        </p>
      </div>

      {/* Product list */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {products.length === 0 && !showNew ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            No paint protection products defined yet.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {products.map((p) => (
              <li key={p.id} className={`px-5 py-4 ${!p.isActive ? "opacity-50" : ""}`}>
                {editingId === p.id ? (
                  <ProductForm
                    initial={{
                      name: p.name,
                      description: p.description ?? "",
                      detailedDescription: p.detailedDescription ?? "",
                      durationMonths: p.durationMonths,
                      guaranteeNote: p.guaranteeNote ?? "",
                      priceGbp: p.priceGbp,
                      applicationMins: p.applicationMins,
                      popular: p.popular,
                    }}
                    onSave={(v) => handleUpdate(p.id, v)}
                    onCancel={() => setEditingId(null)}
                    saving={update.isPending}
                  />
                ) : confirmDeleteId === p.id ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-navy">
                      Delete <strong>{p.name}</strong>? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="h-8 rounded-lg border border-line px-3 text-xs text-slate hover:bg-offwhite"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          await remove.mutateAsync({ id: p.id });
                          setConfirmDeleteId(null);
                        }}
                        className="h-8 rounded-lg bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-cyan" />
                        <span className="font-medium text-navy">{p.name}</span>
                        {p.popular && (
                          <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-xs font-medium text-cyan">
                            Most Popular
                          </span>
                        )}
                        {!p.isActive && (
                          <span className="rounded-full bg-line px-2 py-0.5 text-xs text-slate">
                            Inactive
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="mt-0.5 text-sm text-slate">{p.description}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate">
                        <span>
                          <strong className="text-navy">£{p.priceGbp.toFixed(2)}</strong>
                        </span>
                        <span>{durationLabel(p.durationMonths)} guarantee</span>
                        {p.applicationMins > 0 && (
                          <span>+{p.applicationMins} mins to booking</span>
                        )}
                        {p.guaranteeNote && <span>{p.guaranteeNote}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(p)}
                        title={p.isActive ? "Deactivate" : "Activate"}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${p.isActive ? "border-line text-slate hover:border-cyan hover:text-cyan" : "border-line text-slate hover:border-green-600 hover:text-green-600"}`}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(p.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-slate hover:border-cyan hover:text-cyan"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-slate hover:border-red-500 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* New product form */}
        {showNew && (
          <div className="border-t border-line p-5">
            <ProductForm
              initial={blank}
              onSave={handleCreate}
              onCancel={() => setShowNew(false)}
              saving={create.isPending}
            />
          </div>
        )}
      </div>

      {!showNew && (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-sm font-medium text-cyan hover:text-cyan/80"
        >
          <PlusCircle className="h-4 w-4" />
          Add paint protection product
        </button>
      )}
    </div>
  );
}
