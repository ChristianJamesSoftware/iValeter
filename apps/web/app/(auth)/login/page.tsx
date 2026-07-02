import { LoginForm } from "./login-form";
import { prisma } from "@ivaleter/db";

interface Props {
  searchParams: Promise<{ reset?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { reset } = await searchParams;

  // Fetch TV logo from platform config (unauthenticated — login page is public)
  const tvLogoRow = await prisma.platformConfig.findUnique({ where: { key: "TV_LOGO_URL" } }).catch(() => null);
  const tvLogoUrl = tvLogoRow?.value ?? null;

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">

      {/* ── Left panel — brand statement ────────────────────── */}
      <section
        className="relative flex flex-col justify-between overflow-hidden lg:w-[55%]"
        style={{ background: "linear-gradient(160deg, #f5f3ef 0%, #ede9e1 55%, #f0ece4 100%)" }}
      >
        {/* Gold glow — top-right */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full opacity-[0.25]"
          style={{ background: "radial-gradient(circle, #c8a96e 0%, transparent 70%)" }}
        />
        {/* Gold glow — bottom-left */}
        <div
          className="pointer-events-none absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full opacity-[0.15]"
          style={{ background: "radial-gradient(circle, #c8a96e 0%, transparent 70%)" }}
        />

        {/* Subtle line texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 8px)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full min-h-screen p-10 lg:p-14">

          {/* Logo */}
          <div>
            <div className="flex items-center gap-3">
              {tvLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tvLogoUrl}
                  alt="Total Valeting"
                  className="h-12 max-w-[180px] object-contain"
                />
              ) : (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c8a96e]">
                    <span className="text-sm font-black text-white tracking-tight">iV</span>
                  </div>
                  <span className="text-xl font-black tracking-tight text-slate-900">
                    iValeter
                  </span>
                </>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-px w-6 bg-[#b8945a]" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#b8945a]">
                Professional Detailing Management
              </span>
            </div>
          </div>

          {/* Hero copy */}
          <div className="py-12 lg:py-0">
            <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[#b8945a]">
              Powered by Autoglym Professional
            </p>
            <h1
              className="text-5xl font-black leading-[1.05] tracking-tight text-slate-900 lg:text-6xl xl:text-7xl"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Precision.
              <br />
              <span style={{ color: "#c8a96e" }}>Every</span>
              <br />
              Detail.
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-slate-500">
              The complete operations platform for professional valeting teams.
              Real-time job tracking, automated scheduling, and full site visibility —
              built for dealerships that demand the best.
            </p>

            {/* Feature pills */}
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                "Live Job Tracking",
                "Multi-Site Management",
                "Timesheet Automation",
                "Quality Audits",
              ].map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-slate-300 bg-white/60 px-3 py-1 text-[11px] font-medium text-slate-500"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div className="border-t border-slate-200 pt-8">
            <div className="flex gap-8">
              {[
                { value: "247", label: "Jobs this week" },
                { value: "12", label: "Sites online" },
                { value: "98%", label: "On-time rate" },
              ].map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-8">
                  {i > 0 && <div className="h-8 w-px bg-slate-200" />}
                  <div>
                    <p
                      className="text-2xl font-black text-slate-900"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Right panel — sign-in form ─────────────────────────────────── */}
      <section className="flex flex-1 flex-col justify-center bg-white p-10 lg:p-14">
        <div className="mx-auto w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c8a96e]">
              <span className="text-xs font-black text-white">iV</span>
            </div>
            <span className="text-lg font-black text-slate-900">iValeter</span>
          </div>

          <h2
            className="text-3xl font-black tracking-tight text-slate-900"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Welcome back.
          </h2>
          <p className="mt-2 mb-8 text-sm text-slate-400">
            Sign in to your workspace
          </p>

          <LoginForm resetSuccess={reset === "1"} />
        </div>
      </section>

    </main>
  );
}
