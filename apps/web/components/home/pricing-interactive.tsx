"use client";

import { useState } from "react";
import Link from "next/link";

const GROUPS = [
  { sites: "2–3 sites",  monthly: 279,  annual: 237,  savingAnnual: 504  },
  { sites: "4–5 sites",  monthly: 449,  annual: 381,  savingAnnual: 816  },
  { sites: "6–10 sites", monthly: 749,  annual: 636,  savingAnnual: 1356 },
  { sites: "11+ sites",  monthly: null, annual: null, savingAnnual: null },
];

const FEATURES = [
  { label: "Core Platform", items: [
    "Real-time job tracking board",
    "Valeter mobile app (iOS & Android)",
    "Customer / dealer booking portal",
    "Recurring bookings",
    "Vehicle reg lookup (DVLA)",
    "Do Not Clean flag with full-screen alert",
    "Duplicate job prevention",
  ]},
  { label: "Timesheets & Attendance", items: [
    "Geofenced clock-in (GPS verified)",
    "Late arrival alerts",
    "Weekly timesheet auto-generation",
    "Timesheet approval workflow",
    "Holiday & time-off requests",
  ]},
  { label: "Quality & Compliance", items: [
    "Before & after photo capture",
    "CSI quality scoring (1–5 stars)",
    "New & used car delivery inspections",
    "Vehicle parking pin (Google Maps link)",
    "Accident & damage records with recovery tracking",
  ]},
  { label: "Finance & Payroll", items: [
    "Weekly payroll run from approved timesheets",
    "NatWest Bankline bulk payment export",
    "Xero accounting integration",
    "Auto-push invoices on payroll approval",
    "Spend Gatekeeper (per-job budget caps)",
    "Bank details change audit trail (verbal confirm)",
    "Receipt & expense submission",
  ]},
  { label: "Reporting & Analytics", items: [
    "Days in Prep analytics",
    "Attendance & absence reports",
    "Cross-site KPI dashboard",
    "Weekly ops summary export",
  ]},
  { label: "Team & Communications", items: [
    "Unlimited valeters, managers & admin users",
    "SMS broadcast (TotValeting sender ID)",
    "Review feedback pulse (one-tap reply)",
    "Service charge & pay history (valeter app)",
    "Training & compliance tracking",
  ]},
];

const FAQS: [string, string][] = [
  ["What counts as a site?", "A site is one physical dealership location — one address, one bay operation. A dealer group with three showrooms has three sites. Each site gets full access to every feature."],
  ["Are there any per-user charges?", "No — never. Add as many valeters, managers, and dealership staff as you need on a single site subscription. We built per-site pricing specifically because valeting team sizes vary week to week."],
  ["What happens after the 90-day launch price?", "Your price moves to £149 + VAT/site/month. We'll give you 30 days' notice before the change and the option to lock in annual billing at £127/site/month before it kicks in."],
  ["Is there a setup fee?", "No setup fee for single sites. For dealer groups (2+ sites) onboarding is quoted at £750–£2,500 depending on number of sites, data import complexity, Xero setup, team training and any custom reporting needed."],
  ["What's included in the 30-day trial?", "The full platform — every feature listed, unlimited users, live Xero connection, SMS broadcast. No credit card required. We set up your site, import your team, and walk you through everything in a live call."],
  ["How does Xero integration work?", "iValeter maps your valet nominal codes and pushes invoices automatically when payroll is approved. No manual exports, no double-entry. It works with any UK Xero account."],
  ["How does SMS broadcast work?", "Your messages go out from the sender ID 'TotValeting'. The SMS Works (our provider) charges from 3.1p/SMS, billed separately to your iValeter subscription. No markup from us."],
  ["Can I cancel anytime?", "Yes. No lock-in, no cancellation fees, no notice period beyond the current billing month. We think the platform should earn your business every month."],
];

