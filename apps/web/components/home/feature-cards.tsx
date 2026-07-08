"use client";

import { useState, useEffect, useCallback } from "react";

interface Feature {
  title: string;
  tagline: string;
  description: string;
  benefits: string[];
  screenshot: string;
  screenshotAlt: string;
  icon: string; // SVG path string
  color: "orange" | "sage";
  screenshotDevice?: "mobile" | "desktop";
}

const FEATURES: Feature[] = [
  {
    title: "Real-Time Job Tracking",
    tagline: "Live bay visibility — no phone calls needed",
    description:
      "Every job is tracked from booking to completion. Sales staff see exactly what's in the bay without leaving their desk. Managers get a live ops board showing priority, status, and who is working on what.",
    benefits: [
      "Live status board: Pending → Assigned → In Progress → QC → Complete",
      "Valeter mobile portal — tap to start, pause, complete jobs",
      "Priority flag and 'ready by' time on every job",
      "Do Not Clean flag shows full-screen red alert on valeter device",
    ],
    screenshot: "/features/job_tracking.png",
    screenshotAlt: "Real-time ops job board showing live vehicle status cards",
    icon: '<circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>',
    color: "orange",
    screenshotDevice: "desktop",
  },
  {
    title: "Geofenced Timesheets",
    tagline: "Clock-in from the phone — automatically verified",
    description:
      "Valeters clock in on their mobile. The system checks their GPS location against the site boundary and flags anyone outside the zone — no hardware, no fobs, no paper.",
    benefits: [
      "Soft geofence — flags if outside zone, never blocks",
      "Late arrival alerts if not clocked in by 8:15am",
      "Weekly timesheets auto-generated from clock events",
      "Timesheet sent to client for approval — no pay figures shown",
    ],
    screenshot: "/features/valeter_timesheet.png",
    screenshotAlt: "Valeter mobile timesheet showing clock-in times and week summary",
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    color: "sage",
    screenshotDevice: "mobile",
  },
  {
    title: "Vehicle Parking Pin",
    tagline: "Know exactly where every finished car is parked",
    description:
      "When a valeter completes and parks a vehicle, they drop a GPS pin on their app. The pin is saved to the job and shared as a live Google Maps link — no more searching the lot.",
    benefits: [
      "GPS pin saved on job completion",
      "Google Maps link visible to managers and sales",
      "Location history retained for the full job record",
      "Works indoors with last-known position fallback",
    ],
    screenshot: "/features/valeter_jobs.png",
    screenshotAlt: "Valeter mobile app showing job list with parking pin option",
    icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    color: "orange",
    screenshotDevice: "mobile",
  },
  {
    title: "CSI Quality Scoring",
    tagline: "Link prep quality directly to CSI outcomes",
    description:
      "Score every completed job 1–5 stars from the dealer portal. Track quality per valeter, per site, per week. The only platform that connects prep standard directly to customer satisfaction scores.",
    benefits: [
      "Per-job star rating from dealer or manager",
      "Quality trend by valeter, site and period",
      "Low-scoring jobs flagged for follow-up",
      "CSI linkage report for head office review",
    ],
    screenshot: "/features/csi_bookings.png",
    screenshotAlt: "Dealer bookings page showing CSI quality scores on completed jobs",
    icon: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    color: "sage",
    screenshotDevice: "desktop",
  },
  {
    title: "Before & After Photos",
    tagline: "Visual proof on every job — protect against claims",
    description:
      "Valeters photograph damage before touching a vehicle. After photos are attached to the completed job and visible in the dealer portal — showcasing the result and providing an audit trail.",
    benefits: [
      "Before photos capture pre-existing damage on arrival",
      "After photos show finished result to dealer",
      "All photos timestamped and stored against job",
      "Full-screen view in dealer portal — no download needed",
    ],
    screenshot: "/features/valeter_jobs.png",
    screenshotAlt: "Valeter mobile app showing photo capture on a job",
    icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M3 16c2-2 4-3 6-3s4 1 6 3"/>',
    color: "orange",
    screenshotDevice: "mobile",
  },
  {
    title: "Days in Prep Reporting",
    tagline: "Prove turnaround time with hard data",
    description:
      "Track exactly how long each vehicle spends from booking to completion — by sales vs service, by site, by period. Show your head of business how quickly your team turns cars around.",
    benefits: [
      "Average days in prep by department and site",
      "Outlier vehicles flagged — see what's sitting too long",
      "Weekly and monthly trend view",
      "Export-ready for board reporting",
    ],
    screenshot: "/features/reports.png",
    screenshotAlt: "Reports page showing days in prep analytics and vehicle turnaround charts",
    icon: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    color: "sage",
    screenshotDevice: "desktop",
  },
  {
    title: "Spend Gatekeeper",
    tagline: "Budget control at the point of booking",
    description:
      "Set a cost limit at booking time. The system alerts the valeter and manager if spend approaches the cap — finance directors get full visibility across every site with no month-end surprises.",
    benefits: [
      "Per-job spend cap set at booking",
      "Alert at 80% and 100% of budget",
      "Manager override with reason logged",
      "Full spend dashboard for finance directors",
    ],
    screenshot: "/features/billing.png",
    screenshotAlt: "Billing page showing spend overview with budget tracking per site",
    icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    color: "orange",
    screenshotDevice: "desktop",
  },
  {
    title: "Accident & Damage Records",
    tagline: "Full audit trail — recoveries tracked to the penny",
    description:
      "Log vehicle accidents against the valeter's employment record. Set a weekly deduction and track the full recovery — everything is auditable from the admin panel, with history and sign-off.",
    benefits: [
      "Incident logged with photos and description",
      "Weekly deduction amount set by manager",
      "Running recovery balance tracked per valeter",
      "Full history visible to ops and finance",
    ],
    screenshot: "/features/compliance.png",
    screenshotAlt: "Compliance page showing accident records and recovery tracking",
    icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M9 10l2 2 4-4"/>',
    color: "sage",
    screenshotDevice: "desktop",
  },
  {
    title: "Payroll",
    tagline: "From timesheet to bank transfer — automated",
    description:
      "Timesheet data flows into payroll automatically. Runs are generated weekly with a full banking export in NatWest Bankline format. Valeter pay codes mapped to your chart of accounts.",
    benefits: [
      "Weekly payroll run from approved timesheets",
      "Banking export compatible with UK bank bulk payments",
      "Accounting software push on payroll approval",
      "Valeters view pay history in their mobile app",
    ],
    screenshot: "/features/payroll.png",
    screenshotAlt: "Payroll page showing weekly pay run with valeter breakdown",
    icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="12" cy="15" r="2"/>',
    color: "orange",
    screenshotDevice: "desktop",
  },
  {
    title: "Review Feedback",
    tagline: "Pulse your team and share wins instantly",
    description:
      "Send weekly pulse messages to your valeting team — they reply in one tap from their app. Share 5-star reviews and CSI wins directly with your Head of Business. Keeps the team motivated and visible.",
    benefits: [
      "Weekly pulse broadcast to all active valeters",
      "One-tap reply — no app switching needed",
      "Manager dashboard shows response rate and sentiment",
      "Share standout reviews with leadership in one click",
    ],
    screenshot: "/features/valeter_messages.png",
    screenshotAlt: "Valeter messages screen showing broadcast pulse and reply interface",
    icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    color: "sage",
    screenshotDevice: "mobile",
  },
  {
    title: "New & Used Car Delivery Inspections",
    tagline: "Digital inspection checklists — no more paper PDFs",
    description:
      "Configurable inspection templates for new and used vehicle delivery. Valeters complete them on their app, photos attached, signed off digitally. Inspection history searchable by reg plate.",
    benefits: [
      "Drag-and-drop template builder in admin settings",
      "Photo evidence required per checklist item",
      "Digital sign-off — customer or manager",
      "Full inspection history by vehicle reg",
    ],
    screenshot: "/features/inspection_settings.png",
    screenshotAlt: "Inspection settings page showing configurable checklist templates",
    icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    color: "orange",
    screenshotDevice: "desktop",
  },
];

