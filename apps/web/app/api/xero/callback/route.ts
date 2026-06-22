import { NextRequest, NextResponse } from "next/server";
import { handleXeroCallback } from "@ivaleter/api";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "org_admin" && session.role !== "super_admin")) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const xeroError = req.nextUrl.searchParams.get("error");

  if (xeroError) {
    return NextResponse.redirect(
      new URL(`/org/settings?tab=xero&error=${encodeURIComponent(xeroError)}`, process.env.NEXT_PUBLIC_APP_URL),
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/org/settings?tab=xero&error=Missing+authorisation+code", process.env.NEXT_PUBLIC_APP_URL),
    );
  }

  try {
    const redirectPath = await handleXeroCallback(code, state);
    return NextResponse.redirect(new URL(redirectPath, process.env.NEXT_PUBLIC_APP_URL));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Xero connection failed";
    return NextResponse.redirect(
      new URL(`/org/settings?tab=xero&error=${encodeURIComponent(message)}`, process.env.NEXT_PUBLIC_APP_URL),
    );
  }
}
