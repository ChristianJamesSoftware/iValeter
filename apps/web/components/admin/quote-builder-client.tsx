"use client";

// TODO Phase 4: pull ServiceType pricing from tRPC; wire real PDF generation
import { useState } from "react";
import { Plus, Trash2, FileDown, Link2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

interface LineItem {
  id: string;
  service: string;
  qty: number;
  unitPrice: number;
  duration: string;
}

const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
const labelCls =
  "mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-700";

export function QuoteBuilderClient() {
  const [meta, setMeta] = useState({ dealership: "", contact: "", address: "", validUntil: "" });
  const [terms, setTerms] = useState(
    "Quote valid for 30 days. Prices exclude VAT unless stated. Payment terms: 30 days from invoice.",
  );
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", service: "Full Valet", qty: 10, unitPrice: 35, duration: "1h" },
  ]);

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const vat = subtotal * 0.2;
  const total = subtotal + vat;

  function addItem() {
    setItems((x) => [
      ...x,
      { id: crypto.randomUUID(), service: "", qty: 1, unitPrice: 0, duration: "" },
    ]);
  }
  function update(id: string, patch: Partial<LineItem>) {
    setItems((x) => x.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function remove(id: string) {
    setItems((x) => x.filter((i) => i.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Quote Builder"
        subtitle="Build a branded quote and preview it live."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => console.log("Generate PDF", { meta, items, terms, total })}
              className="flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              <FileDown className="h-4 w-4" />
              Generate PDF
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Link2 className="h-4 w-4" />
              Copy link
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Details</h2>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Dealership name</label>
                <input className={inputCls} value={meta.dealership} onChange={(e) => setMeta({ ...meta, dealership: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Contact name</label>
                <input className={inputCls} value={meta.contact} onChange={(e) => setMeta({ ...meta, contact: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Site address</label>
                <input className={inputCls} value={meta.address} onChange={(e) => setMeta({ ...meta, address: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Valid until</label>
                <input type="date" className={inputCls} value={meta.validUntil} onChange={(e) => setMeta({ ...meta, validUntil: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Services</h2>
              <button onClick={addItem} className="flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:underline">
                <Plus className="h-4 w-4" />
                Add row
              </button>
            </div>
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.id} className="grid grid-cols-12 gap-2">
                  <input placeholder="Service" className={`${inputCls} col-span-5`} value={i.service} onChange={(e) => update(i.id, { service: e.target.value })} />
                  <input type="number" placeholder="Qty" className={`${inputCls} col-span-2`} value={i.qty} onChange={(e) => update(i.id, { qty: Number(e.target.value) })} />
                  <input type="number" placeholder="£" className={`${inputCls} col-span-2`} value={i.unitPrice} onChange={(e) => update(i.id, { unitPrice: Number(e.target.value) })} />
                  <input placeholder="Dur." className={`${inputCls} col-span-2`} value={i.duration} onChange={(e) => update(i.id, { duration: e.target.value })} />
                  <button onClick={() => remove(i.id)} aria-label="Remove" className="col-span-1 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Terms</h2>
            <textarea
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="font-heading text-xl font-bold tracking-tight text-slate-900">
                <span className="text-orange-500">i</span>Valeter
              </p>
              <p className="text-xs text-slate-500">Total Valeting Ltd</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">QUOTE</p>
              {meta.validUntil && (
                <p className="text-xs text-slate-500">Valid until {meta.validUntil}</p>
              )}
            </div>
          </div>

          <div className="mb-6 text-sm">
            <p className="font-medium text-slate-900">{meta.dealership || "Dealership name"}</p>
            <p className="text-slate-500">{meta.contact || "Contact name"}</p>
            <p className="text-slate-500">{meta.address || "Site address"}</p>
          </div>

          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2">Service</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700">{i.service || "—"}</td>
                  <td className="py-2 text-right text-slate-700">{i.qty}</td>
                  <td className="py-2 text-right text-slate-700">£{i.unitPrice.toFixed(2)}</td>
                  <td className="py-2 text-right font-medium text-slate-900">£{(i.qty * i.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto w-48 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT (20%)</span>
              <span>£{vat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>£{total.toFixed(2)}</span>
            </div>
          </div>

          <p className="mt-6 whitespace-pre-wrap text-xs text-slate-500">{terms}</p>

          <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-400">
            Signature: ______________________________
          </div>
        </div>
      </div>
    </div>
  );
}
