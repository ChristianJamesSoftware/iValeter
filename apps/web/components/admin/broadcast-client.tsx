"use client";

import { useState } from "react";
import { Send, Loader2, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type Site = {
  id: string;
  name: string;
};

interface BroadcastClientProps {
  sites: Site[];
}

type AudienceTab = "valeter" | "org_admin" | "dealership_user" | "all";

const TABS: { value: AudienceTab; label: string }[] = [
  { value: "valeter", label: "Valeters" },
  { value: "org_admin", label: "Managers" },
  { value: "dealership_user", label: "Customers" },
  { value: "all", label: "All" },
];

export function BroadcastClient({ sites }: BroadcastClientProps) {
  const [activeTab, setActiveTab] = useState<AudienceTab>("valeter");
  const [siteId, setSiteId] = useState("");
  const [body, setBody] = useState("");
  const [lastSentCount, setLastSentCount] = useState<number | null>(null);

  const { data: sentMessages, refetch: refetchSent } =
    trpc.messages.sent.useQuery();

  const broadcastMutation = trpc.hq.broadcast.useMutation({
    onSuccess: (data) => {
      setLastSentCount(data.sent);
      setBody("");
      void refetchSent();
      setTimeout(() => setLastSentCount(null), 5000);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    broadcastMutation.mutate({
      role: activeTab,
      siteId: siteId || undefined,
      body: body.trim(),
    });
  }

  const displayed = (sentMessages ?? []).slice(0, 20);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Composer */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-700">Compose Broadcast</h2>

          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors",
                  activeTab === tab.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Site filter */}
            <div>
              <label
                htmlFor="bc-site"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Site filter (optional)
              </label>
              <select
                id="bc-site"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">All sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Body */}
            <div>
              <label
                htmlFor="bc-body"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Message
              </label>
              <textarea
                id="bc-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder={`Write your message to ${TABS.find((t) => t.value === activeTab)?.label ?? "everyone"}…`}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={broadcastMutation.isPending || !body.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {broadcastMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-label="Sending" />
                ) : (
                  <Send className="h-4 w-4" aria-label="Send" />
                )}
                {broadcastMutation.isPending ? "Sending…" : "Send"}
              </button>
              {lastSentCount !== null && (
                <span className="text-sm font-semibold text-emerald-600">
                  Sent to {lastSentCount} recipient{lastSentCount !== 1 ? "s" : ""}
                </span>
              )}
              {broadcastMutation.isError && (
                <span className="text-sm text-red-600">Failed to send.</span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Sent history */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-700">
            Recent Broadcasts
          </h2>
          {displayed.length === 0 ? (
            <p className="text-sm text-slate-400">No messages sent yet.</p>
          ) : (
            <ul className="space-y-3">
              {displayed.map((msg) => (
                <li
                  key={msg.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <p className="line-clamp-2 text-sm text-slate-800">
                    {msg.body}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3 w-3" aria-label="Sent at" />
                    {new Date(msg.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <span className="mx-1">·</span>
                    <span className="capitalize">
                      {msg.toUser.role.replace("_", " ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
