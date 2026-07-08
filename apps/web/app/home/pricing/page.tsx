import Link from "next/link";

export const metadata = {
  title: "Pricing — iValeter",
  description:
    "Simple, transparent pricing for every size of valeting operation. No hidden fees, no per-user charges. Cancel anytime.",
};

export default function PricingPage() {
  return (
    <>
      <style>{`
        .iv-root {
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #F5F0E8;
          color: #1C1A16;
          font-size: 1rem;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
        }
        .iv-root *, .iv-root *::before, .iv-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .iv-root a { color: inherit; text-decoration: none; }
        .iv-root ul { list-style: none; }

        /* Tokens */
        .iv-root {
          --cream:        #F5F0E8;
          --parchment:    #EDE7D9;
          --parchment-2:  #E5DDD0;
          --ink:          #1C1A16;
          --ink-mid:      #4A4640;
          --ink-light:    #8A8078;
          --border:       #D8D0C4;
          --orange:       #E8650A;
          --orange-hover: #C9530A;
          --sage:         #6B8F71;
          --sage-dark:    #4A6B50;
          --sage-light:   #A8C5AC;
          --max-w:        1160px;
          --radius:       0.375rem;
          --radius-lg:    0.75rem;
          --radius-xl:    1rem;
          --shadow:       0 2px 8px rgba(28,26,22,0.09), 0 1px 3px rgba(28,26,22,0.05);
          --shadow-md:    0 4px 16px rgba(28,26,22,0.10), 0 2px 6px rgba(28,26,22,0.06);
          --transition:   160ms cubic-bezier(0.16,1,0.3,1);
        }

        /* Nav */
        .iv-nav { position: sticky; top: 0; z-index: 100; background: var(--cream); border-bottom: 1px solid var(--border); }
        .iv-nav-inner { max-width: var(--max-w); margin: 0 auto; padding: 0 1.5rem; height: 60px; display: flex; align-items: center; gap: 2rem; }
        .iv-logo { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
        .iv-logo-text { font-size: 1.125rem; font-weight: 700; color: var(--ink); letter-spacing: -0.01em; }
        .iv-nav-links { display: flex; align-items: center; gap: 1.5rem; margin-left: auto; }
        .iv-nav-links a { font-size: 0.875rem; font-weight: 500; color: var(--ink-mid); transition: color var(--transition); }
        .iv-nav-links a:hover { color: var(--ink); }
        .iv-nav-links a.iv-active { color: var(--orange); font-weight: 600; }
        .iv-nav-signin { background: transparent; color: var(--ink-mid) !important; border: 1.5px solid var(--border); padding: 0.5rem 1.1rem; border-radius: var(--radius); font-weight: 600 !important; font-size: 0.875rem; }
        .iv-nav-cta { background: var(--orange) !important; color: #fff !important; padding: 0.5rem 1.1rem; border-radius: var(--radius); font-weight: 600 !important; }
        .iv-nav-mobile-toggle { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 0.5rem; margin-left: auto; }
        .iv-nav-mobile-toggle span { display: block; width: 22px; height: 2px; background: var(--ink); border-radius: 2px; }
        .iv-nav-mobile-menu { display: none; flex-direction: column; gap: 0; background: var(--cream); border-top: 1px solid var(--border); padding: 1rem 1.5rem; }
        .iv-nav-mobile-menu a { padding: 0.75rem 0; font-size: 1rem; font-weight: 500; color: var(--ink-mid); border-bottom: 1px solid var(--border); }
        .iv-mobile-cta { margin-top: 1rem; border-bottom: none !important; background: var(--orange); color: #fff !important; text-align: center; padding: 0.75rem !important; border-radius: var(--radius); font-weight: 600; }
        .iv-nav-mobile-menu.iv-open { display: flex; }

        /* Layout */
        .iv-container { max-width: var(--max-w); margin: 0 auto; padding: 0 1.5rem; }
        .iv-eyebrow { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sage); margin-bottom: 0.75rem; display: block; }

        /* Page header */
        .iv-pricing-hero { padding: 4rem 0 3rem; text-align: center; }
        .iv-pricing-hero h1 { font-size: clamp(2rem, 1.5rem + 2vw, 3.25rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; color: var(--ink); margin-bottom: 1.25rem; }
        .iv-pricing-hero p { font-size: 1.125rem; color: var(--ink-mid); max-width: 560px; margin: 0 auto 2rem; line-height: 1.65; }
        .iv-billing-toggle { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--parchment); border: 1px solid var(--border); border-radius: 2rem; padding: 0.25rem; font-size: 0.875rem; }
        .iv-billing-toggle button { padding: 0.4rem 1.1rem; border-radius: 2rem; border: none; cursor: pointer; font-weight: 600; font-size: 0.875rem; transition: background var(--transition), color var(--transition); }
        .iv-billing-toggle button.iv-active { background: var(--ink); color: #fff; }
        .iv-billing-toggle button:not(.iv-active) { background: transparent; color: var(--ink-mid); }
        .iv-save-badge { font-size: 0.7rem; font-weight: 700; color: var(--sage-dark); background: rgba(107,143,113,0.15); border: 1px solid rgba(107,143,113,0.3); border-radius: 1rem; padding: 0.15rem 0.5rem; margin-left: 0.25rem; }

        /* Pricing cards */
        .iv-plans { display: grid; grid-template-columns: repeat(3,1fr); gap: 1.5rem; padding: 0 0 5rem; align-items: start; }
        .iv-plan { background: #fff; border: 1.5px solid var(--border); border-radius: var(--radius-xl); padding: 2rem; position: relative; transition: box-shadow var(--transition), border-color var(--transition); }
        .iv-plan:hover { box-shadow: var(--shadow-md); }
        .iv-plan.iv-featured { border-color: var(--orange); box-shadow: 0 0 0 3px rgba(232,101,10,0.10), var(--shadow-md); }
        .iv-plan-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: var(--orange); color: #fff; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.25rem 0.75rem; border-radius: 1rem; white-space: nowrap; }
        .iv-plan-name { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sage); margin-bottom: 0.5rem; }
        .iv-plan-price { display: flex; align-items: flex-end; gap: 0.25rem; margin-bottom: 0.25rem; }
        .iv-plan-amount { font-size: clamp(2.25rem, 2rem + 1vw, 3rem); font-weight: 700; letter-spacing: -0.03em; color: var(--ink); line-height: 1; }
        .iv-plan-unit { font-size: 0.875rem; color: var(--ink-light); padding-bottom: 0.4rem; }
        .iv-plan-billed { font-size: 0.8rem; color: var(--ink-light); margin-bottom: 1.25rem; }
        .iv-plan-tagline { font-size: 0.9rem; color: var(--ink-mid); line-height: 1.55; margin-bottom: 1.75rem; padding-bottom: 1.75rem; border-bottom: 1px solid var(--border); }
        .iv-plan-cta { display: block; width: 100%; padding: 0.75rem; border-radius: var(--radius); font-size: 0.9rem; font-weight: 600; text-align: center; border: none; cursor: pointer; transition: background var(--transition), box-shadow var(--transition); margin-bottom: 1.75rem; }
        .iv-plan-cta-primary { background: var(--orange); color: #fff; }
        .iv-plan-cta-primary:hover { background: var(--orange-hover); box-shadow: 0 4px 14px rgba(232,101,10,0.3); }
        .iv-plan-cta-outline { background: transparent; color: var(--ink); border: 1.5px solid var(--border); }
        .iv-plan-cta-outline:hover { border-color: var(--ink-mid); background: var(--parchment); }
        .iv-plan-features { display: flex; flex-direction: column; gap: 0.65rem; }
        .iv-plan-feature { display: flex; align-items: flex-start; gap: 0.625rem; font-size: 0.875rem; color: var(--ink-mid); }
        .iv-plan-feature svg { flex-shrink: 0; margin-top: 2px; }
        .iv-plan-feature.iv-f-strong { color: var(--ink); font-weight: 500; }
        .iv-plan-section-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-light); margin-top: 1.25rem; margin-bottom: 0.5rem; }

        /* Compare table */
        .iv-compare-section { padding: 4rem 0 5rem; }
        .iv-compare-section h2 { font-size: clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
        .iv-compare-section p { font-size: 1rem; color: var(--ink-mid); max-width: 520px; margin-bottom: 2.5rem; line-height: 1.6; }
        .iv-compare-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .iv-compare-table th { text-align: center; padding: 1rem 0.75rem; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.04em; background: var(--parchment); color: var(--ink); border-bottom: 2px solid var(--border); }
        .iv-compare-table th:first-child { text-align: left; }
        .iv-compare-table td { padding: 0.875rem 0.75rem; border-bottom: 1px solid var(--border); color: var(--ink-mid); vertical-align: middle; }
        .iv-compare-table td:first-child { font-weight: 500; color: var(--ink); }
        .iv-compare-table td:not(:first-child) { text-align: center; }
        .iv-compare-table tr:last-child td { border-bottom: none; }
        .iv-compare-table tr:hover td { background: rgba(245,240,232,0.5); }
        .iv-compare-ivaleter { background: rgba(232,101,10,0.05) !important; font-weight: 700; color: var(--orange) !important; }
        .iv-check { color: var(--sage); }
        .iv-cross { color: var(--ink-light); opacity: 0.4; }
        .iv-compare-thead-iv { background: rgba(232,101,10,0.08) !important; color: var(--orange) !important; }

        /* FAQ */
        .iv-faq-section { padding: 4rem 0 5rem; background: var(--parchment); }
        .iv-faq-inner { display: grid; grid-template-columns: 1fr 2fr; gap: 4rem; align-items: start; }
        .iv-faq-section h2 { font-size: clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
        .iv-faq-section p { font-size: 1rem; color: var(--ink-mid); line-height: 1.6; }
        .iv-faq-list { display: flex; flex-direction: column; gap: 0; }
        .iv-faq-item { border-bottom: 1px solid var(--border); }
        .iv-faq-q { width: 100%; background: none; border: none; text-align: left; padding: 1.25rem 0; font-size: 0.95rem; font-weight: 600; color: var(--ink); cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-family: 'DM Sans', system-ui, sans-serif; }
        .iv-faq-q svg { flex-shrink: 0; transition: transform 200ms; }
        .iv-faq-q.iv-open svg { transform: rotate(45deg); }
        .iv-faq-a { font-size: 0.9rem; color: var(--ink-mid); line-height: 1.7; padding-bottom: 1.25rem; display: none; }
        .iv-faq-a.iv-open { display: block; }

        /* CTA strip */
        .iv-cta-strip { background: var(--sage-dark); padding: 4rem 0; text-align: center; }
        .iv-cta-strip h2 { font-size: clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem); font-weight: 700; color: #fff; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
        .iv-cta-strip p { font-size: 1rem; color: rgba(255,255,255,0.75); max-width: 500px; margin: 0 auto 2rem; line-height: 1.6; }
        .iv-cta-strip-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .iv-btn-white { background: #fff; color: var(--sage-dark); padding: 0.75rem 1.75rem; border-radius: var(--radius); font-weight: 600; font-size: 0.9rem; border: none; cursor: pointer; transition: box-shadow var(--transition); }
        .iv-btn-white:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
        .iv-btn-ghost-white { background: transparent; color: #fff; padding: 0.75rem 1.75rem; border-radius: var(--radius); font-weight: 600; font-size: 0.9rem; border: 1.5px solid rgba(255,255,255,0.35); cursor: pointer; transition: border-color var(--transition); }
        .iv-btn-ghost-white:hover { border-color: #fff; }

        /* Footer */
        .iv-footer { background: var(--parchment); border-top: 1px solid var(--border); padding: 2rem 0; }
        .iv-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
        .iv-footer-tagline { font-size: 0.875rem; color: var(--ink-light); margin-top: 0.5rem; }
        .iv-footer-links { display: flex; align-items: center; gap: 1.25rem; font-size: 0.875rem; color: var(--ink-mid); flex-wrap: wrap; }
        .iv-footer-links a:hover { color: var(--orange); }

        /* Responsive */
        @media (max-width: 900px) {
          .iv-plans { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }
          .iv-faq-inner { grid-template-columns: 1fr; gap: 2rem; }
          .iv-compare-table { font-size: 0.8rem; }
        }
        @media (max-width: 640px) {
          .iv-nav-links { display: none; }
          .iv-nav-mobile-toggle { display: flex; }
          .iv-pricing-hero { padding: 2.5rem 0 2rem; }
        }
      `}</style>

      <div className="iv-root">

        {/* NAV */}
        <header className="iv-nav">
          <div className="iv-nav-inner">
            <Link href="/home" className="iv-logo" aria-label="iValeter home">
              <svg width="32" height="32" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                <rect width="34" height="34" rx="7" fill="#E8650A"/>
                <path d="M10 9h4l5.5 11.5L25 9h4L20.5 26.5h-3L10 9z" fill="#F5F0E8"/>
                <circle cx="10" cy="9" r="2.5" fill="#F5F0E8" opacity="0.55"/>
              </svg>
              <span className="iv-logo-text">iValeter</span>
            </Link>
            <nav className="iv-nav-links" aria-label="Main navigation">
              <Link href="/home#iv-features">Features</Link>
              <Link href="/home#iv-portals">How It Works</Link>
              <Link href="/home#iv-compare">Why iValeter</Link>
              <Link href="/home/pricing" className="iv-active">Pricing</Link>
              <Link href="/login" className="iv-nav-signin">Sign In</Link>
              <Link href="/home#iv-contact" className="iv-nav-cta">Request a Demo</Link>
            </nav>
            <button className="iv-nav-mobile-toggle" id="iv-mobileToggle" aria-label="Open menu">
              <span></span><span></span><span></span>
            </button>
          </div>
          <div className="iv-nav-mobile-menu" id="iv-mobileMenu">
            <Link href="/home#iv-features">Features</Link>
            <Link href="/home#iv-portals">How It Works</Link>
            <Link href="/home#iv-compare">Why iValeter</Link>
            <Link href="/home/pricing">Pricing</Link>
            <Link href="/login" className="iv-nav-signin" style={{borderBottom:"none",marginBottom:"0.5rem"}}>Sign In</Link>
            <Link href="/home#iv-contact" className="iv-mobile-cta">Request a Demo</Link>
          </div>
        </header>

        <main>

          {/* HERO */}
          <section className="iv-pricing-hero">
            <div className="iv-container">
              <span className="iv-eyebrow">Pricing</span>
              <h1>Transparent pricing.<br/>No surprises.</h1>
              <p>Per site, not per user. Unlimited valeters, unlimited jobs. Everything included — no add-ons, no hidden fees.</p>
              <div className="iv-billing-toggle" id="iv-billingToggle">
                <button className="iv-active" data-period="monthly">Monthly</button>
                <button data-period="annual">Annual <span className="iv-save-badge">Save 15%</span></button>
              </div>
            </div>
          </section>

          {/* PLANS */}
          <section style={{padding:"0 0 5rem"}}>
            <div className="iv-container">
              <div className="iv-plans">

                {/* Starter */}
                <div className="iv-plan">
                  <p className="iv-plan-name">Starter</p>
                  <div className="iv-plan-price">
                    <span className="iv-plan-amount iv-monthly-price">£79</span>
                    <span className="iv-plan-amount iv-annual-price" style={{display:"none"}}>£67</span>
                    <span className="iv-plan-unit">/site/mo</span>
                  </div>
                  <p className="iv-plan-billed iv-monthly-billed">Billed monthly · excl. VAT</p>
                  <p className="iv-plan-billed iv-annual-billed" style={{display:"none"}}>Billed annually · excl. VAT</p>
                  <p className="iv-plan-tagline">Everything you need to run a single valeting site — real-time jobs, timesheets, and the customer booking portal.</p>
                  <a href="/home#iv-contact" className="iv-plan-cta iv-plan-cta-outline">Start free trial →</a>
                  <p className="iv-plan-section-label">Core platform</p>
                  <ul className="iv-plan-features">
                    {[
                      ["Unlimited valeters on site","strong"],
                      ["Unlimited jobs & bookings","strong"],
                      ["Real-time job tracking board",""],
                      ["Valeter mobile app (iOS & Android)",""],
                      ["Customer booking portal",""],
                      ["Geofenced timesheets",""],
                      ["Recurring bookings",""],
                      ["Photo capture & inspection forms",""],
                      ["Vehicle reg lookup (DVLA)",""],
                      ["CSI quality scoring",""],
                      ["Receipt & expense submission",""],
                    ].map(([text, cls]) => (
                      <li key={text} className={`iv-plan-feature ${cls === "strong" ? "iv-f-strong" : ""}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2.5" className="iv-check"><polyline points="20 6 9 17 4 12"/></svg>
                        {text}
                      </li>
                    ))}
                    <p className="iv-plan-section-label">Operations</p>
                    {[
                      ["Ops platform (account manager view)",""],
                      ["Timesheet approval workflow",""],
                      ["Holiday & time off requests",""],
                      ["Payroll export (NatWest Bankline)",""],
                      ["Bank details change (verbal confirm)",""],
                    ].map(([text]) => (
                      <li key={text} className="iv-plan-feature">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2.5" className="iv-check"><polyline points="20 6 9 17 4 12"/></svg>
                        {text}
                      </li>
                    ))}
                    <p className="iv-plan-section-label">Not included</p>
                    {[
                      "Xero accounting integration",
                      "SMS broadcast",
                      "Advanced analytics & KPI reports",
                      "TOS weekly KPI export",
                    ].map((text) => (
                      <li key={text} className="iv-plan-feature" style={{opacity:0.45}}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8A8078" strokeWidth="2.5" className="iv-cross"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Professional — featured */}
                <div className="iv-plan iv-featured">
                  <div className="iv-plan-badge">Most popular</div>
                  <p className="iv-plan-name">Professional</p>
                  <div className="iv-plan-price">
                    <span className="iv-plan-amount iv-monthly-price">£149</span>
                    <span className="iv-plan-amount iv-annual-price" style={{display:"none"}}>£127</span>
                    <span className="iv-plan-unit">/site/mo</span>
                  </div>
                  <p className="iv-plan-billed iv-monthly-billed">Billed monthly · excl. VAT</p>
                  <p className="iv-plan-billed iv-annual-billed" style={{display:"none"}}>Billed annually · excl. VAT</p>
                  <p className="iv-plan-tagline">The full platform — Xero sync, SMS broadcast, advanced reporting, and weekly KPI export for your ops team.</p>
                  <a href="/home#iv-contact" className="iv-plan-cta iv-plan-cta-primary">Start free trial →</a>
                  <p className="iv-plan-section-label">Everything in Starter, plus</p>
                  <ul className="iv-plan-features">
                    {[
                      ["Xero accounting integration","strong"],
                      ["Auto-push invoices on payroll approval","strong"],
                      ["SMS broadcast (TotValeting sender)","strong"],
                      ["Advanced analytics dashboard","strong"],
                      ["Weekly KPI report (TOS export)","strong"],
                      ["Service charge requests",""],
                      ["Paint protection tier tracking",""],
                      ["Prospect & pipeline management",""],
                      ["Training & compliance tracking",""],
                      ["Equipment & consumables log",""],
                      ["Priority support",""],
                    ].map(([text, cls]) => (
                      <li key={text} className={`iv-plan-feature ${cls === "strong" ? "iv-f-strong" : ""}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E8650A" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Enterprise */}
                <div className="iv-plan">
                  <p className="iv-plan-name">Enterprise</p>
                  <div className="iv-plan-price">
                    <span className="iv-plan-amount" style={{fontSize:"2rem"}}>Custom</span>
                  </div>
                  <p className="iv-plan-billed">Volume discounts for groups</p>
                  <p className="iv-plan-tagline">For dealer groups managing 5+ sites. Custom pricing, dedicated account manager, and bespoke reporting.</p>
                  <a href="/home#iv-contact" className="iv-plan-cta iv-plan-cta-outline">Talk to us →</a>
                  <p className="iv-plan-section-label">Everything in Professional, plus</p>
                  <ul className="iv-plan-features">
                    {[
                      "Dedicated account manager",
                      "Group-level analytics across all sites",
                      "Custom KPI dashboards",
                      "Volume site discount",
                      "On-site onboarding & training",
                      "SLA-backed support",
                      "Bespoke feature development",
                      "Custom integrations (DMS, CRM)",
                      "White-label option",
                    ].map((text) => (
                      <li key={text} className="iv-plan-feature">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2.5" className="iv-check"><polyline points="20 6 9 17 4 12"/></svg>
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Trust strip */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"2rem",flexWrap:"wrap",paddingTop:"1rem",borderTop:"1px solid var(--border)",fontSize:"0.875rem",color:"var(--ink-mid)"}}>
                {["30-day free trial — no card required","Cancel anytime — no lock-in contracts","All prices exclude VAT","Setup & onboarding included"].map((t) => (
                  <span key={t} style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* COMPETITOR COMPARE */}
          <section className="iv-compare-section" style={{background:"var(--parchment)"}}>
            <div className="iv-container">
              <span className="iv-eyebrow">How we compare</span>
              <h2>Built for valeting.<br/>Priced fairly.</h2>
              <p>Other platforms charge per user, hide key features behind add-ons, or weren&apos;t built for dealership valeting at all. iValeter is different.</p>
              <div style={{overflowX:"auto"}}>
                <table className="iv-compare-table">
                  <thead>
                    <tr>
                      <th style={{textAlign:"left",width:"28%"}}>Feature</th>
                      <th className="iv-compare-thead-iv">iValeter Professional</th>
                      <th>Valetto Pro</th>
                      <th>vAutoStock Plus</th>
                      <th>BigChange</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Price", <span className="iv-compare-ivaleter">£149/site/mo</span>, "£89/site/mo", "£249/mo", "£80–125/user/mo"],
                      ["Per-user charges", <span style={{color:"var(--sage)",fontWeight:700}}>Never</span>, "None", "None", "Per user — gets expensive fast"],
                      ["Built for dealership valeting", "✓", "✓", "✓", "✗ Generic field service"],
                      ["Valeter mobile app", "✓", "✓", "✗", "✓"],
                      ["Xero integration", "✓", "✗", "✗", "Extra cost add-on"],
                      ["Geofenced timesheets", "✓", "✓", "✗", "✓"],
                      ["Payroll export (NatWest)", "✓", "✗", "✗", "✗"],
                      ["SMS broadcast", "✓", "✗", "✗", "Extra cost"],
                      ["Customer booking portal", "✓", "✓", "✗", "✗"],
                      ["CSI quality scoring", "✓", "✓", "✗", "✗"],
                      ["Bank details audit trail", "✓", "✗", "✗", "✗"],
                      ["Free trial (no card)", "30 days", "30 days", "✗", "✗"],
                      ["Lock-in contract", "None", "None", "1 month", "12 months"],
                    ].map(([feature, ...vals]) => (
                      <tr key={String(feature)}>
                        <td>{feature}</td>
                        {vals.map((v, i) => (
                          <td key={i} className={i === 0 ? "iv-compare-ivaleter" : ""}>
                            {v === "✓" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                             : v === "✗" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D8D0C4" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                             : v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{fontSize:"0.75rem",color:"var(--ink-light)",marginTop:"1rem"}}>Competitor pricing sourced July 2026. Valetto: valetto.co.uk/pricing. vAutoStock: vautostock.co.uk. BigChange: bigchange.com/pricing.</p>
            </div>
          </section>

          {/* FAQ */}
          <section className="iv-faq-section">
            <div className="iv-container">
              <div className="iv-faq-inner">
                <div>
                  <span className="iv-eyebrow">FAQ</span>
                  <h2>Common questions</h2>
                  <p>Something not covered here? Email us at <a href="mailto:hello@ivaleter.co.uk" style={{color:"var(--orange)"}}>hello@ivaleter.co.uk</a></p>
                </div>
                <div className="iv-faq-list" id="iv-faqList">
                  {[
                    ["What counts as a site?","A site is one physical dealership location. A dealer group with three showrooms would have three sites. If you have multiple sites, get in touch — we offer volume discounts on Professional and custom pricing for Enterprise."],
                    ["Are there any per-user charges?","No. Never. You can add as many valeters, managers, and dealership staff as you need on a single site subscription. We deliberately built pricing this way because valeting operations have variable team sizes."],
                    ["What's included in the free trial?","The full Professional plan — every feature, unlimited users, real Xero connection, SMS broadcast. 30 days, no credit card required. We set you up and help you onboard your team during the trial."],
                    ["Can I cancel anytime?","Yes. No lock-in, no cancellation fees, no notice period beyond the current billing month. We think the platform should earn your business every month."],
                    ["Does the price include Xero?","Yes on Professional and Enterprise. The Xero integration — including automatic invoice push on payroll approval and nominal code mapping — is included at no extra cost."],
                    ["How does SMS broadcast work?","Professional includes the SMS broadcast feature with your sender ID (TotValeting). SMS messages are charged at cost from The SMS Works (from 3.1p/SMS). Your SMS credits are separate from your iValeter subscription."],
                    ["Do you offer onboarding support?","Yes. Every new customer gets a setup call and walkthrough. We help you configure your sites, import your team, and set up your Xero connection. Enterprise customers get on-site onboarding."],
                    ["Is there a setup fee?","No setup fee on Starter or Professional. Enterprise pricing may include onboarding costs for large groups — we'll be upfront about that in your quote."],
                  ].map(([q, a]) => (
                    <div key={String(q)} className="iv-faq-item">
                      <button className="iv-faq-q" data-faq>
                        {q}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                      <p className="iv-faq-a">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* CTA STRIP */}
          <section className="iv-cta-strip">
            <div className="iv-container">
              <h2>Start your free 30-day trial</h2>
              <p>No credit card. No lock-in. Full Professional plan from day one.</p>
              <div className="iv-cta-strip-actions">
                <a href="/home#iv-contact" className="iv-btn-white">Request a Demo →</a>
                <Link href="/login" className="iv-btn-ghost-white">Sign In</Link>
              </div>
            </div>
          </section>

        </main>

        {/* FOOTER */}
        <footer className="iv-footer">
          <div className="iv-container iv-footer-inner">
            <div>
              <Link href="/home" className="iv-logo" aria-label="iValeter">
                <svg width="26" height="26" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                  <rect width="34" height="34" rx="7" fill="#E8650A"/>
                  <path d="M10 9h4l5.5 11.5L25 9h4L20.5 26.5h-3L10 9z" fill="#F5F0E8"/>
                </svg>
                <span className="iv-logo-text">iValeter</span>
              </Link>
              <p className="iv-footer-tagline">The smarter way to manage your valeting operation.</p>
            </div>
            <div className="iv-footer-links">
              <a href="mailto:hello@ivaleter.co.uk">hello@ivaleter.co.uk</a>
              <a href="https://ivaleter.co.uk">ivaleter.co.uk</a>
              <span>© 2026 iValeter Ltd</span>
              <span>ICO Reg: ZC191529</span>
            </div>
          </div>
        </footer>

        {/* Scripts */}
        <script dangerouslySetInnerHTML={{__html:`
          (function() {
            // Mobile nav toggle
            var toggle = document.getElementById('iv-mobileToggle');
            var menu = document.getElementById('iv-mobileMenu');
            if (toggle && menu) {
              toggle.addEventListener('click', function() { menu.classList.toggle('iv-open'); });
            }

            // Billing toggle — monthly / annual
            var billingBtns = document.querySelectorAll('#iv-billingToggle button');
            billingBtns.forEach(function(btn) {
              btn.addEventListener('click', function() {
                billingBtns.forEach(function(b) { b.classList.remove('iv-active'); });
                btn.classList.add('iv-active');
                var isAnnual = btn.dataset.period === 'annual';
                document.querySelectorAll('.iv-monthly-price').forEach(function(el) { el.style.display = isAnnual ? 'none' : ''; });
                document.querySelectorAll('.iv-annual-price').forEach(function(el) { el.style.display = isAnnual ? '' : 'none'; });
                document.querySelectorAll('.iv-monthly-billed').forEach(function(el) { el.style.display = isAnnual ? 'none' : ''; });
                document.querySelectorAll('.iv-annual-billed').forEach(function(el) { el.style.display = isAnnual ? '' : 'none'; });
              });
            });

            // FAQ accordion
            document.querySelectorAll('[data-faq]').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var answer = btn.nextElementSibling;
                var isOpen = btn.classList.contains('iv-open');
                document.querySelectorAll('[data-faq]').forEach(function(b) {
                  b.classList.remove('iv-open');
                  b.nextElementSibling.classList.remove('iv-open');
                });
                if (!isOpen) {
                  btn.classList.add('iv-open');
                  answer.classList.add('iv-open');
                }
              });
            });
          })();
        `}} />
      </div>
    </>
  );
}
