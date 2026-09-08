import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// BUILD_ID is injected by Railway/Next.js at build time
const BUILD_ID = process.env.RAILWAY_DEPLOYMENT_ID ??
  process.env.NEXT_PUBLIC_BUILD_ID ??
  process.env.BUILD_ID ??
  "dev";

export function GET() {
  return NextResponse.json({ status: "ok", service: "ivaleter-web", build: BUILD_ID });
}
