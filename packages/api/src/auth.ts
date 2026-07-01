import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role } from "@ivaleter/db";
import { getServerEnv, JWT_EXPIRY_SECONDS } from "@ivaleter/config";

export interface SessionPayload {
  userId: string;
  organisationId: string;
  siteId: string | null;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getServerEnv().JWT_SECRET);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: payload.userId as string,
      organisationId: payload.organisationId as string,
      siteId: (payload.siteId as string | null) ?? null,
      role: payload.role as Role,
      email: payload.email as string,
      firstName: payload.firstName as string,
      lastName: payload.lastName as string,
    };
  } catch {
    return null;
  }
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

/** Default landing route for each role after login. */
export function roleHomePath(role: Role): string {
  switch (role) {
    case "super_admin":
      return "/admin";
    case "org_admin":
      return "/org";
    case "dealership_user":
      return "/dealership";
    case "valeter":
      return "/valeter";
    case "management":
      return "/admin";
    default:
      return "/admin";
  }
}
