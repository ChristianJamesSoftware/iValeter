"use client";

import { useState } from "react";
import {
  Send,
  Loader2,
  Clock,
  MessageSquare,
  Star,
  Trophy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import type { RouterOutputs } from "@/lib/trpc/react";
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

type TemplateKey = "weekly_pulse" | "five_star_share" | "csi_100";
type RoleOption = "org_admin" | "dealership_user" | "management";

interface TemplateConfig {
  key: TemplateKey;
  icon: React.JSX.Element;
  title: string;
  description: string;
  previewText: string;
  defaultRoles: RoleOption[];
  variables?: { key: string; label: string; placeholder: string }[];
}

const TEMPLATES: TemplateConfig[] = [
  {
    key: "weekly_pulse",
    icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
    title: "Weekly Feedback Pulse",
    description:
      "Ask your team how the week went. Replies come back as Great, Amazing, or a flag to catch up.",
    previewText:
      "How did this week go? Reply to let us know: Great | Amazing | Let's catch up",
    defaultRoles: ["org_admin", "management"],
    variables: [],
  },
  {
    key: "five_star_share",
    icon: <Star className="h-5 w-5 text-amber-500" />,
    title: "Share a 5-Star Review",
    description:
      "Share a 5-star quality score with the Head of Business and managers.",
    previewText:
      "⭐⭐⭐⭐⭐ Great news — [Valeter] received a 5-star review on [Reg] at [Site]",
    defaultRoles: ["org_admin", "dealership_user", "management"],
    variables: [
      { key: "valeterName", label: "Valeter Name", placeholder: "e.g. John Smith" },
      { key: "vehicleReg", label: "Vehicle Reg", placeholder: "e.g. AB21 XYZ" },
      { key: "siteName", label: "Site Name", placeholder: "e.g. Arnold Clark MK" },
    ],
  },
  {
    key: "csi_100",
    icon: <Trophy className="h-5 w-5 text-emerald-500" />,
    title: "CSI 100% Achievement",
    description:
      "Celebrate a perfect CSI score with your Head of Business and management team.",
    previewText:
      "🏆 [Site] just scored 100% CSI this week. Congratulations to the whole team!",
    defaultRoles: ["org_admin", "management"],
    variables: [
      { key: "siteName", label: "Site Name", placeholder: "e.g. Arnold Clark MK" },
    ],
  },
];

const ROLE_OPTIONS: { value: RoleOption; label: string }[] = [
  { value: "org_admin", label: "Managers (org_admin)" },
  { value: "management", label: "Site Managers (management)" },
  { value: "dealership_user", label: "Customers (dealership_user)" },
];

type FeedbackReply = RouterOutputs["hq"]["listFeedbackReplies"][number];

function FeedbackBadge({ reply }: { reply: string }) {
  if (reply === "great") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
        Great
      </span>
    );
  }
  if (reply === "amazing") {
    return (
      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
        Amazing
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
      Let&apos;s catch up
    </span>
  );
}

interface TemplateCardProps {
  template: TemplateConfig;
  sites: Site[];
  isExpanded: boolean;
  onToggle: () => void;
}

