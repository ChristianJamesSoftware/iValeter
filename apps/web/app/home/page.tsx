import Link from "next/link";
import { FeatureCards } from "@/components/home/feature-cards";

export const metadata = {
  title: "iValeter — Valeting Management Built for UK Dealerships",
  description:
    "iValeter is the only platform built specifically for dealership valeting operations. Real-time job tracking, geofenced timesheets, CSI quality scoring and accounting integration — all in one place.",
};

export default function HomePage() {
  return (
    <>
      <style>{`
        /* ─── iValeter Landing — scoped styles ───────────────────────────── */
        .iv-root {
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #F5F0E8;
          color: #1C1A16;
          font-size: 1rem;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .iv-root *, .iv-root *::before, .iv-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .iv-root img { max-width: 100%; display: block; }
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
          --font:         'DM Sans', system-ui, sans-serif;
          --text-xs:      0.75rem;
          --text-sm:      0.875rem;
          --text-base:    1rem;
          --text-lg:      1.125rem;
          --text-xl:      1.375rem;
          --text-2xl:     clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem);
          --text-3xl:     clamp(2.25rem, 1.6rem + 2.5vw, 3.75rem);
          --space-2:  0.5rem;   --space-3:  0.75rem; --space-4:  1rem;
          --space-5:  1.25rem;  --space-6:  1.5rem;  --space-8:  2rem;
          --space-10: 2.5rem;   --space-12: 3rem;    --space-16: 4rem;
          --space-20: 5rem;     --space-24: 6rem;
          --radius-sm: 0.25rem; --radius: 0.375rem;  --radius-md: 0.5rem;
          --radius-lg: 0.75rem; --radius-xl: 1rem;
          --shadow-sm: 0 1px 3px rgba(28,26,22,0.07);
          --shadow:    0 2px 8px rgba(28,26,22,0.09), 0 1px 3px rgba(28,26,22,0.05);
          --shadow-md: 0 4px 16px rgba(28,26,22,0.10), 0 2px 6px rgba(28,26,22,0.06);
          --shadow-lg: 0 8px 32px rgba(28,26,22,0.12), 0 4px 10px rgba(28,26,22,0.07);
          --max-w: 1160px; --narrow: 720px;
          --transition: 160ms cubic-bezier(0.16,1,0.3,1);
        }

        /* Utility */
        .iv-container { max-width: var(--max-w); margin: 0 auto; padding: 0 var(--space-6); }
        .iv-eyebrow { font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sage); margin-bottom: var(--space-3); display: block; }

        /* Buttons */
        .iv-btn { display: inline-flex; align-items: center; gap: var(--space-2); padding: 0.75rem 1.5rem; font-family: var(--font); font-size: var(--text-sm); font-weight: 600; border-radius: var(--radius); border: none; cursor: pointer; transition: background var(--transition), color var(--transition), transform var(--transition), box-shadow var(--transition); white-space: nowrap; line-height: 1; }
        .iv-btn-primary { background: var(--orange); color: #fff; }
        .iv-btn-primary:hover { background: var(--orange-hover); box-shadow: 0 4px 14px rgba(232,101,10,0.3); }
        .iv-btn-outline { background: transparent; color: var(--ink); border: 1.5px solid var(--border); }
        .iv-btn-outline:hover { border-color: var(--ink-mid); background: var(--parchment); }
        .iv-btn-full { width: 100%; justify-content: center; }

        /* NAV */
        .iv-nav { position: sticky; top: 0; z-index: 100; background: var(--cream); border-bottom: 1px solid var(--border); transition: box-shadow var(--transition); }
        .iv-nav-inner { max-width: var(--max-w); margin: 0 auto; padding: 0 var(--space-6); height: 60px; display: flex; align-items: center; gap: var(--space-8); }
        .iv-logo { display: flex; align-items: center; gap: var(--space-3); flex-shrink: 0; }
        .iv-logo-text { font-size: var(--text-lg); font-weight: 700; color: var(--ink); letter-spacing: -0.01em; }
        .iv-nav-links { display: flex; align-items: center; gap: var(--space-6); margin-left: auto; }
        .iv-nav-links a { font-size: var(--text-sm); font-weight: 500; color: var(--ink-mid); transition: color var(--transition); }
        .iv-nav-links a:hover { color: var(--ink); }
        .iv-nav-cta { background: var(--orange) !important; color: #fff !important; padding: 0.5rem 1.1rem; border-radius: var(--radius); font-weight: 600 !important; transition: background var(--transition) !important; }
        .iv-nav-cta:hover { background: var(--orange-hover) !important; }
        .iv-nav-signin { background: transparent; color: var(--ink-mid) !important; border: 1.5px solid var(--border); padding: 0.5rem 1.1rem; border-radius: var(--radius); font-weight: 600 !important; font-size: var(--text-sm); transition: border-color var(--transition), color var(--transition) !important; }
        .iv-nav-signin:hover { border-color: var(--ink-mid); color: var(--ink) !important; }
        .iv-nav-mobile-toggle { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: var(--space-2); margin-left: auto; }
        .iv-nav-mobile-toggle span { display: block; width: 22px; height: 2px; background: var(--ink); border-radius: 2px; transition: transform var(--transition), opacity var(--transition); }
        .iv-nav-mobile-menu { display: none; flex-direction: column; gap: 0; background: var(--cream); border-top: 1px solid var(--border); padding: var(--space-4) var(--space-6); }
        .iv-nav-mobile-menu a { padding: var(--space-3) 0; font-size: var(--text-base); font-weight: 500; color: var(--ink-mid); border-bottom: 1px solid var(--border); }
        .iv-mobile-cta { margin-top: var(--space-4); border-bottom: none !important; background: var(--orange); color: #fff !important; text-align: center; padding: var(--space-3) !important; border-radius: var(--radius); font-weight: 600; }
        .iv-nav-mobile-menu.iv-open { display: flex; }

        /* HERO */
        .iv-hero { padding: var(--space-20) 0 var(--space-16); background: var(--cream); }
        .iv-hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-16); align-items: center; }
        .iv-hero-copy h1 { font-size: var(--text-3xl); font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; color: var(--ink); margin-bottom: var(--space-5); }
        .iv-hero-accent { color: var(--orange); }
        .iv-hero-sub { font-size: var(--text-lg); color: var(--ink-mid); line-height: 1.65; margin-bottom: var(--space-8); max-width: 480px; }
        .iv-hero-actions { display: flex; gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-10); }
        .iv-hero-proof { display: flex; align-items: center; gap: var(--space-5); padding-top: var(--space-6); border-top: 1px solid var(--border); }
        .iv-proof-item { text-align: left; }
        .iv-proof-n { display: block; font-size: var(--text-xl); font-weight: 700; color: var(--ink); letter-spacing: -0.02em; line-height: 1; }
        .iv-proof-l { display: block; font-size: var(--text-xs); color: var(--ink-light); font-weight: 500; margin-top: 3px; }
        .iv-proof-div { width: 1px; height: 32px; background: var(--border); }

        /* Dashboard Frame */
        .iv-dashboard-frame { background: var(--parchment); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-lg); }
        .iv-frame-bar { background: var(--parchment-2); border-bottom: 1px solid var(--border); padding: 10px 14px; display: flex; align-items: center; gap: var(--space-4); }
        .iv-frame-dots { display: flex; gap: 5px; }
        .iv-frame-dots span { width: 10px; height: 10px; border-radius: 50%; background: var(--border); }
        .iv-frame-dots span:nth-child(1) { background: #E8650A; opacity: 0.5; }
        .iv-frame-dots span:nth-child(2) { background: #E8A00A; opacity: 0.5; }
        .iv-frame-dots span:nth-child(3) { background: #6B8F71; opacity: 0.5; }
        .iv-frame-url { font-size: 11px; color: var(--ink-light); font-family: var(--font); background: var(--cream); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 3px 10px; }
        .iv-frame-body { display: flex; height: 340px; }
        .iv-frame-sidebar { width: 56px; background: var(--sage-dark); padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-3); flex-shrink: 0; }
        .iv-frame-logo-block { width: 30px; height: 30px; border-radius: var(--radius); background: var(--orange); margin-bottom: var(--space-2); }
        .iv-frame-nav { height: 8px; border-radius: var(--radius-sm); background: rgba(245,240,232,0.2); }
        .iv-frame-nav.iv-active { background: var(--orange); opacity: 0.8; }
        .iv-frame-main { flex: 1; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); overflow: hidden; background: var(--cream); }
        .iv-frame-header { display: flex; align-items: center; justify-content: space-between; }
        .iv-frame-title-block { height: 10px; width: 120px; background: var(--parchment-2); border-radius: var(--radius-sm); }
        .iv-live-pill { font-size: 10px; font-weight: 700; color: var(--sage-dark); background: rgba(107,143,113,0.15); border: 1px solid rgba(107,143,113,0.3); border-radius: 20px; padding: 2px 8px; }
        .iv-frame-kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: var(--space-3); }
        .iv-frame-kpi { background: var(--parchment); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-3); }
        .iv-frame-kpi-n { font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 2px; }
        .iv-frame-kpi-l { font-size: 9px; color: var(--ink-light); font-weight: 500; }
        .iv-frame-jobs { display: flex; flex-direction: column; gap: var(--space-2); flex: 1; }
        .iv-frame-job { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); background: var(--parchment); border: 1px solid var(--border); border-radius: var(--radius); }
        .iv-frame-reg { font-family: var(--font); font-size: 10px; font-weight: 700; color: var(--ink); background: var(--cream); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 3px 6px; white-space: nowrap; letter-spacing: 0.03em; }
        .iv-frame-job-meta { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .iv-frame-job-meta div { height: 6px; border-radius: var(--radius-sm); background: var(--parchment-2); }
        .iv-frame-job-meta div:last-child { width: 65%; }
        .iv-frame-badge { font-size: 9px; font-weight: 700; border-radius: 20px; padding: 2px 8px; white-space: nowrap; }
        .iv-frame-badge.iv-inprogress { background: rgba(232,101,10,0.12); color: #C9530A; }
        .iv-frame-badge.iv-complete   { background: rgba(107,143,113,0.15); color: #4A6B50; }
        .iv-frame-badge.iv-priority   { background: rgba(232,160,10,0.15); color: #8A6A00; }
        .iv-frame-badge.iv-pending    { background: rgba(28,26,22,0.07); color: var(--ink-mid); }

        /* PROBLEM */
        .iv-problem { background: var(--parchment); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: var(--space-16) 0; }
        .iv-problem-inner { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-16); align-items: start; }
        .iv-problem-copy h2 { font-size: var(--text-2xl); font-weight: 700; letter-spacing: -0.02em; color: var(--ink); margin-bottom: var(--space-5); line-height: 1.2; }
        .iv-problem-copy p { color: var(--ink-mid); line-height: 1.7; }
        .iv-pain-list { display: flex; flex-direction: column; gap: var(--space-4); }
        .iv-pain-item { display: flex; align-items: flex-start; gap: var(--space-4); padding: var(--space-4); background: var(--cream); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: var(--text-sm); color: var(--ink-mid); line-height: 1.5; }
        .iv-pain-icon-wrap { flex-shrink: 0; width: 32px; height: 32px; border-radius: var(--radius); background: rgba(232,101,10,0.1); display: flex; align-items: center; justify-content: center; color: var(--orange); margin-top: 1px; }

        /* FEATURES */
        .iv-features { padding: var(--space-20) 0; background: var(--cream); }
        .iv-section-head { text-align: center; max-width: var(--narrow); margin: 0 auto var(--space-12); }
        .iv-section-head h2 { font-size: var(--text-2xl); font-weight: 700; letter-spacing: -0.02em; color: var(--ink); line-height: 1.2; margin-bottom: var(--space-5); }
        .iv-section-sub { font-size: var(--text-base); color: var(--ink-mid); line-height: 1.7; }
        .iv-feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-5); }
        .iv-feature-card { background: var(--parchment); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-3); transition: box-shadow var(--transition), transform var(--transition); }
        .iv-feature-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .iv-feature-card--wide { grid-column: span 1; }
        @media (min-width: 900px) {
          .iv-feature-card--wide { grid-column: span 2; flex-direction: row; align-items: flex-start; gap: var(--space-6); }
          .iv-feature-card--wide .iv-feature-icon-wrap { flex-shrink: 0; margin-top: 4px; }
        }
        .iv-feature-icon-wrap { width: 42px; height: 42px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .iv-feature-icon-wrap.iv-orange { background: rgba(232,101,10,0.1); color: var(--orange); }
        .iv-feature-icon-wrap.iv-sage   { background: rgba(107,143,113,0.12); color: var(--sage-dark); }
        .iv-feature-card h3 { font-size: var(--text-base); font-weight: 700; color: var(--ink); letter-spacing: -0.01em; }
        .iv-feature-card p { font-size: var(--text-sm); color: var(--ink-mid); line-height: 1.65; flex: 1; }
        .iv-feature-list { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-2); }
        .iv-feature-list li { font-size: var(--text-sm); color: var(--ink-mid); padding-left: var(--space-5); position: relative; line-height: 1.5; }
        .iv-feature-list li::before { content: ''; position: absolute; left: 0; top: 7px; width: 6px; height: 6px; border-radius: 50%; background: var(--sage); }

        /* PORTALS */
        .iv-portals { padding: var(--space-20) 0; background: var(--sage-dark); }
        .iv-portals .iv-section-head h2, .iv-portals .iv-section-head .iv-eyebrow { color: var(--cream); }
        .iv-portals .iv-section-head { --sage: #A8C5AC; }
        .iv-portal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-5); }
        .iv-portal-card { background: rgba(245,240,232,0.06); border: 1px solid rgba(245,240,232,0.12); border-radius: var(--radius-lg); padding: var(--space-8) var(--space-6); position: relative; overflow: hidden; transition: background var(--transition), box-shadow var(--transition); }
        .iv-portal-card:hover { background: rgba(245,240,232,0.10); }
        .iv-portal-card--featured { background: rgba(245,240,232,0.11); border-color: rgba(245,240,232,0.2); }
        .iv-portal-label { font-size: var(--text-base); font-weight: 700; color: var(--cream); letter-spacing: -0.01em; margin-bottom: var(--space-2); }
        .iv-portal-role { font-size: var(--text-sm); color: var(--sage-light); margin-bottom: var(--space-6); font-weight: 500; }
        .iv-portal-list { display: flex; flex-direction: column; gap: var(--space-3); }
        .iv-portal-list li { font-size: var(--text-sm); color: rgba(245,240,232,0.75); padding-left: var(--space-5); position: relative; line-height: 1.5; }
        .iv-portal-list li::before { content: ''; position: absolute; left: 0; top: 7px; width: 5px; height: 5px; border-radius: 50%; background: var(--sage-light); }
        .iv-portal-accent { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; }
        .iv-portal-accent.iv-orange { background: var(--orange); }
        .iv-portal-accent.iv-sage   { background: var(--sage-light); }

        /* COMPARE */
        .iv-compare { padding: var(--space-20) 0; background: var(--parchment); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .iv-compare-table { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-5); max-width: 860px; margin: 0 auto; }
        .iv-compare-col { border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border); }
        .iv-compare-col-head { padding: var(--space-4) var(--space-5); font-size: var(--text-sm); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .iv-compare-them .iv-compare-col-head { background: var(--parchment-2); color: var(--ink-mid); border-bottom: 1px solid var(--border); }
        .iv-compare-us .iv-compare-col-head { background: var(--orange); color: #fff; }
        .iv-compare-item { padding: var(--space-3) var(--space-5); font-size: var(--text-sm); line-height: 1.5; display: flex; align-items: flex-start; gap: var(--space-3); border-top: 1px solid var(--border); }
        .iv-compare-them .iv-compare-item { background: var(--cream); color: var(--ink-mid); }
        .iv-compare-us .iv-compare-item   { background: var(--cream); color: var(--ink); }
        .iv-compare-item::before { content: ''; flex-shrink: 0; width: 16px; height: 16px; border-radius: 50%; margin-top: 1px; }
        .iv-compare-item.iv-bad::before  { background: rgba(200,50,30,0.1) url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='2.5' y1='2.5' x2='7.5' y2='7.5' stroke='%23c8321e' stroke-width='1.5'/%3E%3Cline x1='7.5' y1='2.5' x2='2.5' y2='7.5' stroke='%23c8321e' stroke-width='1.5'/%3E%3C/svg%3E") no-repeat center / 10px; }
        .iv-compare-item.iv-good::before { background: rgba(107,143,113,0.15) url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='2,5.5 4,7.5 8,3' stroke='%234A6B50' stroke-width='1.5' fill='none'/%3E%3C/svg%3E") no-repeat center / 10px; }

        /* INTEGRATIONS */
        .iv-integrations { padding: var(--space-16) 0; background: var(--cream); }
        .iv-integrations h2 { font-size: var(--text-xl); font-weight: 700; color: var(--ink); margin-bottom: var(--space-8); text-align: center; }
        .iv-chip-row { display: flex; flex-wrap: wrap; gap: var(--space-3); justify-content: center; }
        .iv-chip { display: flex; align-items: center; gap: var(--space-2); padding: 0.5rem 1rem; background: var(--parchment); border: 1px solid var(--border); border-radius: 100px; font-size: var(--text-sm); font-weight: 500; color: var(--ink); position: relative; }
        .iv-chip--soon { color: var(--ink-light); }
        .iv-chip-tag { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; background: var(--parchment-2); color: var(--ink-light); border-radius: 20px; padding: 1px 6px; margin-left: 2px; }

        /* CTA */
        .iv-cta-section { padding: var(--space-20) 0; background: var(--ink); }
        .iv-cta-inner { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-16); align-items: center; }
        .iv-cta-copy h2 { font-size: var(--text-2xl); font-weight: 700; color: var(--cream); letter-spacing: -0.02em; line-height: 1.2; margin-bottom: var(--space-5); }
        .iv-cta-copy p { color: rgba(245,240,232,0.6); line-height: 1.7; margin-bottom: var(--space-8); }
        .iv-cta-trust { display: flex; flex-direction: column; gap: var(--space-3); }
        .iv-trust-item { display: flex; align-items: center; gap: var(--space-3); font-size: var(--text-sm); color: rgba(245,240,232,0.6); font-weight: 500; }
        .iv-cta-form-wrap { background: rgba(245,240,232,0.05); border: 1px solid rgba(245,240,232,0.1); border-radius: var(--radius-xl); padding: var(--space-8); }
        .iv-cta-form { display: flex; flex-direction: column; gap: var(--space-4); }
        .iv-form-input { width: 100%; padding: 0.75rem 1rem; background: rgba(245,240,232,0.05); border: 1px solid rgba(245,240,232,0.15); border-radius: var(--radius); font-family: var(--font); font-size: var(--text-sm); color: var(--cream); outline: none; transition: border-color var(--transition); }
        .iv-form-input::placeholder { color: rgba(245,240,232,0.3); }
        .iv-form-input:focus { border-color: var(--orange); }

        /* FOOTER */
        .iv-footer { background: var(--parchment); border-top: 1px solid var(--border); padding: var(--space-8) 0; }
        .iv-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: var(--space-8); flex-wrap: wrap; }
        .iv-footer-tagline { font-size: var(--text-sm); color: var(--ink-light); margin-top: var(--space-2); }
        .iv-footer-links { display: flex; align-items: center; gap: var(--space-5); font-size: var(--text-sm); color: var(--ink-mid); flex-wrap: wrap; }
        .iv-footer-links a { transition: color var(--transition); }
        .iv-footer-links a:hover { color: var(--orange); }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .iv-feature-grid { grid-template-columns: repeat(2, 1fr); }
          .iv-feature-card--wide { grid-column: span 2; }
        }
        @media (max-width: 900px) {
          .iv-hero-inner { grid-template-columns: 1fr; }
          .iv-hero-visual { display: none; }
          .iv-problem-inner { grid-template-columns: 1fr; }
          .iv-portal-grid { grid-template-columns: 1fr; }
          .iv-compare-table { grid-template-columns: 1fr; }
          .iv-cta-inner { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .iv-nav-links { display: none; }
          .iv-nav-mobile-toggle { display: flex; }
          .iv-feature-grid { grid-template-columns: 1fr; }
          .iv-feature-card--wide { grid-column: span 1; flex-direction: column !important; }
          .iv-hero { padding: var(--space-12) 0; }
          .iv-portals, .iv-features, .iv-compare, .iv-cta-section { padding: var(--space-12) 0; }
          .iv-hero-proof { flex-wrap: wrap; }
        }

        /* Reveal animations */
        .iv-reveal { opacity: 0; transform: translateY(18px); transition: opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1); }
        .iv-reveal.iv-visible { opacity: 1; transform: none; }
        .iv-reveal-delay-1 { transition-delay: 0.08s; }
        .iv-reveal-delay-2 { transition-delay: 0.16s; }
      `}</style>

      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet" />

      <div className="iv-root">

        {/* NAV */}
        <header className="iv-nav" id="iv-nav">
          <div className="iv-nav-inner">
            <a href="#" className="iv-logo" aria-label="iValeter home">
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                <rect width="34" height="34" rx="7" fill="#E8650A"/>
                <path d="M10 9h4l5.5 11.5L25 9h4L20.5 26.5h-3L10 9z" fill="#F5F0E8"/>
                <circle cx="10" cy="9" r="2.5" fill="#F5F0E8" opacity="0.55"/>
              </svg>
              <span className="iv-logo-text">iValeter</span>
            </a>
            <nav className="iv-nav-links" aria-label="Main navigation">
              <a href="#iv-features">Features</a>
              <a href="#iv-portals">How It Works</a>
              <a href="#iv-compare">Why iValeter</a>
              <Link href="/home/pricing">Pricing</Link>
              <Link href="/login" className="iv-nav-signin">Sign In</Link>
              <a href="#iv-contact" className="iv-nav-cta">Request a Demo</a>
            </nav>
            <button className="iv-nav-mobile-toggle" id="iv-mobileToggle" aria-label="Open menu">
              <span></span><span></span><span></span>
            </button>
          </div>
          <div className="iv-nav-mobile-menu" id="iv-mobileMenu">
            <a href="#iv-features">Features</a>
            <a href="#iv-portals">How It Works</a>
            <a href="#iv-compare">Why iValeter</a>
            <Link href="/home/pricing">Pricing</Link>
            <Link href="/login" className="iv-nav-signin" style={{borderBottom:"none",marginBottom:"0.5rem"}}>Sign In</Link>
            <a href="#iv-contact" className="iv-mobile-cta">Request a Demo</a>
          </div>
        </header>

        <main>

          {/* HERO */}
          <section className="iv-hero" id="iv-hero">
            <div className="iv-container">
              <div className="iv-hero-inner">
                <div className="iv-hero-copy">
                  <p className="iv-eyebrow">Built for UK dealership valeting</p>
                  <h1>
                    The platform that runs<br/>
                    <span className="iv-hero-accent">your entire valet operation</span>
                  </h1>
                  <p className="iv-hero-sub">
                    From booking to completion — real-time tracking, automated payroll, CSI scoring and accounting integration. Every role has exactly what they need. No paper. No chasing.
                  </p>
                  <div className="iv-hero-actions">
                    <a href="#iv-contact" className="iv-btn iv-btn-primary">Request a Demo</a>
                    <a href="#iv-features" className="iv-btn iv-btn-outline">See all features</a>
                  </div>
                  <div className="iv-hero-proof">
                    <div className="iv-proof-item">
                      <span className="iv-proof-n">100%</span>
                      <span className="iv-proof-l">Paperless</span>
                    </div>
                    <div className="iv-proof-div"></div>
                    <div className="iv-proof-item">
                      <span className="iv-proof-n">Live</span>
                      <span className="iv-proof-l">Job tracking</span>
                    </div>
                    <div className="iv-proof-div"></div>
                    <div className="iv-proof-item">
                      <span className="iv-proof-n">Multi-site</span>
                      <span className="iv-proof-l">HQ to bay</span>
                    </div>
                  </div>
                </div>
                <div className="iv-hero-visual">
                  <div className="iv-dashboard-frame">
                    <div className="iv-frame-bar">
                      <div className="iv-frame-dots"><span></span><span></span><span></span></div>
                      <div className="iv-frame-url">app.ivaleter.co.uk</div>
                    </div>
                    <div className="iv-frame-body">
                      <div className="iv-frame-sidebar">
                        <div className="iv-frame-logo-block"></div>
                        <div className="iv-frame-nav iv-active"></div>
                        <div className="iv-frame-nav"></div>
                        <div className="iv-frame-nav"></div>
                        <div className="iv-frame-nav"></div>
                        <div className="iv-frame-nav"></div>
                        <div className="iv-frame-nav"></div>
                      </div>
                      <div className="iv-frame-main">
                        <div className="iv-frame-header">
                          <div className="iv-frame-title-block"></div>
                          <div className="iv-live-pill">● Live</div>
                        </div>
                        <div className="iv-frame-kpis">
                          <div className="iv-frame-kpi"><div className="iv-frame-kpi-n">24</div><div className="iv-frame-kpi-l">Jobs today</div></div>
                          <div className="iv-frame-kpi"><div className="iv-frame-kpi-n">18</div><div className="iv-frame-kpi-l">Complete</div></div>
                          <div className="iv-frame-kpi"><div className="iv-frame-kpi-n">4.8★</div><div className="iv-frame-kpi-l">Avg quality</div></div>
                          <div className="iv-frame-kpi"><div className="iv-frame-kpi-n">2.1d</div><div className="iv-frame-kpi-l">Avg prep</div></div>
                        </div>
                        <div className="iv-frame-jobs">
                          <div className="iv-frame-job">
                            <div className="iv-frame-reg">BD24 XYZ</div>
                            <div className="iv-frame-job-meta"><div></div><div></div></div>
                            <div className="iv-frame-badge iv-inprogress">In Progress</div>
                          </div>
                          <div className="iv-frame-job">
                            <div className="iv-frame-reg">EF73 ABC</div>
                            <div className="iv-frame-job-meta"><div></div><div></div></div>
                            <div className="iv-frame-badge iv-complete">Complete</div>
                          </div>
                          <div className="iv-frame-job">
                            <div className="iv-frame-reg">KL19 PQR</div>
                            <div className="iv-frame-job-meta"><div></div><div></div></div>
                            <div className="iv-frame-badge iv-priority">Priority</div>
                          </div>
                          <div className="iv-frame-job">
                            <div className="iv-frame-reg">MN55 DEF</div>
                            <div className="iv-frame-job-meta"><div></div><div></div></div>
                            <div className="iv-frame-badge iv-pending">Pending</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PROBLEM */}
          <section className="iv-problem">
            <div className="iv-container">
              <div className="iv-problem-inner">
                <div className="iv-problem-copy">
                  <p className="iv-eyebrow">Sound familiar?</p>
                  <h2>Running a valet operation on gut feel?</h2>
                  <p>Most dealership valet teams still rely on paper dockets, walkie-talkies and phone calls to track jobs. Sales managers physically walk the bay to find out if a car is ready. Disputes over pay take hours to resolve. Nothing joins up.</p>
                </div>
                <div className="iv-pain-list">
                  {[
                    "\"Walking laps just to find out if a car's ready\"",
                    "\"Chasing valeters for sign-off on paper dockets\"",
                    "\"Same vehicle booked in twice — duplicate jobs everywhere\"",
                    "\"No idea what we've spent on valeting until the invoice arrives\"",
                  ].map((text) => (
                    <div key={text} className="iv-pain-item">
                      <div className="iv-pain-icon-wrap">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      </div>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FEATURES */}
          <section className="iv-features" id="iv-features">
            <div className="iv-container">
              <div className="iv-section-head">
                <p className="iv-eyebrow">Platform features</p>
                <h2>Everything your operation needs.<br/>Nothing it doesn&apos;t.</h2>
                <p className="iv-section-sub">Click any feature to see a live screenshot and full breakdown.</p>
              </div>
              <div>

                <FeatureCards />
              </div>
            </div>
          </section>

          {/* PORTALS */}
          <section className="iv-portals" id="iv-portals">
            <div className="iv-container">
              <div className="iv-section-head">
                <p className="iv-eyebrow" style={{color:"#A8C5AC"}}>How it works</p>
                <h2>Three portals. One platform.<br/>Every role gets exactly what they need.</h2>
              </div>
              <div className="iv-portal-grid">
                <div className="iv-portal-card">
                  <div className="iv-portal-label">Dealer Portal</div>
                  <div className="iv-portal-role">Salespeople &amp; site staff</div>
                  <ul className="iv-portal-list">
                    <li>Book vehicles for valeting in seconds</li>
                    <li>See live job status — no phone calls needed</li>
                    <li>View before &amp; after photos of completed cars</li>
                    <li>Leave a quality rating when collecting</li>
                    <li>Flag vehicles with Do Not Clean</li>
                  </ul>
                  <div className="iv-portal-accent iv-orange"></div>
                </div>
                <div className="iv-portal-card iv-portal-card--featured">
                  <div className="iv-portal-label">Admin &amp; Head Office</div>
                  <div className="iv-portal-role">Managers, HQ, Super Admin</div>
                  <ul className="iv-portal-list">
                    <li>Assign valeters and manage the team</li>
                    <li>Full attendance, timesheet approval &amp; payroll</li>
                    <li>Cross-site reporting and Days in Prep analytics</li>
                    <li>Dealership contact log and notes</li>
                    <li>Broadcast messages and feedback pulse</li>
                  </ul>
                  <div className="iv-portal-accent iv-sage"></div>
                </div>
                <div className="iv-portal-card">
                  <div className="iv-portal-label">Valeter App</div>
                  <div className="iv-portal-role">Your valeting team, on any device</div>
                  <ul className="iv-portal-list">
                    <li>See today&apos;s jobs — sorted by priority</li>
                    <li>Search by reg number instantly</li>
                    <li>Take before photos, drop parking pin on completion</li>
                    <li>Submit timesheet and view pay history</li>
                    <li>Reply to team feedback pulses in one tap</li>
                  </ul>
                  <div className="iv-portal-accent iv-orange"></div>
                </div>
              </div>
            </div>
          </section>

          {/* COMPARE */}
          <section className="iv-compare" id="iv-compare">
            <div className="iv-container">
              <div className="iv-section-head">
                <p className="iv-eyebrow">Why iValeter</p>
                <h2>The only platform built for this.</h2>
                <p className="iv-section-sub">Every other tool treats valeting as an afterthought. iValeter was built from the ground up for UK dealership valet operations — nothing generic, nothing bolted on.</p>
              </div>
              <div className="iv-compare-table">
                <div className="iv-compare-col iv-compare-them">
                  <div className="iv-compare-col-head">Everyone else</div>
                  {["Valet buried in a DMS module nobody uses","No valeter mobile app — or one that crashes","No real-time bay visibility without hardware","Payroll done on spreadsheets","Zero CSI linkage to prep quality","No support for contractor + in-house valeters","No accounting integration — invoices emailed as PDFs","Before/after photos? Paper file or WhatsApp"].map(t=>(
                    <div key={t} className="iv-compare-item iv-bad">{t}</div>
                  ))}
                </div>
                <div className="iv-compare-col iv-compare-us">
                  <div className="iv-compare-col-head">iValeter</div>
                  {["Valet management is the whole platform","Mobile-first valeter portal — works on any device","Live job board, geofenced clock-in, no hardware","Automated payroll with direct banking export","Quality scores per job linked to CSI outcomes","Internal & external valeters managed together","Direct accounting software integration","Camera-based photo proof on every job"].map(t=>(
                    <div key={t} className="iv-compare-item iv-good">{t}</div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* INTEGRATIONS */}
          <section className="iv-integrations">
            <div className="iv-container">
              <p className="iv-eyebrow" style={{textAlign:"center"}}>Integrations</p>
              <h2>Connects to the tools you already use</h2>
              <div className="iv-chip-row">
                {[
                  { label: "Accounting Software", icon: <><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></> },
                  { label: "Samsara Fleet", icon: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></> },
                  { label: "Google Maps", icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></> },
                  { label: "Banking Export", icon: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></> },
                ].map(c=>(
                  <div key={c.label} className="iv-chip">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{c.icon}</svg>
                    {c.label}
                  </div>
                ))}
                {[
                  { label: "Outlook & SMS", icon: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></> },
                  { label: "Shopify", icon: <><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></> },
                ].map(c=>(
                  <div key={c.label} className="iv-chip iv-chip--soon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{c.icon}</svg>
                    {c.label}
                    <span className="iv-chip-tag">Soon</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="iv-cta-section" id="iv-contact">
            <div className="iv-container">
              <div className="iv-cta-inner">
                <div className="iv-cta-copy">
                  <p className="iv-eyebrow" style={{color:"#A8C5AC"}}>Get started</p>
                  <h2>Ready to run a smarter valet operation?</h2>
                  <p>Talk to us about your operation. We&apos;ll show you exactly how iValeter works — live, no slides, no fluff. We&apos;ll be in touch within one working day.</p>
                  <div className="iv-cta-trust">
                    {["Built for UK dealerships","Live on ivaleter.co.uk","No setup fee"].map(t=>(
                      <div key={t} className="iv-trust-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8C5AC" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="iv-cta-form-wrap">
                  <form className="iv-cta-form" id="iv-demoForm">
                    <input type="text" placeholder="Your name" className="iv-form-input" />
                    <input type="text" placeholder="Dealership or company name" className="iv-form-input" />
                    <input type="email" placeholder="Email address" className="iv-form-input" />
                    <input type="tel" placeholder="Phone number (optional)" className="iv-form-input" />
                    <button type="submit" className="iv-btn iv-btn-primary iv-btn-full">Request a Demo →</button>
                  </form>
                </div>
              </div>
            </div>
          </section>

        </main>

        {/* FOOTER */}
        <footer className="iv-footer">
          <div className="iv-container iv-footer-inner">
            <div>
              <a href="#" className="iv-logo" aria-label="iValeter">
                <svg width="26" height="26" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                  <rect width="34" height="34" rx="7" fill="#E8650A"/>
                  <path d="M10 9h4l5.5 11.5L25 9h4L20.5 26.5h-3L10 9z" fill="#F5F0E8"/>
                </svg>
                <span className="iv-logo-text">iValeter</span>
              </a>
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

      </div>

      {/* Client-side interactions */}
      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          // Mobile nav
          var toggle = document.getElementById('iv-mobileToggle');
          var menu   = document.getElementById('iv-mobileMenu');
          if (toggle && menu) {
            toggle.addEventListener('click', function() {
              menu.classList.toggle('iv-open');
              toggle.setAttribute('aria-label', menu.classList.contains('iv-open') ? 'Close menu' : 'Open menu');
            });
            menu.querySelectorAll('a').forEach(function(link) {
              link.addEventListener('click', function() { menu.classList.remove('iv-open'); });
            });
          }
          // Sticky nav shadow
          var nav = document.getElementById('iv-nav');
          if (nav) {
            window.addEventListener('scroll', function() {
              nav.style.boxShadow = window.scrollY > 20 ? '0 2px 12px rgba(28,26,22,0.10)' : '';
            }, { passive: true });
          }
          // Scroll-in animations
          if ('IntersectionObserver' in window) {
            document.querySelectorAll('.iv-feature-card, .iv-portal-card, .iv-pain-item, .iv-compare-item').forEach(function(el, i) {
              el.classList.add('iv-reveal');
              if (i % 3 === 1) el.classList.add('iv-reveal-delay-1');
              if (i % 3 === 2) el.classList.add('iv-reveal-delay-2');
            });
            var io = new IntersectionObserver(function(entries) {
              entries.forEach(function(e) {
                if (e.isIntersecting) { e.target.classList.add('iv-visible'); io.unobserve(e.target); }
              });
            }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
            document.querySelectorAll('.iv-reveal').forEach(function(el) { io.observe(el); });
          }
          // Demo form
          var form = document.getElementById('iv-demoForm');
          if (form) {
            form.addEventListener('submit', function(e) {
              e.preventDefault();
              var btn = form.querySelector('button[type="submit"]');
              var name = form.querySelector('input[type="text"]').value.trim();
              if (!name) { form.querySelector('input[type="text"]').focus(); return; }
              btn.textContent = "Request received — we'll be in touch";
              btn.disabled = true;
              btn.style.background = '#4A6B50';
              form.querySelectorAll('input').forEach(function(i) { i.disabled = true; });
            });
          }
        })();
      `}} />
    </>
  );
}
