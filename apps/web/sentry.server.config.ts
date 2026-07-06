/**
 * Sentry — server-side config
 * Captures errors from API routes, tRPC procedures, and server actions.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === "production",

  tracesSampleRate: 0.05,

  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? undefined,

  // Ignore expected auth errors — not actionable
  ignoreErrors: [
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
  ],
});
