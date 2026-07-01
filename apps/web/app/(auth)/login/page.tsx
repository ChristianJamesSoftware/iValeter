import { LoginForm } from "./login-form";

interface Props {
  searchParams: Promise<{ reset?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { reset } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">

      {/* ── Left panel — immersive brand statement ────────────────────── */}
      <section
        className="relative flex flex-col justify-between overflow-hidden lg:w-[55%]"
        style={{ background: "linear-gradient(160deg, #0a0a0a 0%, #111318 55%, #0d1117 100%)" }}
      >
        {/* Subtle gloss sweep — top-right */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #c8a96e 0%, transparent 70%)" }}
        />
        {/* Bottom-left glow */}
        <div
          className="pointer-events-none absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #c8a96e 0%, transparent 70%)" }}
        />

        {/* Fine horizontal rule texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 8px)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full min-h-screen p-10 lg:p-14">

          {/* Logo */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c8a96e]">
                <span className="text-sm font-black text-black tracking-tight">iV</span>
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                iValeter
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-px w-6 bg-[#c8a96e]" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#c8a96e]">
                Professional Detailing Management
              </span>
            </div>
          </div>

          {/* Hero copy */}
          <div className="py-12 lg:py-0">
            <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[#c8a96e]">
              Powered by Autoglym Professional
            </p>
            <h1
              className="text-5xl font-black leading-[1.05] tracking-tight text-white lg:text-6xl xl:text-7xl"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Precision.
              <br />
              <span style={{ color: "#c8a96e" }}>Every</span>
              <br />
              Detail.
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/50">
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
                  className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-white/40"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div className="border-t border-white/[0.07] pt-8">
            <div className="flex gap-8">
              {[
                { value: "247", label: "Jobs this week" },
                { value: "12", label: "Sites online" },
                { value: "98%", label: "On-time rate" },
              ].map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-8">
                  {i > 0 && <div className="h-8 w-px bg-white/[0.08]" />}
                  <div>
                    <p
                      className="text-2xl font-black text-white"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/30">
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
      <section className="flex flex-1 flex-col justify-center bg-[#0f1014] p-10 lg:p-14">
        <div className="mx-auto w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c8a96e]">
              <span className="text-xs font-black text-black">iV</span>
            </div>
            <span className="text-lg font-black text-white">iValeter</span>
          </div>

          <h2
            className="text-3xl font-black tracking-tight text-white"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Welcome back.
          </h2>
          <p className="mt-2 mb-8 text-sm text-white/40">
            Sign in to your workspace
          </p>

          <LoginForm resetSuccess={reset === "1"} dark />
        </div>
      </section>

    </main>
  );
}
