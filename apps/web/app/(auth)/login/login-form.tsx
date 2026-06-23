"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

const DEMO_ACCOUNTS = [
  { email: "admin@ivaleter.co.uk", password: "admin123" },
  { email: "manager@totalvaleting.co.uk", password: "test123" },
  { email: "dealer.arnold@totalvaleting.co.uk", password: "test123" },
  { email: "james.mitchell@totalvaleting.co.uk", password: "test123" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 h-11 w-full rounded-lg bg-slate-900 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const inputClass =
    "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400";

  return (
    <>
      <form action={formAction} className="mt-2 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-700"
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-700"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Demo accounts
        </p>
        <ul className="space-y-1.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <li key={acc.email}>
              <button
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword(acc.password);
                }}
                className="flex w-full items-center justify-between rounded-md px-1 py-0.5 text-left transition-colors hover:bg-slate-100"
              >
                <span className="text-sm text-slate-700">{acc.email}</span>
                <span className="font-mono text-xs text-slate-400">
                  {acc.password}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
