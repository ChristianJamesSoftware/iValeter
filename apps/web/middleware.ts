import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { AUTH_COOKIE_NAME } from "@ivaleter/config";

const ROLE_PREFIX: Record<string, string> = {
  super_admin: "/admin",
  org_admin: "/org",
  dealership_user: "/dealership",
  valeter: "/valeter",
};

const PROTECTED_PREFIXES = ["/admin", "/org", "/dealership", "/valeter"];

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      role = (payload.role as string) ?? null;
    } catch {
      role = null;
    }
  }

  if (isProtected && !role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Logged-in users hitting /login go to their home.
  if (pathname === "/login" && role) {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_PREFIX[role] ?? "/";
    return NextResponse.redirect(url);
  }

  // Enforce role boundaries: a valeter cannot view /org, etc.
  // super_admin may traverse everything.
  if (isProtected && role && role !== "super_admin") {
    const allowed = ROLE_PREFIX[role];
    if (allowed && !pathname.startsWith(allowed)) {
      const url = req.nextUrl.clone();
      url.pathname = allowed;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/org/:path*", "/dealership/:path*", "/valeter/:path*"],
};
