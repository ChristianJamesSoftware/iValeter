"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InactiveValeter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  siteName: string | null;
  lastSeen: Date | null;
  daysSince: number | null;
  neverLoggedIn: boolean;
}

interface InactiveClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  siteName: string | null;
  lastBookingAt: Date | null;
  daysSinceBooking: number | null;
  neverBooked: boolean;
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm text-white font-medium transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Urgency badge ────────────────────────────────────────────────────────────

function UrgencyBadge({
  days,
  never,
  label,
}: {
  days: number | null;
  never: boolean;
  label: string;
}) {
  if (never || days === null || days >= 14) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
        {never ? `Never ${label}` : `${days}d ago`}
      </span>
    );
  }
  if (days >= 7) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        {days}d ago
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      {days}d ago
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      Suspended
    </span>
  );
}

// ─── Valeter Row ──────────────────────────────────────────────────────────────

interface ValeterRowProps {
  valeter: InactiveValeter;
  onSuspend: (id: string, name: string) => void;
  onArchive: (id: string, name: string) => void;
  onReinstate: (id: string, name: string) => void;
}

function ValeterRow({
  valeter,
  onSuspend,
  onArchive,
  onReinstate,
}: ValeterRowProps) {
  const fullName = `${valeter.firstName} ${valeter.lastName}`;
  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900 text-sm">{fullName}</div>
        <div className="text-xs text-gray-500">{valeter.email}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {valeter.siteName ?? <span className="text-gray-400 italic">Unassigned</span>}
      </td>
      <td className="px-4 py-3">
        <UrgencyBadge
          days={valeter.daysSince}
          never={valeter.neverLoggedIn}
          label="logged in"
        />
      </td>
      <td className="px-4 py-3">
        <StatusBadge isActive={valeter.isActive} />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {valeter.isActive ? (
            <>
              <button
                onClick={() => onSuspend(valeter.id, fullName)}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition"
              >
                Suspend
              </button>
              <button
                onClick={() => onArchive(valeter.id, fullName)}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-pink-100 text-pink-700 hover:bg-pink-200 transition"
              >
                Archive
              </button>
            </>
          ) : (
            <button
              onClick={() => onReinstate(valeter.id, fullName)}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
            >
              Reinstate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Client Row ───────────────────────────────────────────────────────────────

interface ClientRowProps {
  client: InactiveClient;
  onSuspend: (id: string, name: string) => void;
  onArchive: (id: string, name: string) => void;
  onReinstate: (id: string, name: string) => void;
}

function ClientRow({
  client,
  onSuspend,
  onArchive,
  onReinstate,
}: ClientRowProps) {
  const fullName = `${client.firstName} ${client.lastName}`;
  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900 text-sm">{fullName}</div>
        <div className="text-xs text-gray-500">{client.email}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {client.siteName ?? <span className="text-gray-400 italic">Unassigned</span>}
      </td>
      <td className="px-4 py-3">
        <UrgencyBadge
          days={client.daysSinceBooking}
          never={client.neverBooked}
          label="booked"
        />
      </td>
      <td className="px-4 py-3">
        <StatusBadge isActive={client.isActive} />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {client.isActive ? (
            <>
              <button
                onClick={() => onSuspend(client.id, fullName)}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition"
              >
                Suspend
              </button>
              <button
                onClick={() => onArchive(client.id, fullName)}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-pink-100 text-pink-700 hover:bg-pink-200 transition"
              >
                Archive
              </button>
            </>
          ) : (
            <button
              onClick={() => onReinstate(client.id, fullName)}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
            >
              Reinstate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InactiveUsersClient() {
  const [activeTab, setActiveTab] = useState<"valeters" | "clients">("valeters");

  // Confirm dialog state
  const [dialog, setDialog] = useState<{
    open: boolean;
    action: "suspend" | "archive" | "reinstate" | null;
    userId: string;
    userName: string;
  }>({ open: false, action: null, userId: "", userName: "" });

  // Queries
  const valetersQuery = trpc.inactiveUsers.inactiveValeters.useQuery({});
  const clientsQuery = trpc.inactiveUsers.inactiveClients.useQuery({});

  const utils = trpc.useUtils();

  function invalidate() {
    void utils.inactiveUsers.inactiveValeters.invalidate();
    void utils.inactiveUsers.inactiveClients.invalidate();
  }

  // Mutations
  const suspend = trpc.inactiveUsers.suspend.useMutation({ onSuccess: invalidate });
  const archive = trpc.inactiveUsers.archive.useMutation({ onSuccess: invalidate });
  const reinstate = trpc.inactiveUsers.reinstate.useMutation({ onSuccess: invalidate });

  function openDialog(
    action: "suspend" | "archive" | "reinstate",
    userId: string,
    userName: string
  ) {
    setDialog({ open: true, action, userId, userName });
  }

  function closeDialog() {
    setDialog({ open: false, action: null, userId: "", userName: "" });
  }

  function handleConfirm() {
    const { action, userId } = dialog;
    if (!action || !userId) return;
    if (action === "suspend") suspend.mutate({ userId });
    if (action === "archive") archive.mutate({ userId });
    if (action === "reinstate") reinstate.mutate({ userId });
    closeDialog();
  }

  const valeterCount = valetersQuery.data?.length ?? 0;
  const clientCount = clientsQuery.data?.length ?? 0;

  const dialogMeta = {
    suspend: {
      title: `Suspend ${dialog.userName}?`,
      message:
        "This will block the user from logging in. You can reinstate them at any time.",
      confirmLabel: "Suspend",
      confirmClass: "bg-orange-600 hover:bg-orange-700",
    },
    archive: {
      title: `Archive ${dialog.userName}?`,
      message:
        "This will suspend the user and mark them as archived. Their data is preserved and they can be reinstated later.",
      confirmLabel: "Archive",
      confirmClass: "bg-pink-600 hover:bg-pink-700",
    },
    reinstate: {
      title: `Reinstate ${dialog.userName}?`,
      message: "This will re-enable the user's access to the platform.",
      confirmLabel: "Reinstate",
      confirmClass: "bg-green-600 hover:bg-green-700",
    },
  };

  const meta = dialog.action ? dialogMeta[dialog.action] : dialogMeta.suspend;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Suspend</strong> blocks login but keeps the account active — fully reversible.{" "}
        <strong>Archive</strong> is a soft-delete — data is preserved and the account can be
        reinstated at any time.
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("valeters")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "valeters"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Inactive Valeters
          {valeterCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
              {valeterCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("clients")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "clients"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Inactive Clients
          {clientCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
              {clientCount}
            </span>
          )}
        </button>
      </div>

      {/* Valeters table */}
      {activeTab === "valeters" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Valeters who have not logged in for 3 or more consecutive days.
            </p>
          </div>
          {valetersQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
          ) : valetersQuery.error ? (
            <div className="p-8 text-center text-sm text-red-500">
              Failed to load valeters.
            </div>
          ) : valeterCount === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No inactive valeters — all clear.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3">Name / Email</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {valetersQuery.data?.map((v) => (
                    <ValeterRow
                      key={v.id}
                      valeter={v}
                      onSuspend={(id, name) => openDialog("suspend", id, name)}
                      onArchive={(id, name) => openDialog("archive", id, name)}
                      onReinstate={(id, name) => openDialog("reinstate", id, name)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Clients table */}
      {activeTab === "clients" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Client accounts with no booking created in the last 14 days.
            </p>
          </div>
          {clientsQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
          ) : clientsQuery.error ? (
            <div className="p-8 text-center text-sm text-red-500">
              Failed to load clients.
            </div>
          ) : clientCount === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No inactive clients — all clear.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3">Name / Email</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Last Booking</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientsQuery.data?.map((c) => (
                    <ClientRow
                      key={c.id}
                      client={c}
                      onSuspend={(id, name) => openDialog("suspend", id, name)}
                      onArchive={(id, name) => openDialog("archive", id, name)}
                      onReinstate={(id, name) => openDialog("reinstate", id, name)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={dialog.open}
        title={meta.title}
        message={meta.message}
        confirmLabel={meta.confirmLabel}
        confirmClass={meta.confirmClass}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />
    </div>
  );
}