function CheckIcon({ color = "#6B8F71" }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" style={{flexShrink:0,marginTop:2}}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

export function PricingInteractive() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const isAnnual = billing === "annual";

  return (
    <>
      {/* BILLING TOGGLE */}
      <div className="ivp-toggle-wrap">
        <div className="ivp-toggle">
          <button className={billing === "monthly" ? "on" : ""} onClick={() => setBilling("monthly")}>Monthly</button>
          <button className={billing === "annual" ? "on" : ""} onClick={() => setBilling("annual")}>Annual</button>
        </div>
        <span className="ivp-save-pill" style={{opacity: isAnnual ? 1 : 0, transition: "opacity 0.2s"}}>
          2 months free — save 15%
        </span>
      </div>

      {/* MAIN PRICE + GROUP CARDS */}
      <div className="ivp-main-block">
        <div className="ivp-card-wrap">

          {/* Single site card */}
          <div className="ivp-main-card">
            <div className="ivp-launch-badge">Launch offer</div>
            <p className="ivp-card-name">Full Valet Operations Platform</p>
            <div className="ivp-price-row">
              <span className="ivp-price-big">{isAnnual ? "£84" : "£99"}</span>
              <span className="ivp-price-unit">/site/mo</span>
            </div>
            <p className="ivp-price-note">
              {isAnnual ? "£999/site/year · excl. VAT" : "Excl. VAT · billed monthly"}
            </p>
            <p className="ivp-price-was">
              {isAnnual ? "Normally £127/site/mo on annual billing" : "Moves to £149/site/mo after 90 days"}
            </p>
            <p className="ivp-card-desc">
              Everything iValeter does — real-time job tracking, geofenced timesheets,
              Xero integration, payroll export, SMS broadcast, CSI scoring, before &amp; after photos,
              delivery inspections, and full reporting. One site, one price, one platform.
            </p>
            <a href="/home#iv-contact" className="ivp-cta-btn">Start free 30-day trial →</a>
            <p className="ivp-cta-sub">No credit card · No lock-in · Full platform from day one</p>

            {FEATURES.map((group) => (
              <div className="ivp-feat-group" key={group.label}>
                <p className="ivp-feat-group-label">{group.label}</p>
                <ul className="ivp-feat-list">
                  {group.items.map((item) => (
                    <li className="ivp-feat-item" key={item}>
                      <CheckIcon />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Group pricing card */}
          <div className="ivp-group-card">
            <span className="ivp-eyebrow">Dealer Groups</span>
            <h3>Multiple sites?<br/>The more you add, the less you pay.</h3>
            <p className="ivp-group-intro">
              Every site gets the full platform. Volume discounts apply automatically
              as your group grows — no negotiation needed.
            </p>

            <div className="ivp-group-rows">
              {GROUPS.map((g, i) => (
                <div key={g.sites}>
                  {i > 0 && <div className="ivp-group-divider" />}
                  <div className="ivp-group-row">
                    <span className="ivp-group-row-label">{g.sites}</span>
                    <div className="ivp-group-row-price">
                      {g.monthly === null ? (
                        <a href="/home#iv-contact" className="ivp-group-row-poa">Contact us →</a>
                      ) : (
                        <>
                          <div style={{display:"flex",alignItems:"center",gap:"0.5rem",justifyContent:"flex-end"}}>
                            <span className="ivp-group-row-amount">
                              £{isAnnual ? g.annual : g.monthly}/mo
                            </span>
                            {isAnnual && g.savingAnnual && (
                              <span className="ivp-group-saving">Save £{g.savingAnnual}/yr</span>
                            )}
                          </div>
                          <div className="ivp-group-row-note">
                            {isAnnual
                              ? `£${Math.round(((g.annual ?? 0) * 12) / (i === 0 ? 2.5 : i === 1 ? 4.5 : 8))}/site/yr`
                              : `all sites · full platform`}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ivp-group-onboarding">
              <strong>Onboarding for groups:</strong> £750–£2,500 + VAT depending on number of sites,
              data import, Xero setup, team training and custom reporting. Quoted before you commit — no surprises.
            </div>

            <a href="/home#iv-contact" className="ivp-cta-outline">Talk to us about your group →</a>
            <p style={{fontSize:"0.8rem",color:"var(--ink-light)",marginTop:"0.75rem",textAlign:"center"}}>
              We typically respond within one working day.
            </p>
          </div>
        </div>

        {/* Trust bar */}
        <div className="ivp-trust">
          {["30-day free trial — no card required","Cancel anytime — no lock-in","All prices exclude VAT","Setup & onboarding included"].map((t) => (
            <span className="ivp-trust-item" key={t}>
              <CheckIcon />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <section className="ivp-faq">
        <div className="ivp-container">
          <div className="ivp-faq-inner">
            <div>
              <span className="ivp-eyebrow">FAQ</span>
              <h2>Common questions</h2>
              <p className="ivp-faq-contact">
                Something not covered here?<br/>
                Email <a href="mailto:hello@ivaleter.co.uk">hello@ivaleter.co.uk</a>
              </p>
            </div>
            <div className="ivp-faq-list">
              {FAQS.map(([q, a], i) => (
                <div className="ivp-faq-item" key={i}>
                  <button
                    className="ivp-faq-q"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    {q}
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      style={{flexShrink:0, transition:"transform 200ms", transform: openFaq === i ? "rotate(45deg)" : "none"}}
                    >
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                  {openFaq === i && <p className="ivp-faq-a">{a}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
