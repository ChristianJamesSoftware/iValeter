import { LoginForm } from "./login-form";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col bg-offwhite md:flex-row">
      {/* Brand panel */}
      <div className="flex flex-col justify-between bg-navy p-8 text-white md:w-1/2 md:p-12">
        <BrandLogo className="text-2xl" />
        <div className="hidden md:block">
          <h1 className="font-heading text-4xl font-bold leading-tight">
            Dealership valeting,
            <br />
            <span className="text-cyan">perfectly managed.</span>
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Real-time job tracking across every site, every department, every
            valeter — built for teams that move fast.
          </p>
        </div>
        <p className="hidden text-sm text-white/40 md:block">
          © {new Date().getFullYear()} Total Valeting · ivaleter.co.uk
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 md:hidden">
            <BrandLogo dark className="text-2xl" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-navy">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-slate">
            Welcome back. Enter your details to continue.
          </p>
          <LoginForm />
          <div className="mt-8 rounded-lg border border-line bg-white p-4 text-xs text-slate">
            <p className="font-semibold text-navy">Demo accounts</p>
            <ul className="mt-2 space-y-1">
              <li>admin@ivaleter.co.uk · admin123</li>
              <li>manager@totalvaleting.co.uk · test123</li>
              <li>dealer.arnold@totalvaleting.co.uk · test123</li>
              <li>james.mitchell@totalvaleting.co.uk · test123</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
