"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

const DEMO_ACCOUNTS = [
  { email: "admin@ivaleter.co.uk", password: "admin123", role: "Super Admin" },
  { email: "manager@totalvaleting.co.uk", password: "test123", role: "Manager" },
  {
    email: "dealer.arnold@totalvaleting.co.uk",
    password: "test123",
    role: "Dealer",
  },
  {
    email: "james.mitchell@totalvaleting.co.uk",
    password: "test123",
    role: "Valeter",
  },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 h-12 w-full rounded-lg bg-orange-500 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in →"}
    </button>
  );
}

export function LoginForm({ resetSuccess }: { resetSuccess?: boolean }) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const inputClass =
    "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-slate-400";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";

  return (
    <>
      {resetSuccess && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Password updated — sign in with your new password.
        </div>
      )}
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.co.uk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <div className="mt-1.5 text-right">
            <a
              href="/forgot-password"
              className="text-xs font-semibold text-orange-500 hover:text-orange-600"
            >
              Forgot password?
            </a>
          </div>
        </div>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <div className="mt-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Quick access
        </p>
        <ul className="space-y-1">
          {DEMO_ACCOUNTS.map((acc) => (
            <li key={acc.email}>
              <button
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword(acc.password);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50"
              >
                <span className="text-sm font-medium text-slate-700">
                  {acc.email}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {acc.role}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
