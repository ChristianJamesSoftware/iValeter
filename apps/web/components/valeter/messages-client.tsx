"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/react";
import { Send, MessageCircle, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

function fmtTime(d: Date | string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FAQS = [
  {
    q: "How do I request overtime?",
    a: 'Go to the Timesheet page and tap "Request Overtime". Fill in the date, hours, and reason. You\'ll be notified once head office has reviewed it.',
  },
  {
    q: "When do I submit my timesheet?",
    a: "Tap the Timesheet tab, review your week, and press Submit Timesheet on or before Saturday. You\'ll receive a reminder. The deadline to edit is Monday at 8am.",
  },
  {
    q: "Why does my clock-in show an off-site warning?",
    a: "Your device GPS placed you outside the site boundary. This is logged and reviewed by head office. If it was a GPS error, contact your manager.",
  },
  {
    q: "How do I download my pay slip?",
    a: "Go to Pay History. Any approved timesheet has a download button on the right. This gives you a copy of the submitted hours and status.",
  },
];

export function MessagesClient({ meUserId }: { meUserId: string }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();
  const { data: inbox, isLoading } = trpc.messages.inbox.useQuery(undefined, {
    refetchInterval: 30_000, // poll every 30s
  });
  const markAllRead = trpc.messages.markAllRead.useMutation({
    onSuccess: () => void utils.messages.inbox.invalidate(),
  });
  const sendMut = trpc.messages.send.useMutation({
    onSuccess: () => {
      setReplyBody("");
      setReplyTo(null);
      void utils.messages.inbox.invalidate();
    },
  });

  // Mark all read on mount
  useEffect(() => {
    void markAllRead.mutateAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messages = inbox ?? [];

  function handleReply(fromUserId: string) {
    setReplyTo(fromUserId);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!replyTo || !replyBody.trim()) return;
    await sendMut.mutateAsync({ toUserId: replyTo, body: replyBody.trim() });
  }

  return (
    <div className="space-y-4 px-4 pb-6">
      {/* Inbox */}
      <div className="rounded-2xl bg-white/10">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-orange-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Messages
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="px-5 py-8 text-center text-sm text-white/40">Loading messages…</div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-white/40">
            No messages yet. Your manager will send updates here.
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="border-b border-white/5 px-5 py-4 last:border-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-bold text-orange-400">
                  {msg.fromUser.firstName} {msg.fromUser.lastName}
                  <span className="ml-1 font-normal capitalize text-white/30">
                    ({msg.fromUser.role.replace("_", " ")})
                  </span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/80">{msg.body}</p>
                <p className="mt-1 text-[10px] text-white/30">{fmtTime(msg.createdAt)}</p>
              </div>
            </div>
            <button
              onClick={() => handleReply(msg.fromUser.id ?? msg.fromUserId)}
              className="mt-2 text-xs font-semibold text-orange-400 hover:underline"
            >
              Reply
            </button>
          </div>
        ))}
      </div>

      {/* Reply form */}
      {replyTo && (
        <form onSubmit={handleSend} className="rounded-2xl bg-white/10 px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Reply to message
          </p>
          <textarea
            ref={inputRef}
            rows={3}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Type your reply…"
            className="w-full resize-none rounded-xl bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={!replyBody.trim() || sendMut.isPending}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {sendMut.isPending ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="h-10 rounded-xl px-4 text-sm text-white/50 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* FAQ */}
      <div className="overflow-hidden rounded-2xl bg-white/10">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-orange-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Help & FAQ
            </p>
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-semibold text-white"
              >
                <span>{faq.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="h-4 w-4 flex-shrink-0 text-white/30" />
                ) : (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-white/30" />
                )}
              </button>
              {openFaq === i && (
                <div className="border-t border-white/5 bg-white/5 px-5 py-3 text-xs leading-relaxed text-white/60">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-2xl bg-white/10 px-5 py-4 text-center">
        <p className="text-xs text-white/40">
          Urgent issue? Call head office on{" "}
          <a href="tel:08001234567" className="font-semibold text-orange-400">
            0800 123 4567
          </a>
        </p>
      </div>
    </div>
  );
}
