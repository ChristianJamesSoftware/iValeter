/**
 * Auto-Accept Site Submissions Cron
 *
 * Runs every hour via Railway cron.
 * Finds all SiteWeekSubmissions that have been SENT to the dealer
 * for more than 4 hours with no response, and marks them AUTO_ACCEPTED.
 *
 * Secured by CRON_SECRET header.
 */

import { NextResponse } from "next/server";
import { prisma } from "@ivaleter/db";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret") ?? "";
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago

  const result = await prisma.siteWeekSubmission.updateMany({
    where: {
      status: "SENT",
      sentAt: { lte: cutoff },
    },
    data: {
      status: "AUTO_ACCEPTED",
      autoAcceptedAt: new Date(),
      dealerRespondedAt: new Date(),
    },
  });

  console.log(
    `[auto-accept-submissions] ${new Date().toISOString()} — auto-accepted ${result.count} submission(s)`,
  );

  return NextResponse.json({ autoAccepted: result.count });
}

export async function GET(req: Request) {
  return POST(req);
}
