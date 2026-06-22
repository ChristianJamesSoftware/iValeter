"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 h-12 w-full rounded-lg bg-cyan font-heading font-semibold text-navy transition hover:bg-cyan-600 disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-navy"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.co.uk"
          className="h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-navy"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
