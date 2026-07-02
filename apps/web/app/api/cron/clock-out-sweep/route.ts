/**
 * Auto Clock-Out Sweep
 *
 * Runs nightly at 19:00 UTC (called by Railway cron).
 * Finds every valeter who clocked IN today but has no CLOCK_OUT.
 * Creates a CLOCK_OUT event stamped at their contracted finish time
 * (shiftEndTime, e.g. "17:00") — NOT at 19:00 — so payroll reflects
 * their actual scheduled hours.
 *
 * Secured by CRON_SECRET header.
 */

import { NextResponse } from "next/server";
import { prisma } from "@ivaleter/db";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret") ?? "";
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  // ── 1. All CLOCK_IN events today ──────────────────────────────────────────
  const clockInsToday = await prisma.clockEvent.findMany({
    where: { type: "CLOCK_IN", timestamp: { gte: todayStart, lte: now } },
    select: { id: true, userId: true, siteId: true, timestamp: true },
  });

  // ── 2. All CLOCK_OUT user IDs today ───────────────────────────────────────
  const clockOutsToday = await prisma.clockEvent.findMany({
    where: { type: "CLOCK_OUT", timestamp: { gte: todayStart, lte: now } },
    select: { userId: true },
  });
  const clockedOutUserIds = new Set(clockOutsToday.map((e) => e.userId));

  // ── 3. Deduplicate clock-ins by userId (keep latest) ─────────────────────
  const latestByUser = new Map<string, { userId: string; siteId: string; timestamp: Date }>();
  for (const e of clockInsToday) {
    const existing = latestByUser.get(e.userId);
    if (!existing || e.timestamp > existing.timestamp) {
      latestByUser.set(e.userId, { userId: e.userId, siteId: e.siteId, timestamp: e.timestamp });
    }
  }

  // ── 4. Filter to those still clocked in ───────────────────────────────────
  const openUserIds = [...latestByUser.keys()].filter((uid) => !clockedOutUserIds.has(uid));

  if (openUserIds.length === 0) {
    return NextResponse.json({ swept: 0, message: "No open clock-ins found" });
  }

  // ── 5. Fetch user schedule data ───────────────────────────────────────────
  const users = await prisma.user.findMany({
    where: { id: { in: openUserIds }, isActive: true, siteId: { not: null } },
    select: { id: true, siteId: true, shiftEndTime: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // ── 6. Create CLOCK_OUT at contracted finish time ─────────────────────────
  const swept: { userId: string; clockOutAt: string; shiftEndTime: string }[] = [];
  const errors: { userId: string; error: string }[] = [];

  const sweepCap = new Date(todayStart);
  sweepCap.setUTCHours(19, 0, 0, 0);

  for (const userId of openUserIds) {
    const user = userMap.get(userId);
    if (!user || !user.siteId) continue; // inactive or no site — skip

    try {
      const rawEnd = user.shiftEndTime ?? "17:00";
      const [hhStr, mmStr] = rawEnd.split(":");
      const hh = parseInt(hhStr ?? "17", 10);
      const mm = parseInt(mmStr ?? "0",  10);

      const clockOutAt = new Date(todayStart);
      clockOutAt.setUTCHours(hh, mm, 0, 0);

      // Never record a clock-out after 19:00 sweep cap
      const effective = clockOutAt > sweepCap ? sweepCap : clockOutAt;

      await prisma.clockEvent.create({
        data: {
          userId,
          siteId:            user.siteId,
          type:              "CLOCK_OUT",
          timestamp:         effective,
          lat:               null,
          lng:               null,
          geofenceTriggered: false,
        },
      });

      swept.push({ userId, clockOutAt: effective.toISOString(), shiftEndTime: rawEnd });
    } catch (err) {
      errors.push({ userId, error: String(err) });
    }
  }

  console.log(
    `[clock-out-sweep] ${now.toISOString()} — swept ${swept.length}, errors ${errors.length}`,
    errors.length > 0 ? errors : "",
  );

  return NextResponse.json({
    swept:   swept.length,
    errors:  errors.length,
    details: swept,
    ...(errors.length > 0 && { errorDetails: errors }),
  });
}

export async function GET(req: Request) {
  return POST(req);
}
