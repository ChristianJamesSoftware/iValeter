"use client";

import { useState } from "react";
import { Mail, Phone, MessageCircle, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

const FAQS = [
  {
    q: "How do I add a new booking?",
    a: 'Click "New Booking" in the left navigation bar. Fill in the vehicle registration, customer name, service type, and your preferred ready-by time (8am–5pm). The system will alert you if the site is over its daily valeter allocation.',
  },
  {
    q: "How do I edit or cancel a booking?",
    a: 'Open the Bookings page and click the pencil icon next to any booking. You can change the date, time, service type, and customer information. To cancel, change the status to "Cancelled" from the booking edit screen.',
  },
  {
    q: "What do the booking status colours mean?",
    a: "Pending (grey) — awaiting assignment. Assigned (blue) — valeter allocated. In Progress (orange) — work underway. QC Check (purple) — quality inspection. Completed (green) — job done. Cancelled (red) — booking cancelled.",
  },
  {
    q: "Why am I seeing an allocation warning?",
    a: "Each valeter has an 8-hour (480-minute) daily cap. If your bookings exceed the total valeter time available for the day, an orange warning banner appears. Contact your site manager to adjust the schedule.",
  },
  {
    q: "How do I reset my password?",
    a: 'Visit the login page and click "Forgot your password?" Enter your email address and you\'ll receive a reset link within a few minutes. Check your spam folder if it doesn\'t arrive.',
  },
  {
    q: "Who do I contact if something goes wrong on site?",
    a: "Use the contact form below to reach your account manager. For urgent operational issues, call the number listed under your site's account details.",
  },
];

export function SupportClient() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const inputCls =
    "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-slate-400";
  const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Phase 4: wire to email/notification service
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Contact cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ContactCard
          icon={<Phone className="h-5 w-5 text-orange-500" />}
          label="Phone"
          value="0800 123 4567"
          sub="Mon–Fri, 8am–6pm"
        />
        <ContactCard
          icon={<Mail className="h-5 w-5 text-orange-500" />}
          label="Email"
          value="support@ivaleter.co.uk"
          sub="Response within 4 hours"
        />
        <ContactCard
          icon={<MessageCircle className="h-5 w-5 text-orange-500" />}
          label="Account Manager"
          value="Your dedicated contact"
          sub="Via the form below"
        />
      </div>

      {/* FAQ */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="divide-y divide-slate-50">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50/70 transition-colors"
              >
                <span>{faq.q}</span>
                {openIdx === i ? (
                  <ChevronUp className="h-4 w-4 flex-shrink-0 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
                )}
              </button>
              {openIdx === i && (
                <div className="border-t border-slate-50 bg-slate-50/50 px-5 py-4 text-sm leading-relaxed text-slate-600">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact form */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">Send a Message</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Your account manager will respond within 4 working hours.
          </p>
        </div>
        <div className="px-5 py-6">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-base font-bold text-slate-900">Message sent</p>
              <p className="text-sm text-slate-500">
                We'll be in touch shortly. Thank you!
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setName("");
                  setEmail("");
                  setMessage("");
                }}
                className="mt-2 text-xs font-medium text-orange-500 hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
              <div>
                <label className={labelCls}>Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First and last name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.co.uk"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Message</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the issue or question…"
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="h-11 rounded-lg bg-orange-500 px-6 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}
