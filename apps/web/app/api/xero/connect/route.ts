import { NextResponse } from "next/server";
import { buildXeroAuthUrl } from "@ivaleter/api";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "org_admin" && session.role !== "super_admin")) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }
  try {
    const url = await buildXeroAuthUrl(session.organisationId);
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Xero connect failed";
    return NextResponse.redirect(
      new URL(`/org/settings?tab=xero&error=${encodeURIComponent(message)}`, process.env.NEXT_PUBLIC_APP_URL),
    );
  }
}
