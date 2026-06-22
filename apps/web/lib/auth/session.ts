import { cookies } from "next/headers";
import {
  verifySessionToken,
  createSessionToken,
  type SessionPayload,
} from "@ivaleter/api";
import { AUTH_COOKIE_NAME, JWT_EXPIRY_SECONDS } from "@ivaleter/config";

/** Read and verify the session from the request cookie (server-side). */
export async function getSession(): Promise<SessionPayload | null> {
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

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(AUTH_COOKIE_NAME);
}
