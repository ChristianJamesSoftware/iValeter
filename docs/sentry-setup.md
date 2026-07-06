# Sentry Error Monitoring — Setup Guide

## 1. Create a Sentry project

1. Go to https://sentry.io → New Project → Next.js
2. Name it `ivaleter-web`
3. Copy the **DSN** from Project Settings → Client Keys

## 2. Set Railway environment variables

On the **web service** in Railway, add:

| Variable | Value | Required |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://xxx@oXXX.ingest.sentry.io/XXX` | Yes |
| `SENTRY_DSN` | Same as above | Yes (server-side) |
| `SENTRY_ORG` | Your Sentry org slug | Optional (source maps) |
| `SENTRY_PROJECT` | `ivaleter-web` | Optional (source maps) |
| `SENTRY_AUTH_TOKEN` | From Sentry → Settings → Auth Tokens | Optional (source maps) |

> Without `SENTRY_AUTH_TOKEN`, the app still reports errors — you just won't get
> readable stack traces. Add it later once the project is live.

## 3. What gets reported

- All unhandled React render errors (global-error.tsx + error.tsx)
- All tRPC `INTERNAL_SERVER_ERROR` exceptions (with procedure path tag)
- Unhandled promise rejections and fetch errors (client-side)
- Edge runtime errors (middleware)

## 4. What is filtered out

- `UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND` tRPC errors (expected)
- Offline queue network failures (tRPC 0-status errors)
- All errors in `NODE_ENV !== production` (dev noise suppressed)

## 5. Verify it's working

After deploying with `NEXT_PUBLIC_SENTRY_DSN` set, go to:
`https://www.ivaleter.co.uk/api/monitoring` — should return a 200.

In Sentry dashboard, you should see the project receive a "first event" 
within a few minutes of the first real error occurring.
