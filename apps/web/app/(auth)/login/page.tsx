import { LoginForm } from "./login-form";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function LoginPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4"
      style={{
        backgroundImage:
          "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="text-center">
            <BrandLogo className="text-2xl" />
            <p className="mb-6 mt-1 text-sm text-slate-500">
              Dealership valeting, perfectly managed.
            </p>
          </div>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          © 2026 Total Valeting · iValeter
        </p>
      </div>
    </main>
  );
}
