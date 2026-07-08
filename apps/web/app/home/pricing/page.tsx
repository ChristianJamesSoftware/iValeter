"use client";

import Link from "next/link";
import { useState } from "react";

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const isAnnual = billing === "annual";

  const GROUPS = [
    { sites: "2–3 sites",  monthly: 279,  annual: 237,  saving: 504  },
    { sites: "4–5 sites",  monthly: 449,  annual: 381,  saving: 816  },
    { sites: "6–10 sites", monthly: 749,  annual: 636,  saving: 1356 },
    { sites: "11+ sites",  monthly: null, annual: null, saving: null },
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

  const FAQS = [
    ["What counts as a site?", "A site is one physical dealership location — one address, one bay operation. A dealer group with three showrooms has three sites. Each site gets full access to every feature."],
    ["Are there any per-user charges?", "No — never. Add as many valeters, managers, and dealership staff as you need on a single site subscription. We built per-site pricing specifically because valeting team sizes vary week to week."],
    ["What happens after the 90-day launch price?", "Your price moves to £149 + VAT/site/month. We'll give you 30 days' notice before the change and the option to lock in annual billing at £127/site/month before it kicks in."],
    ["Is there a setup fee?", "No setup fee for single sites. For dealer groups (2+ sites) onboarding is quoted at £750–£2,500 depending on number of sites, data import complexity, Xero setup, team training and any custom reporting needed."],
    ["What's included in the 30-day trial?", "The full platform — every feature listed, unlimited users, live Xero connection, SMS broadcast. No credit card required. We set up your site, import your team, and walk you through everything in a live call."],
    ["How does Xero integration work?", "iValeter maps your valet nominal codes and pushes invoices automatically when payroll is approved. No manual exports, no double-entry. It works with any UK Xero account."],
    ["How does SMS broadcast work?", "Your messages go out from the sender ID 'TotValeting'. The SMS Works (our provider) charges from 3.1p/SMS, billed separately to your iValeter subscription. No markup from us."],
    ["Can I cancel anytime?", "Yes. No lock-in, no cancellation fees, no notice period beyond the current billing month. We think the platform should earn your business every month."],
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        .ivp-root {
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #F5F0E8;
          color: #1C1A16;
          font-size: 1rem;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
        }
        .ivp-root *, .ivp-root *::before, .ivp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .ivp-root a { color: inherit; text-decoration: none; }
        .ivp-root ul { list-style: none; }
        :root {
          --cream: #F5F0E8; --parchment: #EDE7D9; --parchment-2: #E5DDD0;
          --ink: #1C1A16; --ink-mid: #4A4640; --ink-light: #8A8078;
          --border: #D8D0C4; --orange: #E8650A; --orange-hover: #C9530A;
          --sage: #6B8F71; --sage-dark: #4A6B50; --sage-light: #A8C5AC;
          --max-w: 1100px; --radius: 0.375rem; --radius-lg: 0.75rem; --radius-xl: 1rem;
          --tr: 160ms cubic-bezier(0.16,1,0.3,1);
        }

        /* ── Nav ── */
        .ivp-nav { position: sticky; top: 0; z-index: 100; background: var(--cream); border-bottom: 1px solid var(--border); }
        .ivp-nav-inner { max-width: var(--max-w); margin: 0 auto; padding: 0 1.5rem; height: 60px; display: flex; align-items: center; }
        .ivp-logo { display: flex; align-items: center; gap: 0.65rem; flex-shrink: 0; }
        .ivp-logo-text { font-size: 1.125rem; font-weight: 700; color: var(--ink); letter-spacing: -0.01em; }
        .ivp-nav-links { display: flex; align-items: center; gap: 1.5rem; margin-left: auto; }
        .ivp-nav-links a { font-size: 0.875rem; font-weight: 500; color: var(--ink-mid); transition: color var(--tr); }
        .ivp-nav-links a:hover { color: var(--ink); }
        .ivp-nav-links a.active { color: var(--orange); font-weight: 600; }
        .ivp-nav-cta { background: var(--orange) !important; color: #fff !important; padding: 0.5rem 1.1rem; border-radius: var(--radius); font-weight: 600 !important; transition: background var(--tr) !important; }
        .ivp-nav-cta:hover { background: var(--orange-hover) !important; }
        .ivp-nav-signin { color: var(--ink-light) !important; font-weight: 500 !important; }
        .ivp-nav-signin:hover { color: var(--ink) !important; }
        @media (max-width: 640px) { .ivp-nav-links { display: none; } }

        /* ── Shared ── */
        .ivp-container { max-width: var(--max-w); margin: 0 auto; padding: 0 1.5rem; }
        .ivp-eyebrow { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sage); display: block; margin-bottom: 0.75rem; }

        /* ── Hero ── */
        .ivp-hero { padding: 4.5rem 0 3.5rem; text-align: center; }
        .ivp-hero h1 { font-size: clamp(2.25rem, 1.6rem + 2.5vw, 3.5rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.08; color: var(--ink); margin-bottom: 1.25rem; }
        .ivp-hero-sub { font-size: 1.125rem; color: var(--ink-mid); max-width: 540px; margin: 0 auto 2.25rem; line-height: 1.65; }
        .ivp-toggle-wrap { display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
        .ivp-toggle { display: inline-flex; align-items: center; background: var(--parchment); border: 1px solid var(--border); border-radius: 2rem; padding: 0.25rem; }
        .ivp-toggle button { padding: 0.4rem 1.25rem; border-radius: 2rem; border: none; cursor: pointer; font-weight: 600; font-size: 0.875rem; font-family: inherit; transition: background var(--tr), color var(--tr); }
        .ivp-toggle button.on { background: var(--ink); color: #fff; }
        .ivp-toggle button:not(.on) { background: transparent; color: var(--ink-mid); }
        .ivp-save-pill { font-size: 0.75rem; font-weight: 700; color: var(--sage-dark); background: rgba(107,143,113,0.15); border: 1px solid rgba(107,143,113,0.3); border-radius: 1rem; padding: 0.2rem 0.6rem; white-space: nowrap; }

        /* ── Main price block ── */
        .ivp-main-block { padding: 1rem 0 5rem; }
        .ivp-card-wrap { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start; }
        @media (max-width: 700px) { .ivp-card-wrap { grid-template-columns: 1fr; } }

        .ivp-main-card { background: #fff; border: 2px solid var(--orange); border-radius: var(--radius-xl); padding: 2.25rem 2rem; position: relative; box-shadow: 0 0 0 4px rgba(232,101,10,0.08); }
        .ivp-launch-badge { position: absolute; top: -14px; left: 2rem; background: var(--orange); color: #fff; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.28rem 0.85rem; border-radius: 1rem; white-space: nowrap; }
        .ivp-card-name { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sage); margin-bottom: 0.5rem; }
        .ivp-price-row { display: flex; align-items: flex-end; gap: 0.35rem; margin-bottom: 0.2rem; }
        .ivp-price-big { font-size: clamp(3rem, 2.5rem + 1.5vw, 4rem); font-weight: 700; letter-spacing: -0.04em; color: var(--ink); line-height: 1; }
        .ivp-price-unit { font-size: 0.9rem; color: var(--ink-light); padding-bottom: 0.55rem; }
        .ivp-price-note { font-size: 0.8rem; color: var(--ink-light); margin-bottom: 0.35rem; }
        .ivp-price-full { font-size: 0.8rem; color: var(--ink-light); text-decoration: line-through; margin-bottom: 1.25rem; }
        .ivp-card-desc { font-size: 0.95rem; color: var(--ink-mid); line-height: 1.6; margin-bottom: 1.75rem; padding-bottom: 1.75rem; border-bottom: 1px solid var(--border); }
        .ivp-cta { display: block; width: 100%; padding: 0.875rem; border-radius: var(--radius); font-size: 0.95rem; font-weight: 700; text-align: center; cursor: pointer; border: none; font-family: inherit; transition: background var(--tr), box-shadow var(--tr); background: var(--orange); color: #fff; margin-bottom: 0.75rem; }
        .ivp-cta:hover { background: var(--orange-hover); box-shadow: 0 4px 16px rgba(232,101,10,0.32); }
        .ivp-cta-sub { font-size: 0.8rem; color: var(--ink-light); text-align: center; margin-bottom: 1.75rem; }

        /* Feature list inside main card */
        .ivp-feat-group { margin-bottom: 1.25rem; }
        .ivp-feat-group-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-light); margin-bottom: 0.6rem; }
        .ivp-feat-list { display: flex; flex-direction: column; gap: 0.45rem; }
        .ivp-feat-item { display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.875rem; color: var(--ink-mid); line-height: 1.45; }
        .ivp-feat-item svg { flex-shrink: 0; margin-top: 2px; }

        /* Group pricing card */
        .ivp-group-card { background: var(--parchment); border: 1.5px solid var(--border); border-radius: var(--radius-xl); padding: 2rem; }
        .ivp-group-card h3 { font-size: 1.1rem; font-weight: 700; color: var(--ink); letter-spacing: -0.01em; margin-bottom: 0.35rem; }
        .ivp-group-card > p { font-size: 0.9rem; color: var(--ink-mid); line-height: 1.6; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
        .ivp-group-rows { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
        .ivp-group-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .ivp-group-row-label { font-size: 0.9rem; font-weight: 600; color: var(--ink); }
        .ivp-group-row-price { text-align: right; }
        .ivp-group-row-amount { font-size: 1rem; font-weight: 700; color: var(--ink); }
        .ivp-group-row-note { font-size: 0.75rem; color: var(--ink-light); }
        .ivp-group-row-poa { font-size: 1rem; font-weight: 700; color: var(--sage-dark); }
        .ivp-group-saving { font-size: 0.75rem; color: var(--sage-dark); font-weight: 600; background: rgba(107,143,113,0.12); border-radius: 0.5rem; padding: 0.15rem 0.5rem; }
        .ivp-group-divider { height: 1px; background: var(--border); margin: 0.25rem 0; }
        .ivp-group-onboarding { font-size: 0.8rem; color: var(--ink-mid); line-height: 1.6; background: rgba(28,26,22,0.04); border-radius: var(--radius); padding: 0.875rem 1rem; margin-bottom: 1.5rem; }
        .ivp-group-onboarding strong { color: var(--ink); }
        .ivp-cta-outline { display: block; width: 100%; padding: 0.75rem; border-radius: var(--radius); font-size: 0.9rem; font-weight: 700; text-align: center; cursor: pointer; border: 1.5px solid var(--border); background: transparent; color: var(--ink); font-family: inherit; transition: border-color var(--tr), background var(--tr); }
        .ivp-cta-outline:hover { border-color: var(--orange); color: var(--orange); }

        /* ── Trust bar ── */
        .ivp-trust { padding: 2rem 0 3rem; border-top: 1px solid var(--border); }
        .ivp-trust-inner { display: flex; align-items: center; justify-content: center; gap: 2rem; flex-wrap: wrap; }
        .ivp-trust-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--ink-mid); }

        /* ── Competitor compare ── */
        .ivp-compare { padding: 5rem 0; background: var(--parchment); }
        .ivp-compare h2 { font-size: clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
        .ivp-compare-sub { font-size: 1rem; color: var(--ink-mid); max-width: 520px; margin-bottom: 2.5rem; line-height: 1.6; }
        .ivp-tbl-wrap { overflow-x: auto; }
        .ivp-tbl { width: 100%; border-collapse: collapse; font-size: 0.875rem; min-width: 560px; }
        .ivp-tbl th { padding: 0.875rem 0.75rem; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.04em; background: var(--parchment-2); color: var(--ink); border-bottom: 2px solid var(--border); text-align: center; }
        .ivp-tbl th:first-child { text-align: left; }
        .ivp-tbl td { padding: 0.8rem 0.75rem; border-bottom: 1px solid var(--border); color: var(--ink-mid); text-align: center; vertical-align: middle; }
        .ivp-tbl td:first-child { text-align: left; font-weight: 500; color: var(--ink); }
        .ivp-tbl tr:last-child td { border-bottom: none; }
        .ivp-tbl tr:hover td { background: rgba(245,240,232,0.5); }
        .ivp-tbl-iv { background: rgba(232,101,10,0.05) !important; font-weight: 700; color: var(--orange) !important; }
        .ivp-tbl-hd { background: rgba(232,101,10,0.07) !important; color: var(--orange) !important; }
        .ivp-tbl-note { font-size: 0.75rem; color: var(--ink-light); margin-top: 1rem; }

        /* ── FAQ ── */
        .ivp-faq { padding: 5rem 0; }
        .ivp-faq-inner { display: grid; grid-template-columns: 1fr 2fr; gap: 4rem; align-items: start; }
        @media (max-width: 760px) { .ivp-faq-inner { grid-template-columns: 1fr; gap: 2.5rem; } }
        .ivp-faq h2 { font-size: clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
        .ivp-faq-contact { font-size: 0.9rem; color: var(--ink-mid); line-height: 1.65; margin-top: 0.5rem; }
        .ivp-faq-contact a { color: var(--orange); }
        .ivp-faq-list { display: flex; flex-direction: column; }
        .ivp-faq-item { border-bottom: 1px solid var(--border); }
        .ivp-faq-q { width: 100%; background: none; border: none; text-align: left; padding: 1.25rem 0; font-size: 0.95rem; font-weight: 600; color: var(--ink); cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-family: inherit; }
        .ivp-faq-icon { flex-shrink: 0; transition: transform 200ms; }
        .ivp-faq-icon.open { transform: rotate(45deg); }
        .ivp-faq-a { font-size: 0.9rem; color: var(--ink-mid); line-height: 1.75; padding-bottom: 1.25rem; }

        /* ── CTA strip ── */
        .ivp-cta-strip { background: var(--sage-dark); padding: 5rem 0; text-align: center; }
        .ivp-cta-strip h2 { font-size: clamp(1.75rem, 1.4rem + 1.5vw, 2.75rem); font-weight: 700; color: #fff; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
        .ivp-cta-strip p { font-size: 1rem; color: rgba(255,255,255,0.75); max-width: 480px; margin: 0 auto 2rem; line-height: 1.65; }
        .ivp-strip-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .ivp-btn-white { background: #fff; color: var(--sage-dark); padding: 0.875rem 2rem; border-radius: var(--radius); font-weight: 700; font-size: 0.9rem; border: none; cursor: pointer; font-family: inherit; transition: box-shadow var(--tr); }
        .ivp-btn-white:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
        .ivp-btn-ghost { background: transparent; color: #fff; padding: 0.875rem 2rem; border-radius: var(--radius); font-weight: 600; font-size: 0.9rem; border: 1.5px solid rgba(255,255,255,0.35); cursor: pointer; font-family: inherit; transition: border-color var(--tr); }
        .ivp-btn-ghost:hover { border-color: #fff; }

        /* ── Footer ── */
        .ivp-footer { background: var(--parchment); border-top: 1px solid var(--border); padding: 2rem 0; }
        .ivp-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
        .ivp-footer-tagline { font-size: 0.875rem; color: var(--ink-light); margin-top: 0.5rem; }
        .ivp-footer-links { display: flex; align-items: center; gap: 1.25rem; font-size: 0.875rem; color: var(--ink-mid); flex-wrap: wrap; }
        .ivp-footer-links a:hover { color: var(--orange); }
      `}</style>

      <div className="ivp-root">

        {/* NAV */}
        <header className="ivp-nav">
          <div className="ivp-nav-inner">
            <Link href="/home" className="ivp-logo" aria-label="iValeter home">
              <svg width="32" height="32" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                <rect width="34" height="34" rx="7" fill="#E8650A"/>
                <path d="M10 9h4l5.5 11.5L25 9h4L20.5 26.5h-3L10 9z" fill="#F5F0E8"/>
                <circle cx="10" cy="9" r="2.5" fill="#F5F0E8" opacity="0.55"/>
              </svg>
              <span className="ivp-logo-text">iValeter</span>
            </Link>
            <nav className="ivp-nav-links" aria-label="Main navigation">
              <Link href="/home#iv-features">Features</Link>
              <Link href="/home#iv-portals">How It Works</Link>
              <Link href="/home#iv-compare">Why iValeter</Link>
              <Link href="/home/pricing" className="active">Pricing</Link>
              <Link href="/home#iv-contact" className="ivp-nav-cta">Request a Demo</Link>
              <Link href="/login" className="ivp-nav-signin">Sign In</Link>
            </nav>
          </div>
        </header>

        <main>

          {/* HERO */}
          <section className="ivp-hero">
            <div className="ivp-container">
              <span className="ivp-eyebrow">Pricing</span>
              <h1>One platform.<br/>One price.</h1>
              <p className="ivp-hero-sub">
                Every feature included. Unlimited valeters, unlimited jobs, unlimited users.
                No per-user charges. No add-ons. No surprises.
              </p>
              <div className="ivp-toggle-wrap">
                <div className="ivp-toggle">
                  <button className={billing === "monthly" ? "on" : ""} onClick={() => setBilling("monthly")}>Monthly</button>
                  <button className={billing === "annual" ? "on" : ""} onClick={() => setBilling("annual")}>Annual</button>
                </div>
                {isAnnual && <span className="ivp-save-pill">2 months free — save 15%</span>}
              </div>
            </div>
          </section>

          {/* MAIN PRICE + GROUP CARDS */}
          <section className="ivp-main-block">
            <div className="ivp-container">
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
                  <p className="ivp-price-full">
                    {isAnnual ? "Normally £127/site/mo on annual billing" : "Moves to £149/site/mo after 90 days"}
                  </p>
                  <p className="ivp-card-desc">
                    Everything iValeter does — real-time job tracking, geofenced timesheets,
                    Xero integration, payroll export, SMS broadcast, CSI scoring, before &amp; after photos,
                    delivery inspections, and full reporting. One site, one price, one platform.
                  </p>
                  <a href="/home#iv-contact" className="ivp-cta">Start free 30-day trial →</a>
                  <p className="ivp-cta-sub">No credit card · No lock-in · Full platform from day one</p>

                  {FEATURES.map((group) => (
                    <div className="ivp-feat-group" key={group.label}>
                      <p className="ivp-feat-group-label">{group.label}</p>
                      <ul className="ivp-feat-list">
                        {group.items.map((item) => (
                          <li className="ivp-feat-item" key={item}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
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
                  <p>
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
                              <div className="ivp-group-row-poa">Contact us →</div>
                            ) : (
                              <>
                                <div style={{display:"flex",alignItems:"center",gap:"0.5rem",justifyContent:"flex-end"}}>
                                  <span className="ivp-group-row-amount">
                                    £{isAnnual ? g.annual : g.monthly}/mo
                                  </span>
                                  {isAnnual && g.saving && (
                                    <span className="ivp-group-saving">Save £{g.saving}/yr</span>
                                  )}
                                </div>
                                <div className="ivp-group-row-note">
                                  {isAnnual
                                    ? `£${Math.round((g.annual ?? 0) * 10)}/yr per site`
                                    : `£${Math.round((g.monthly ?? 0) / (i === 0 ? 2 : i === 1 ? 4.5 : 8))}/site/mo avg`
                                  }
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
                    data import, Xero setup, team training and custom reporting. Quoted before you commit.
                    No surprises.
                  </div>

                  <a href="/home#iv-contact" className="ivp-cta-outline">Talk to us about your group →</a>
                  <p style={{fontSize:"0.8rem",color:"var(--ink-light)",marginTop:"0.75rem",textAlign:"center"}}>
                    We typically respond within one working day.
                  </p>
                </div>

              </div>

              {/* Trust bar */}
              <div className="ivp-trust">
                <div className="ivp-trust-inner">
                  {[
                    "30-day free trial — no card required",
                    "Cancel anytime — no lock-in",
                    "All prices exclude VAT",
                    "Setup & onboarding included",
                  ].map((t) => (
                    <span className="ivp-trust-item" key={t}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* COMPETITOR COMPARE */}
          <section className="ivp-compare">
            <div className="ivp-container">
              <span className="ivp-eyebrow">How we compare</span>
              <h2>Built for valeting.<br/>Priced fairly.</h2>
              <p className="ivp-compare-sub">
                Other platforms charge per user, hide key features behind add-ons,
                or weren&apos;t built for dealership valeting at all. iValeter is different.
              </p>
              <div className="ivp-tbl-wrap">
                <table className="ivp-tbl">
                  <thead>
                    <tr>
                      <th style={{textAlign:"left",width:"30%"}}>Feature</th>
                      <th className="ivp-tbl-hd">iValeter</th>
                      <th>Valetto Pro</th>
                      <th>vAutoStock</th>
                      <th>BigChange</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ["Price (per site)", <span className="ivp-tbl-iv">£99/mo launch<br/><span style={{fontWeight:400,fontSize:"0.8rem",color:"var(--orange)"}}>then £149/mo</span></span>, "£89/mo", "£249/mo", "£80–125/user"],
                      ["Per-user charges", <span style={{color:"var(--sage)",fontWeight:700}}>Never</span>, "None", "None", "Yes — expensive fast"],
                      ["Built for dealership valet", "✓", "✓", "✓", "✗"],
                      ["Valeter mobile app", "✓", "✓", "✗", "✓"],
                      ["Xero integration", "✓", "✗", "✗", "Add-on cost"],
                      ["Geofenced timesheets", "✓", "✓", "✗", "✓"],
                      ["Payroll export (UK bank)", "✓", "✗", "✗", "✗"],
                      ["SMS broadcast", "✓", "✗", "✗", "Add-on cost"],
                      ["CSI quality scoring", "✓", "✓", "✗", "✗"],
                      ["Delivery inspections", "✓", "✗", "✗", "✗"],
                      ["Bank details audit trail", "✓", "✗", "✗", "✗"],
                      ["Free trial (no card)", "30 days", "30 days", "✗", "✗"],
                      ["Lock-in contract", "None", "None", "1 month", "12 months"],
                    ] as [React.ReactNode, React.ReactNode, React.ReactNode, React.ReactNode, React.ReactNode][]).map(([feature, ...vals]) => (
                      <tr key={String(feature)}>
                        <td>{feature}</td>
                        {vals.map((v, i) => (
                          <td key={i} className={i === 0 ? "ivp-tbl-iv" : ""}>
                            {v === "✓"
                              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              : v === "✗"
                              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D8D0C4" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              : v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="ivp-tbl-note">Competitor pricing sourced July 2026. Valetto: valetto.co.uk/pricing · vAutoStock: vautostock.co.uk · BigChange: bigchange.com/pricing.</p>
            </div>
          </section>

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
                          className={`ivp-faq-icon${openFaq === i ? " open" : ""}`}
                          width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2"
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

          {/* CTA STRIP */}
          <section className="ivp-cta-strip">
            <div className="ivp-container">
              <h2>Start free for 30 days</h2>
              <p>No credit card. No lock-in. The full platform from day one — every feature, unlimited users.</p>
              <div className="ivp-strip-actions">
                <a href="/home#iv-contact" className="ivp-btn-white">Request a Demo →</a>
                <Link href="/login" className="ivp-btn-ghost">Sign In</Link>
              </div>
            </div>
          </section>

        </main>

        {/* FOOTER */}
        <footer className="ivp-footer">
          <div className="ivp-container ivp-footer-inner">
            <div>
              <Link href="/home" className="ivp-logo" aria-label="iValeter">
                <svg width="26" height="26" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                  <rect width="34" height="34" rx="7" fill="#E8650A"/>
                  <path d="M10 9h4l5.5 11.5L25 9h4L20.5 26.5h-3L10 9z" fill="#F5F0E8"/>
                </svg>
                <span className="ivp-logo-text">iValeter</span>
              </Link>
              <p className="ivp-footer-tagline">The smarter way to manage your valeting operation.</p>
            </div>
            <div className="ivp-footer-links">
              <a href="mailto:hello@ivaleter.co.uk">hello@ivaleter.co.uk</a>
              <span>© 2026 iValeter Ltd</span>
              <span>ICO Reg: ZC191529</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