function TemplateCard({ template, sites, isExpanded, onToggle }: TemplateCardProps) {
  const [selectedRoles, setSelectedRoles] = useState<RoleOption[]>(
    template.defaultRoles,
  );
  const [siteId, setSiteId] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    (template.variables ?? []).forEach((v) => { init[v.key] = ""; });
    return init;
  });
  const [sentCount, setSentCount] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const smartBroadcast = trpc.hq.smartBroadcast.useMutation({
    onSuccess: (data) => {
      setSentCount(data.sent);
      void utils.messages.sent.invalidate();
      setTimeout(() => { setSentCount(null); onToggle(); }, 3000);
    },
  });

  function toggleRole(role: RoleOption) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function handleSend() {
    if (selectedRoles.length === 0) return;
    const vars: Record<string, string> = {};
    (template.variables ?? []).forEach((v) => {
      if (variables[v.key]) vars[v.key] = variables[v.key] ?? "";
    });
    smartBroadcast.mutate({
      templateKey: template.key,
      roles: selectedRoles,
      siteId: siteId || undefined,
      variables: Object.keys(vars).length > 0 ? vars : undefined,
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50">
            {template.icon}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{template.title}</p>
          </div>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          {template.description}
        </p>
        <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs italic text-slate-400">
          {template.previewText}
        </p>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors",
            isExpanded
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
              : "bg-orange-500 text-white hover:bg-orange-600",
          )}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Cancel
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Send
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-4">
          {/* Audience checkboxes */}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">Audience</p>
            <div className="space-y-1.5">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(opt.value)}
                    onChange={() => toggleRole(opt.value)}
                    className="h-3.5 w-3.5 rounded accent-orange-500"
                  />
                  <span className="text-xs text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Site filter */}
          <div>
            <label
              htmlFor={`site-${template.key}`}
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Site (optional)
            </label>
            <select
              id={`site-${template.key}`}
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Variable inputs */}
          {(template.variables ?? []).length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600">Template Variables</p>
              {(template.variables ?? []).map((v) => (
                <div key={v.key}>
                  <label
                    htmlFor={`var-${template.key}-${v.key}`}
                    className="mb-1 block text-xs text-slate-600"
                  >
                    {v.label}
                  </label>
                  <input
                    id={`var-${template.key}-${v.key}`}
                    type="text"
                    value={variables[v.key] ?? ""}
                    onChange={(e) =>
                      setVariables((prev) => ({ ...prev, [v.key]: e.target.value }))
                    }
                    placeholder={v.placeholder}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Channel notice */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            📱 Sending in-platform message now. SMS and email integration coming soon.
          </div>

          {/* Send button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSend}
              disabled={smartBroadcast.isPending || selectedRoles.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {smartBroadcast.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {smartBroadcast.isPending ? "Sending…" : "Send Template"}
            </button>
            {sentCount !== null && (
              <span className="text-xs font-semibold text-emerald-600">
                Sent to {sentCount} recipient{sentCount !== 1 ? "s" : ""}!
              </span>
            )}
            {smartBroadcast.isError && (
              <span className="text-xs text-red-600">Failed to send.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BroadcastClient({ sites }: BroadcastClientProps) {
  const [activeTab, setActiveTab] = useState<AudienceTab>("valeter");
  const [siteId, setSiteId] = useState("");
  const [body, setBody] = useState("");
  const [lastSentCount, setLastSentCount] = useState<number | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<TemplateKey | null>(null);

  const { data: sentMessages, refetch: refetchSent } =
    trpc.messages.sent.useQuery();

  const { data: feedbackReplies } = trpc.hq.listFeedbackReplies.useQuery({});

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
  const displayedReplies = (feedbackReplies ?? []).slice(0, 10);
  const totalReplies = (feedbackReplies ?? []).length;

  function toggleTemplate(key: TemplateKey) {
    setExpandedTemplate((prev) => (prev === key ? null : key));
  }

  return (
    <div className="space-y-6">
      {/* Section A: Quick Templates */}
      <div>
        <h2 className="mb-1 text-sm font-bold text-slate-700">Quick Templates</h2>
        <p className="mb-4 text-xs text-slate-400">
          Pre-built messages for common broadcast scenarios. Click Send to configure and dispatch.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TEMPLATES.map((t) => (
            <TemplateCard
              key={t.key}
              template={t}
              sites={sites}
              isExpanded={expandedTemplate === t.key}
              onToggle={() => toggleTemplate(t.key)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Manual Broadcast
        </span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {/* Sections B + C */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Section B: Manual Broadcast */}
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

        {/* Right column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Section C: Recent Broadcasts */}
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

          {/* Section D: Feedback Replies */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-bold text-slate-700">
              Feedback Replies
            </h2>
            {totalReplies > 10 && (
              <p className="mb-3 text-xs text-slate-400">
                Showing 10 of {totalReplies} replies
              </p>
            )}
            {displayedReplies.length === 0 ? (
              <p className="text-sm text-slate-400">No replies yet.</p>
            ) : (
              <ul className="space-y-2">
                {displayedReplies.map((r: FeedbackReply) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {r.fromUser.firstName} {r.fromUser.lastName}
                      </p>
                      {r.fromUser.site?.name && (
                        <p className="truncate text-[10px] text-slate-400">
                          {r.fromUser.site.name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <FeedbackBadge reply={r.reply} />
                      <span className="text-[10px] text-slate-400">
                        {new Date(r.createdAt).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
