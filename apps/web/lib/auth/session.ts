import { cookies } from "next/headers";
import {
  verifySessionToken,
  createSessionToken,
  type SessionPayload,
} from "@ivaleter/api";
import { AUTH_COOKIE_NAME, JWT_EXPIRY_SECONDS } from "@ivaleter/config";

export const IMPERSONATION_COOKIE_NAME = "impersonating_user";

/**
 * Read and verify the session from the request cookie (server-side).
 *
 * If the real user is a super_admin and an impersonation cookie is present,
 * the impersonated user's session is returned instead — so the whole app
 * behaves as that user until impersonation is stopped.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const real = await verifySessionToken(token);
  if (!real) return null;

  if (real.role === "super_admin") {
    const impToken = store.get(IMPERSONATION_COOKIE_NAME)?.value;
    if (impToken) {
      const impersonated = await verifySessionToken(impToken);
      if (impersonated) return impersonated;
    }
  }
  return real;
}

/** Returns impersonation context for the banner, or null when not active. */
export async function getImpersonation(): Promise<{
  real: SessionPayload;
  impersonated: SessionPayload;
} | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const real = await verifySessionToken(token);
  if (!real || real.role !== "super_admin") return null;
  const impToken = store.get(IMPERSONATION_COOKIE_NAME)?.value;
  if (!impToken) return null;
  const impersonated = await verifySessionToken(impToken);
  if (!impersonated) return null;
  return { real, impersonated };
}

/** The genuine signed-in user, ignoring any active impersonation. */
export async function getRealSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: JWT_EXPIRY_SECONDS,
  });
}

export async function setImpersonationCookie(
  payload: SessionPayload,
): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(IMPERSONATION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: JWT_EXPIRY_SECONDS,
  });
}

export async function clearImpersonationCookie(): Promise<void> {
  const store = await cookies();
  store.delete(IMPERSONATION_COOKIE_NAME);
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(AUTH_COOKIE_NAME);
  store.delete(IMPERSONATION_COOKIE_NAME);
}
