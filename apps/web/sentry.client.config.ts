/**
 * Sentry — client-side config
 * Initialises error tracking in the browser (React component errors,
 * unhandled promise rejections, fetch errors).
 *
 * SENTRY_DSN must be set as a Railway env var (NEXT_PUBLIC_SENTRY_DSN).
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only run in production — no noise during local dev
  enabled: process.env.NODE_ENV === "production",

  // Sample 100% of errors but only 5% of performance traces
  tracesSampleRate: 0.05,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? undefined,

  // Don't send errors from valeter offline queue retries
  beforeSend(event) {
    // Suppress background-sync noise
    const msg = event.exception?.values?.[0]?.value ?? "";
    if (msg.includes("tRPC") && msg.includes("failed: 0")) return null;
    return event;
  },
});
