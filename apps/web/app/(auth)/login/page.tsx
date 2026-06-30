import { LoginForm } from "./login-form";

interface Props {
  searchParams: Promise<{ reset?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { reset } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* Left panel — dark, sells the product */}
      <section className="flex flex-col justify-between bg-slate-900 p-10 lg:w-1/2 lg:p-12">
        <div>
          <span className="font-heading text-4xl font-black tracking-tight">
            <span className="text-orange-500">i</span>
            <span className="text-white">Valeter</span>
          </span>
          <div className="mt-3 h-0.5 w-8 bg-orange-500" />
        </div>

        <div className="py-16">
          <h1 className="font-heading text-5xl font-black leading-none tracking-tight text-white">
            The bay,
            <br />
            perfectly
            <br />
            managed.
          </h1>
          <p className="mt-4 max-w-xs text-sm text-slate-400">
            Real-time job tracking. Automated payroll. Zero paper.
          </p>
        </div>

        <div className="flex items-stretch gap-6">
          {[
            { value: "247", label: "Jobs this week" },
            { value: "12", label: "Sites online" },
            { value: "98%", label: "On-time rate" },
          ].map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-6">
              {i > 0 && <div className="h-10 w-px bg-slate-700" />}
              <div>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Right panel — white, the form */}
      <section className="flex flex-1 flex-col justify-center bg-white p-10 lg:p-12">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="font-heading text-3xl font-black tracking-tight text-slate-900">
            Welcome back.
          </h2>
          <p className="mb-8 mt-1 text-sm text-slate-500">
            Sign in to your account
          </p>
          <LoginForm resetSuccess={reset === "1"} />
        </div>
      </section>
    </main>
  );
}
