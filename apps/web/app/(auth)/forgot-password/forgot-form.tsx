"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { forgotPasswordAction, type ForgotPasswordState } from "./actions";

const initial: ForgotPasswordState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 h-12 w-full rounded-lg bg-orange-500 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send reset link →"}
    </button>
  );
}

export function ForgotForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initial);

  const inputClass =
    "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-slate-400";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";

  if (state.success) {
    return (
      <div className="rounded-xl bg-green-50 p-6 text-center">
        <p className="text-2xl">✓</p>
        <p className="mt-2 font-semibold text-green-800">Check your email</p>
        <p className="mt-1 text-sm text-green-700">
          If that address is registered, we&apos;ve sent a reset link. It expires in 1 hour.
        </p>
        <a
          href="/login"
          className="mt-4 inline-block text-sm font-semibold text-orange-500 hover:text-orange-600"
        >
          ← Back to sign in
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelClass}>
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.co.uk"
          className={inputClass}
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-sm text-slate-500">
        <a href="/login" className="font-semibold text-orange-500 hover:text-orange-600">
          ← Back to sign in
        </a>
      </p>
    </form>
  );
}
