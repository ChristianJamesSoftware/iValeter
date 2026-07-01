"use client";

import { useState, useEffect, useRef } from "react";
import { X, Building2, ChevronRight, PlusCircle, Search, Check } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Step = "pick-ho" | "dealership-details";

const INPUT =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

export function AddDealershipModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("pick-ho");

  // Step 1: Head office selection
  const [search, setSearch] = useState("");
  const [selectedHoId, setSelectedHoId] = useState<string | null>(null);
  const [selectedHoName, setSelectedHoName] = useState("");
  const [creatingHo, setCreatingHo] = useState(false);
  const [newHoName, setNewHoName] = useState("");
  const [newHoAddress, setNewHoAddress] = useState("");
  const [newHoEmail, setNewHoEmail] = useState("");
  const [newHoPhone, setNewHoPhone] = useState("");

  // Step 2: Dealership details
  const [dealerName, setDealerName] = useState("");
  const [dealerAddress, setDealerAddress] = useState("");
  const [dealerContact, setDealerContact] = useState("");
  const [dealerEmail, setDealerEmail] = useState("");
  const [dealerPhone, setDealerPhone] = useState("");

  // ── Queries / mutations ─────────────────────────────────────────────────────
  const hoQuery = trpc.organisations.listAll.useQuery();
  const headOffices = (hoQuery.data ?? []).filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()),
  );

  const createHo = trpc.organisations.createHeadOffice.useMutation({
    onSuccess: async (data) => {
      await utils.organisations.listAll.invalidate();
      setSelectedHoId(data.id);
      setSelectedHoName(data.name);
      setCreatingHo(false);
      setStep("dealership-details");
    },
  });

  const createDealer = trpc.dealerships.createForHeadOffice.useMutation({
    onSuccess: async (data) => {
      await utils.dealerships.listAll.invalidate();
      onClose();
      router.push(`/admin/dealerships/${data.id}`);
    },
  });

  // ── Keyboard close ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { searchRef.current?.focus(); }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function selectHo(id: string, name: string) {
    setSelectedHoId(id);
    setSelectedHoName(name);
    setCreatingHo(false);
    setStep("dealership-details");
  }

  function handleCreateHo() {
    if (!newHoName.trim()) return;
    createHo.mutate({
      name: newHoName.trim(),
      address: newHoAddress.trim() || undefined,
      contactEmail: newHoEmail.trim() || undefined,
      contactPhone: newHoPhone.trim() || undefined,
    });
  }

  function handleCreateDealer() {
    if (!selectedHoId || !dealerName.trim()) return;
    createDealer.mutate({
      organisationId: selectedHoId,
      name: dealerName.trim(),
      address: dealerAddress.trim() || undefined,
      contactName: dealerContact.trim() || undefined,
      contactEmail: dealerEmail.trim() || undefined,
      contactPhone: dealerPhone.trim() || undefined,
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-heading text-lg font-black text-slate-900">
              {step === "pick-ho" ? "Add Dealership" : "Dealership Details"}
            </h2>
            <p className="text-xs text-slate-400">
              {step === "pick-ho"
                ? "Step 1 of 2 — Choose or create a head office"
                : `Step 2 of 2 — Under ${selectedHoName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Step 1: Pick head office ─────────────────────────────────────── */}
        {step === "pick-ho" && (
          <div className="p-6">
            {!creatingHo ? (
              <>
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search head offices…"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* Head office list */}
                <div className="mb-3 max-h-64 overflow-y-auto rounded-xl border border-slate-100">
                  {hoQuery.isLoading ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-400">Loading…</p>
                  ) : headOffices.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-400">
                      {search ? `No head offices matching "${search}"` : "No head offices yet."}
                    </p>
                  ) : (
                    headOffices.map((ho) => (
                      <button
                        key={ho.id}
                        onClick={() => selectHo(ho.id, ho.name)}
                        className={cn(
                          "flex w-full items-center justify-between border-b border-slate-50 px-4 py-3 text-left text-sm transition last:border-0 hover:bg-slate-50",
                          !ho.isActive && "opacity-50",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="font-medium text-slate-900">{ho.name}</span>
                          {!ho.isActive && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                              Inactive
                            </span>
                          )}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                      </button>
                    ))
                  )}
                </div>

                {/* Divider */}
                <div className="relative mb-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-slate-400">or</span>
                  </div>
                </div>

                {/* Create new HO button */}
                <button
                  onClick={() => setCreatingHo(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-semibold text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create new head office
                </button>
              </>
            ) : (
              /* ── Create new HO inline form ── */
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">New head office</p>
                  <button
                    onClick={() => setCreatingHo(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    ← Back to list
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    autoFocus
                    value={newHoName}
                    onChange={(e) => setNewHoName(e.target.value)}
                    placeholder="Head office name *"
                    className={INPUT}
                  />
                  <input
                    value={newHoAddress}
                    onChange={(e) => setNewHoAddress(e.target.value)}
                    placeholder="Address"
                    className={INPUT}
                  />
                  <input
                    value={newHoEmail}
                    onChange={(e) => setNewHoEmail(e.target.value)}
                    placeholder="Contact email"
                    type="email"
                    className={INPUT}
                  />
                  <input
                    value={newHoPhone}
                    onChange={(e) => setNewHoPhone(e.target.value)}
                    placeholder="Contact phone"
                    className={INPUT}
                  />
                </div>
                {createHo.error && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {createHo.error.message}
                  </p>
                )}
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setCreatingHo(false)}
                    className="h-11 flex-1 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!newHoName.trim() || createHo.isPending}
                    onClick={handleCreateHo}
                    className="h-11 flex-1 rounded-lg bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    {createHo.isPending ? "Creating…" : "Create & continue →"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Dealership details ───────────────────────────────────── */}
        {step === "dealership-details" && (
          <div className="p-6">
            {/* Breadcrumb pill */}
            <div className="mb-4 flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400">Head office:</span>
              <span className="font-semibold text-slate-700">{selectedHoName}</span>
              <button
                onClick={() => setStep("pick-ho")}
                className="ml-auto text-slate-400 hover:text-slate-600"
              >
                Change
              </button>
            </div>

            <div className="space-y-3">
              <input
                autoFocus
                value={dealerName}
                onChange={(e) => setDealerName(e.target.value)}
                placeholder="Dealership name *"
                className={INPUT}
              />
              <input
                value={dealerAddress}
                onChange={(e) => setDealerAddress(e.target.value)}
                placeholder="Address"
                className={INPUT}
              />
              <input
                value={dealerContact}
                onChange={(e) => setDealerContact(e.target.value)}
                placeholder="Contact name"
                className={INPUT}
              />
              <input
                value={dealerEmail}
                onChange={(e) => setDealerEmail(e.target.value)}
                placeholder="Contact email"
                type="email"
                className={INPUT}
              />
              <input
                value={dealerPhone}
                onChange={(e) => setDealerPhone(e.target.value)}
                placeholder="Contact phone"
                className={INPUT}
              />
            </div>

            {createDealer.error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {createDealer.error.message}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setStep("pick-ho")}
                className="h-11 flex-1 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                ← Back
              </button>
              <button
                disabled={!dealerName.trim() || createDealer.isPending}
                onClick={handleCreateDealer}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {createDealer.isPending ? (
                  "Creating…"
                ) : (
                  <><Check className="h-4 w-4" /> Create dealership</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