export function FeatureCards() {
  const [open, setOpen] = useState<Feature | null>(null);

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <>
      <style>{`
        /* ── Feature Cards ─────────────────────────── */
        .iv-fc-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 900px) {
          .iv-fc-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .iv-fc-grid { grid-template-columns: 1fr; }
        }

        .iv-fc-card {
          background: var(--parchment);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          cursor: pointer;
          transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
          position: relative;
          text-align: left;
        }
        .iv-fc-card:hover {
          box-shadow: 0 8px 28px rgba(28,26,22,0.13);
          transform: translateY(-3px);
          border-color: var(--orange);
        }
        .iv-fc-card:focus-visible {
          outline: 2px solid var(--orange);
          outline-offset: 2px;
        }
        .iv-fc-card--featured {
          grid-column: span 1;
        }
        @media (min-width: 901px) {
          .iv-fc-card--featured {
            grid-column: span 2;
            flex-direction: row;
            align-items: flex-start;
            gap: 1.5rem;
          }
          .iv-fc-card--featured .iv-fc-icon-wrap {
            flex-shrink: 0;
            margin-top: 2px;
          }
        }

        .iv-fc-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .iv-fc-icon-wrap.iv-orange { background: rgba(232,101,10,0.10); color: #E8650A; }
        .iv-fc-icon-wrap.iv-sage   { background: rgba(107,143,113,0.13); color: #4A6B50; }

        .iv-fc-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: -0.01em;
          margin: 0;
        }
        .iv-fc-tagline {
          font-size: 0.875rem;
          color: var(--ink-mid);
          line-height: 1.6;
          margin: 0;
          flex: 1;
        }
        .iv-fc-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--orange);
          margin-top: auto;
          padding-top: 0.25rem;
        }
        .iv-fc-cta svg { transition: transform 0.18s ease; }
        .iv-fc-card:hover .iv-fc-cta svg { transform: translateX(3px); }

        /* ── Modal ─────────────────────────── */
        .iv-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(28,26,22,0.65);
          backdrop-filter: blur(4px);
          z-index: 9000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: iv-fade-in 0.2s ease;
        }
        @keyframes iv-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .iv-modal {
          background: var(--parchment, #EDE7D9);
          border-radius: 16px;
          box-shadow: 0 24px 80px rgba(28,26,22,0.28);
          width: 100%;
          max-width: 820px;
          max-height: 90vh;
          overflow-y: auto;
          animation: iv-modal-in 0.22s ease;
          position: relative;
        }
        @keyframes iv-modal-in {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .iv-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.75rem 1.75rem 0;
        }
        .iv-modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .iv-modal-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--ink, #1C1A16);
          letter-spacing: -0.02em;
          margin: 0;
          line-height: 1.2;
        }
        .iv-modal-tagline {
          font-size: 0.9375rem;
          color: var(--ink-mid, #4A4640);
          margin: 0.25rem 0 0;
        }
        .iv-modal-close {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--border, #D8D0C4);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-light, #8A8078);
          transition: background 0.15s, color 0.15s;
        }
        .iv-modal-close:hover {
          background: var(--parchment-2, #E5DDD0);
          color: var(--ink, #1C1A16);
        }
        .iv-modal-body {
          padding: 1.5rem 1.75rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        @media (min-width: 660px) {
          .iv-modal-body { flex-direction: row; align-items: flex-start; }
        }
        .iv-modal-copy {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .iv-modal-desc {
          font-size: 0.9375rem;
          color: var(--ink-mid, #4A4640);
          line-height: 1.7;
          margin: 0;
        }
        .iv-modal-benefits-title {
          font-size: 0.8125rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--ink-light, #8A8078);
          margin: 0;
        }
        .iv-modal-benefits {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .iv-modal-benefits li {
          font-size: 0.9rem;
          color: var(--ink-mid, #4A4640);
          padding-left: 1.25rem;
          position: relative;
          line-height: 1.55;
        }
        .iv-modal-benefits li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #6B8F71;
        }
        .iv-modal-screenshot-wrap {
          flex-shrink: 0;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid var(--border, #D8D0C4);
          background: #1C1A16;
          box-shadow: 0 4px 20px rgba(28,26,22,0.14);
        }
        .iv-modal-screenshot-wrap.desktop {
          width: 100%;
          max-width: 380px;
        }
        .iv-modal-screenshot-wrap.mobile {
          width: 180px;
          align-self: flex-start;
        }
        @media (max-width: 659px) {
          .iv-modal-screenshot-wrap.desktop { max-width: 100%; }
          .iv-modal-screenshot-wrap.mobile { width: 140px; }
        }
        .iv-modal-screenshot {
          display: block;
          width: 100%;
          height: auto;
        }
        .iv-modal-screenshot-label {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.4);
          text-align: center;
          padding: 0.4rem 0.5rem;
          font-family: monospace;
        }
      `}</style>

      {/* Grid */}
      <div className="iv-fc-grid">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`iv-fc-card${i < 2 ? " iv-fc-card--featured" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => setOpen(f)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(f); } }}
            aria-label={`Learn more about ${f.title}`}
          >
            <div className={`iv-fc-icon-wrap iv-${f.color}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" dangerouslySetInnerHTML={{ __html: f.icon }} />
            </div>
            {i >= 2 ? (
              <>
                <p className="iv-fc-title">{f.title}</p>
                <p className="iv-fc-tagline">{f.tagline}</p>
              </>
            ) : (
              <div>
                <p className="iv-fc-title">{f.title}</p>
                <p className="iv-fc-tagline">{f.tagline}</p>
              </div>
            )}
            <span className="iv-fc-cta">
              See it live
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </span>
          </div>
        ))}
      </div>

      {/* Modal */}
      {open && (
        <div
          className="iv-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="iv-modal">
            <div className="iv-modal-header">
              <div className="iv-modal-title-wrap">
                <div className={`iv-fc-icon-wrap iv-${open.color}`} style={{ width: 48, height: 48 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" dangerouslySetInnerHTML={{ __html: open.icon }} />
                </div>
                <div>
                  <h2 className="iv-modal-title">{open.title}</h2>
                  <p className="iv-modal-tagline">{open.tagline}</p>
                </div>
              </div>
              <button className="iv-modal-close" onClick={close} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="iv-modal-body">
              <div className="iv-modal-copy">
                <p className="iv-modal-desc">{open.description}</p>
                <p className="iv-modal-benefits-title">Key benefits</p>
                <ul className="iv-modal-benefits">
                  {open.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className={`iv-modal-screenshot-wrap ${open.screenshotDevice ?? "desktop"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={open.screenshot}
                  alt={open.screenshotAlt}
                  className="iv-modal-screenshot"
                  loading="lazy"
                />
                <div className="iv-modal-screenshot-label">
                  {open.screenshotDevice === "mobile" ? "📱 Mobile app" : "🖥 Platform screenshot"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
