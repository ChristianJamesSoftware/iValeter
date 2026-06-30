import { ForgotForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* Left panel */}
      <section className="flex flex-col justify-between bg-slate-900 p-10 lg:w-1/2 lg:p-12">
        <div>
          <a href="/login">
            <span className="font-heading text-4xl font-black tracking-tight">
              <span className="text-orange-500">i</span>
              <span className="text-white">Valeter</span>
            </span>
          </a>
          <div className="mt-3 h-0.5 w-8 bg-orange-500" />
        </div>
        <div className="py-16">
          <h1 className="font-heading text-5xl font-black leading-none tracking-tight text-white">
            Forgot
            <br />
            your
            <br />
            password?
          </h1>
          <p className="mt-4 max-w-xs text-sm text-slate-400">
            No problem. Enter your email and we&apos;ll send you a secure reset link.
          </p>
        </div>
        <div />
      </section>

      {/* Right panel */}
      <section className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="font-heading text-2xl font-black text-slate-900">
            Reset your password
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter the email address on your account.
          </p>
          <div className="mt-8">
            <ForgotForm />
          </div>
        </div>
      </section>
    </main>
  );
}
