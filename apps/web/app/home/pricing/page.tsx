import Link from "next/link";
import { PricingInteractive } from "@/components/home/pricing-interactive";

export const metadata = {
  title: "Pricing — iValeter",
  description: "One platform, one price. £99/site/month launch offer. Full valet operations platform — unlimited valeters, unlimited jobs, every feature included.",
};

export default function PricingPage() {
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
        .ivp-root {
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
        .ivp-nav-links a.ivp-active { color: var(--orange); font-weight: 600; }
        .ivp-nav-cta { background: var(--orange) !important; color: #fff !important; padding: 0.5rem 1.1rem; border-radius: var(--radius); font-weight: 600 !important; transition: background var(--tr) !important; }
        .ivp-nav-cta:hover { background: var(--orange-hover) !important; }
        .ivp-nav-signin { color: var(--ink-light) !important; font-weight: 500 !important; }
        .ivp-nav-signin:hover { color: var(--ink) !important; }
        @media (max-width: 640px) { .ivp-nav-links { display: none; } }

        /* ── Shared ── */
        .ivp-container { max-width: var(--max-w); margin: 0 auto; padding: 0 1.5rem; }
        .ivp-eyebrow { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sage); display: block; margin-bottom: 0.75rem; }

        /* ── Hero ── */
        .ivp-hero { padding: 4.5rem 0 2.5rem; text-align: center; }
        .ivp-hero h1 { font-size: clamp(2.25rem, 1.6rem + 2.5vw, 3.5rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.08; color: var(--ink); margin-bottom: 1.25rem; }
        .ivp-hero-sub { font-size: 1.125rem; color: var(--ink-mid); max-width: 540px; margin: 0 auto 2.25rem; line-height: 1.65; }

        /* ── Toggle ── */
        .ivp-toggle-wrap { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding-bottom: 3rem; }
        .ivp-toggle { display: inline-flex; align-items: center; background: var(--parchment); border: 1px solid var(--border); border-radius: 2rem; padding: 0.25rem; }
        .ivp-toggle button { padding: 0.4rem 1.25rem; border-radius: 2rem; border: none; cursor: pointer; font-weight: 600; font-size: 0.875rem; font-family: inherit; transition: background var(--tr), color var(--tr); }
        .ivp-toggle button.on { background: var(--ink); color: #fff; }
        .ivp-toggle button:not(.on) { background: transparent; color: var(--ink-mid); }
        .ivp-save-pill { font-size: 0.75rem; font-weight: 700; color: var(--sage-dark); background: rgba(107,143,113,0.15); border: 1px solid rgba(107,143,113,0.3); border-radius: 1rem; padding: 0.2rem 0.6rem; white-space: nowrap; }

        /* ── Main price block ── */
        .ivp-main-block { padding: 0 0 4rem; }
        .ivp-card-wrap { max-width: 960px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start; }
        @media (max-width: 720px) { .ivp-card-wrap { grid-template-columns: 1fr; } }

        .ivp-main-card { background: #fff; border: 2px solid var(--orange); border-radius: var(--radius-xl); padding: 2.25rem 2rem; position: relative; box-shadow: 0 0 0 4px rgba(232,101,10,0.08); }
        .ivp-launch-badge { position: absolute; top: -14px; left: 2rem; background: var(--orange); color: #fff; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.28rem 0.85rem; border-radius: 1rem; white-space: nowrap; }
        .ivp-card-name { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sage); margin-bottom: 0.5rem; }
        .ivp-price-row { display: flex; align-items: flex-end; gap: 0.35rem; margin-bottom: 0.2rem; min-height: 4.5rem; }
        .ivp-price-big { font-size: clamp(3rem, 2.5rem + 1.5vw, 4rem); font-weight: 700; letter-spacing: -0.04em; color: var(--ink); line-height: 1; }
        .ivp-price-unit { font-size: 0.9rem; color: var(--ink-light); padding-bottom: 0.55rem; }
        .ivp-price-note { font-size: 0.8rem; color: var(--ink-light); margin-bottom: 0.35rem; min-height: 1.25rem; }
        .ivp-price-was { font-size: 0.8rem; color: var(--ink-light); text-decoration: line-through; margin-bottom: 1.25rem; min-height: 1.25rem; }
        .ivp-card-desc { font-size: 0.95rem; color: var(--ink-mid); line-height: 1.6; margin-bottom: 1.75rem; padding-bottom: 1.75rem; border-bottom: 1px solid var(--border); }
        .ivp-cta-btn { display: block; width: 100%; padding: 0.875rem; border-radius: var(--radius); font-size: 0.95rem; font-weight: 700; text-align: center; cursor: pointer; border: none; font-family: inherit; background: var(--orange); color: #fff; margin-bottom: 0.75rem; transition: background var(--tr), box-shadow var(--tr); }
        .ivp-cta-btn:hover { background: var(--orange-hover); box-shadow: 0 4px 16px rgba(232,101,10,0.32); }
        .ivp-cta-sub { font-size: 0.8rem; color: var(--ink-light); text-align: center; margin-bottom: 1.75rem; }
        .ivp-feat-group { margin-bottom: 1.25rem; }
        .ivp-feat-group-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-light); margin-bottom: 0.6rem; }
        .ivp-feat-list { display: flex; flex-direction: column; gap: 0.45rem; }
        .ivp-feat-item { display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.875rem; color: var(--ink-mid); line-height: 1.45; }

        /* ── Group card ── */
        .ivp-group-card { background: var(--parchment); border: 1.5px solid var(--border); border-radius: var(--radius-xl); padding: 2rem; }
        .ivp-group-card h3 { font-size: 1.1rem; font-weight: 700; color: var(--ink); letter-spacing: -0.01em; margin-bottom: 0.35rem; }
        .ivp-group-intro { font-size: 0.9rem; color: var(--ink-mid); line-height: 1.6; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
        .ivp-group-rows { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
        .ivp-group-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .ivp-group-row-label { font-size: 0.9rem; font-weight: 600; color: var(--ink); }
        .ivp-group-row-price { text-align: right; }
        .ivp-group-row-amount { font-size: 1rem; font-weight: 700; color: var(--ink); }
        .ivp-group-row-note { font-size: 0.75rem; color: var(--ink-light); }
        .ivp-group-row-poa { font-size: 1rem; font-weight: 700; color: var(--sage-dark); }
        .ivp-group-saving { font-size: 0.72rem; color: var(--sage-dark); font-weight: 600; background: rgba(107,143,113,0.12); border-radius: 0.5rem; padding: 0.15rem 0.45rem; white-space: nowrap; }
        .ivp-group-divider { height: 1px; background: var(--border); margin: 0.1rem 0; }
        .ivp-group-onboarding { font-size: 0.82rem; color: var(--ink-mid); line-height: 1.65; background: rgba(28,26,22,0.04); border-radius: var(--radius); padding: 0.875rem 1rem; margin-bottom: 1.5rem; }
        .ivp-group-onboarding strong { color: var(--ink); }
        .ivp-cta-outline { display: block; width: 100%; padding: 0.75rem; border-radius: var(--radius); font-size: 0.9rem; font-weight: 700; text-align: center; cursor: pointer; border: 1.5px solid var(--border); background: transparent; color: var(--ink); font-family: inherit; transition: border-color var(--tr), color var(--tr); }
        .ivp-cta-outline:hover { border-color: var(--orange); color: var(--orange); }

        /* ── Trust bar ── */
        .ivp-trust { display: flex; align-items: center; justify-content: center; gap: 2rem; flex-wrap: wrap; padding: 2.5rem 0 0; border-top: 1px solid var(--border); margin: 0 auto; max-width: 960px; }
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
        .ivp-faq-a { font-size: 0.9rem; color: var(--ink-mid); line-height: 1.75; padding-bottom: 1.25rem; }

        /* ── CTA strip ── */
        .ivp-cta-strip { background: var(--sage-dark); padding: 5rem 0; text-align: center; }
        .ivp-cta-strip h2 { font-size: clamp(1.75rem, 1.4rem + 1.5vw, 2.75rem); font-weight: 700; color: #fff; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
        .ivp-cta-strip p { font-size: 1rem; color: rgba(255,255,255,0.75); max-width: 480px; margin: 0 auto 2rem; line-height: 1.65; }
        .ivp-strip-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .ivp-btn-white { background: #fff; color: var(--sage-dark); padding: 0.875rem 2rem; border-radius: var(--radius); font-weight: 700; font-size: 0.9rem; border: none; cursor: pointer; font-family: inherit; transition: box-shadow var(--tr); text-decoration: none; display: inline-block; }
        .ivp-btn-white:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
        .ivp-btn-ghost { background: transparent; color: #fff; padding: 0.875rem 2rem; border-radius: var(--radius); font-weight: 600; font-size: 0.9rem; border: 1.5px solid rgba(255,255,255,0.35); cursor: pointer; font-family: inherit; transition: border-color var(--tr); text-decoration: none; display: inline-block; }
        .ivp-btn-ghost:hover { border-color: #fff; }

        /* ── Footer ── */
        .ivp-footer { background: var(--parchment); border-top: 1px solid var(--border); padding: 2rem 0; }
        .ivp-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
        .ivp-footer-tagline { font-size: 0.875rem; color: var(--ink-light); margin-top: 0.5rem; }
        .ivp-footer-links { display: flex; align-items: center; gap: 1.25rem; font-size: 0.875rem; color: var(--ink-mid); flex-wrap: wrap; }
        .ivp-footer-links a:hover { color: var(--orange); }
      `}</style>

      <div className="ivp-root">

        {/* NAV — static, never re-renders */}
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
              <Link href="/home/pricing" className="ivp-active">Pricing</Link>
              <Link href="/home#iv-contact" className="ivp-nav-cta">Request a Demo</Link>
              <Link href="/login" className="ivp-nav-signin">Sign In</Link>
            </nav>
          </div>
        </header>

        <main>

          {/* HERO — static */}
          <section className="ivp-hero">
            <div className="ivp-container">
              <span className="ivp-eyebrow">Pricing</span>
              <h1>One platform.<br/>One price.</h1>
              <p className="ivp-hero-sub">
                Every feature included. Unlimited valeters, unlimited jobs, unlimited users.
                No per-user charges. No add-ons. No surprises.
              </p>
            </div>
          </section>

          {/* INTERACTIVE — toggle, cards, FAQ (client component) */}
          <div className="ivp-container">
            <PricingInteractive />
          </div>

          {/* COMPETITOR COMPARE — static */}
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
                      ["Price (per site)", <span key="p" className="ivp-tbl-iv">£99/mo launch<br/><span style={{fontWeight:400,fontSize:"0.8rem",color:"var(--orange)"}}>then £149/mo</span></span>, "£89/mo", "£249/mo", "£80–125/user"],
                      ["Per-user charges", <span key="u" style={{color:"var(--sage)",fontWeight:700}}>Never</span>, "None", "None", "Yes — expensive fast"],
                      ["Built for dealership valet", "✓", "✓", "✓", "✗"],
                      ["Valeter mobile app", "✓", "✓", "✗", "✓"],
                      ["Accounts integration", "✓", "✗", "✗", "Add-on cost"],
                      ["Geofenced timesheets", "✓", "✓", "✗", "✓"],
                      ["Payroll export (UK bank)", "✓", "✗", "✗", "✗"],
                      ["SMS broadcast", "✓", "✗", "✗", "Add-on cost"],
                      ["CSI quality scoring", "✓", "✓", "✗", "✗"],
                      ["Delivery inspections", "✓", "✗", "✗", "✗"],
                      ["Bank details audit trail", "✓", "✗", "✗", "✗"],
                      ["Free trial (no card)", "30 days", "30 days", "✗", "✗"],
                      ["Lock-in contract", "None", "None", "1 month", "12 months"],
                    ] as [string, React.ReactNode, string, string, string][]).map(([feature, ...vals]) => (
                      <tr key={feature}>
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

          {/* CTA STRIP — static */}
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

        {/* FOOTER — static */}
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
