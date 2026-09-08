/**
 * Auto-Approve Timesheets Cron
 *
 * Runs every hour via Railway cron.
 * Finds all timesheets that were sent to the customer (sentToCustomerAt set)
 * more than 4 hours ago with no response, and marks them customer-accepted.
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

  const result = await prisma.timesheet.updateMany({
    where: {
      sentToCustomerAt: { not: null, lte: cutoff },
      customerAccepted: false,
      status: { notIn: ["APPROVED", "DISPUTED", "LOCKED"] },
    },
    data: {
      customerAccepted: true,
      autoAccepted: true,
      customerAcceptedAt: new Date(),
      status: "APPROVED",
    },
  });

  console.log(
    `[auto-approve-timesheets] ${new Date().toISOString()} — auto-approved ${result.count} timesheet(s)`,
  );

  return NextResponse.json({ autoApproved: result.count });
}

export async function GET(req: Request) {
  return POST(req);
}
