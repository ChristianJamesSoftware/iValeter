import { z } from "zod";
import { dealershipProcedure, orgAdminProcedure, router } from "../trpc";
import type { Prisma } from "@ivaleter/db";

/**
 * Reporting router — customer/dealership-facing.
 * All queries are scoped to the session's org + site.
 */
export const reportsRouter = router({
  /**
   * Summary report: total bookings and breakdown by service type
   * for a given date range.
   */
  summary: dealershipProcedure
    .input(
      z.object({
        siteId: z.string().optional(),
        dateFrom: z.date(),
        dateTo: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.BookingWhereInput = {
        organisationId: ctx.session.organisationId,
        readyByTime: { gte: input.dateFrom, lte: input.dateTo },
        status: { not: "CANCELLED" },
      };

      // Scope to site
      const siteId =
        input.siteId ??
        (ctx.session.role === "dealership_user" ? ctx.session.siteId ?? undefined : undefined);
      if (siteId) where.siteId = siteId;

      const bookings = await ctx.prisma.booking.findMany({
        where,
        include: {
          serviceType: { select: { id: true, name: true, durationMins: true, category: true } },
          department: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
        },
        orderBy: { readyByTime: "asc" },
      });

      // Aggregate by department
      const byDept: Record<
        string,
        { deptId: string; deptName: string; count: number; totalMins: number; services: Record<string, { name: string; count: number; totalMins: number }> }
      > = {};

      for (const b of bookings) {
        const deptId = b.department.id;
        const deptName = b.department.name;
        if (!byDept[deptId]) {
          byDept[deptId] = { deptId, deptName, count: 0, totalMins: 0, services: {} };
        }
        byDept[deptId].count += 1;
        byDept[deptId].totalMins += b.serviceType.durationMins;

        const stId = b.serviceType.id;
        if (!byDept[deptId].services[stId]) {
          byDept[deptId].services[stId] = { name: b.serviceType.name, count: 0, totalMins: 0 };
        }
        byDept[deptId].services[stId].count += 1;
        byDept[deptId].services[stId].totalMins += b.serviceType.durationMins;
      }

      const completedCount = bookings.filter((b) => b.status === "COMPLETED").length;

      return {
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        totalBookings: bookings.length,
        completedBookings: completedCount,
        totalValetMins: bookings.reduce((s, b) => s + b.serviceType.durationMins, 0),
        departments: Object.values(byDept).map((d) => ({
          ...d,
          services: Object.values(d.services),
        })),
        // Full list for CSV export
        bookingsList: bookings.map((b) => ({
          id: b.id,
          vehicleReg: b.vehicleReg,
          customerName: b.customerName,
          serviceType: b.serviceType.name,
          department: b.department.name,
          site: b.site.name,
          status: b.status,
          durationMins: b.serviceType.durationMins,
          readyByTime: b.readyByTime,
        })),
      };
    }),

  /**
   * Actual valet durations estimated from ClockEvent pairs.
   * Groups by service type and vehicle size.
   *
   * - org_admin: can pass any siteId, or omit for all sites
   * - dealership_user (site manager): locked to their own site
   */
  valetTimings: dealershipProcedure
    .input(
      z.object({
        siteId: z.string().optional(),
        dateFrom: z.date(),
        dateTo: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const isOrgAdmin =
        ctx.session.role === "super_admin" || ctx.session.role === "org_admin";

      const siteIdFilter: string | undefined = isOrgAdmin
        ? input.siteId
        : (ctx.session.siteId ?? undefined);

      const completedBookings = await ctx.prisma.booking.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          ...(siteIdFilter ? { siteId: siteIdFilter } : {}),
          status: "COMPLETED",
          completedAt: { not: null, gte: input.dateFrom, lte: input.dateTo },
          assignedToId: { not: null },
        },
        include: {
          serviceType: {
            select: { id: true, name: true, durationMins: true, category: true },
          },
          site: { select: { id: true, name: true } },
        },
      });

      if (completedBookings.length === 0) return { sites: [], serviceTypes: [] };

      // Fetch clock events for assigned valeters in range
      const valeterIds = [...new Set(completedBookings.map((b) => b.assignedToId!))];
      const clockEvents = await ctx.prisma.clockEvent.findMany({
        where: {
          userId: { in: valeterIds },
          ...(siteIdFilter ? { siteId: siteIdFilter } : {}),
          timestamp: { gte: input.dateFrom, lte: input.dateTo },
        },
        orderBy: { timestamp: "asc" },
      });

      // Pair CLOCK_IN / CLOCK_OUT per valeter per day → total clocked mins
      const clockedMinsByUserDate = new Map<string, number>();
      const eventsByUserDate = new Map<string, typeof clockEvents>();
      for (const ev of clockEvents) {
        // Key on timestamp date (the actual shift day), not createdAt
        const k = `${ev.userId}:${ev.timestamp.toISOString().slice(0, 10)}`;
        if (!eventsByUserDate.has(k)) eventsByUserDate.set(k, []);
        eventsByUserDate.get(k)!.push(ev);
      }
      for (const [k, evs] of eventsByUserDate) {
        let pendingIn: Date | null = null;
        let total = 0;
        // Sort by timestamp to ensure correct pairing
        const sorted = [...evs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        for (const ev of sorted) {
          if (ev.type === "CLOCK_IN") {
            pendingIn = ev.timestamp;
          } else if (ev.type === "CLOCK_OUT" && pendingIn) {
            const mins = Math.round((ev.timestamp.getTime() - pendingIn.getTime()) / 60000);
            if (mins > 0 && mins < 720) total += mins;
            pendingIn = null;
          }
        }
        if (total > 0) clockedMinsByUserDate.set(k, total);
      }

      // Count bookings per valeter per day for pro-rata split
      // Key must match the clock event key (timestamp date)
      const bookingsPerUserDate = new Map<string, number>();
      for (const b of completedBookings) {
        const k = `${b.assignedToId!}:${b.completedAt!.toISOString().slice(0, 10)}`;
        bookingsPerUserDate.set(k, (bookingsPerUserDate.get(k) ?? 0) + 1);
      }

      type SizeKey = "SMALL" | "MEDIUM" | "LARGE" | "XL" | "VAN" | "UNKNOWN";
      type SizeCell = { count: number; totalActualMins: number; avgActualMins: number };
      type ServiceAgg = {
        serviceTypeId: string;
        serviceTypeName: string;
        allocMins: number;
        avgActualMins: number;
        count: number;
        bySize: Record<SizeKey, SizeCell>;
      };
      const byService = new Map<string, ServiceAgg>();
      const emptySize = (): SizeCell => ({ count: 0, totalActualMins: 0, avgActualMins: 0 });
      const emptySizes = (): Record<SizeKey, SizeCell> => ({
        SMALL: emptySize(), MEDIUM: emptySize(), LARGE: emptySize(),
        XL: emptySize(), VAN: emptySize(), UNKNOWN: emptySize(),
      });

      type SiteAgg = { siteId: string; siteName: string; totalBookings: number; avgActualMins: number };
      const bySite = new Map<string, SiteAgg>();

      for (const b of completedBookings) {
        const dayKey = `${b.assignedToId!}:${b.completedAt!.toISOString().slice(0, 10)}`;
        const clockedMins = clockedMinsByUserDate.get(dayKey) ?? 0;
        const bookingCount = bookingsPerUserDate.get(dayKey) ?? 1;
        const estimatedMins = clockedMins > 0 ? Math.round(clockedMins / bookingCount) : 0;

        const stId = b.serviceType.id;
        if (!byService.has(stId)) {
          byService.set(stId, {
            serviceTypeId: stId,
            serviceTypeName: b.serviceType.name,
            allocMins: b.serviceType.durationMins,
            avgActualMins: 0,
            count: 0,
            bySize: emptySizes(),
          });
        }
        const agg = byService.get(stId)!;
        if (estimatedMins > 0) {
          // Running average: accumulate then divide at the end
          agg.avgActualMins =
            Math.round((agg.avgActualMins * agg.count + estimatedMins) / (agg.count + 1));
          agg.count += 1;
          const sizeKey = ((b.vehicleSize as SizeKey | null) ?? "UNKNOWN");
          const cell = agg.bySize[sizeKey];
          cell.totalActualMins += estimatedMins;
          cell.count += 1;
          cell.avgActualMins = Math.round(cell.totalActualMins / cell.count);
        }

        const sId = b.site.id;
        if (!bySite.has(sId)) {
          bySite.set(sId, { siteId: sId, siteName: b.site.name, totalBookings: 0, avgActualMins: 0 });
        }
        const sa = bySite.get(sId)!;
        sa.totalBookings += 1;
        if (estimatedMins > 0) {
          sa.avgActualMins = Math.round(
            (sa.avgActualMins * (sa.totalBookings - 1) + estimatedMins) / sa.totalBookings,
          );
        }
      }

      return {
        sites: Array.from(bySite.values()),
        serviceTypes: Array.from(byService.values()),
      };
    }),

  /**
   * HQ-only: cross-site summary — completed bookings, allocated mins vs cap.
   */
  valetTimingsAllSites: orgAdminProcedure
    .input(z.object({ dateFrom: z.date(), dateTo: z.date() }))
    .query(async ({ ctx, input }) => {
      const allSites = await ctx.prisma.site.findMany({
        where: { organisationId: ctx.session.organisationId },
        select: { id: true, name: true },
      });

      const bookings = await ctx.prisma.booking.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          status: "COMPLETED",
          readyByTime: { gte: input.dateFrom, lte: input.dateTo },
        },
        include: { serviceType: { select: { durationMins: true } }, site: { select: { id: true, name: true } } },
      });

      const DAILY_CAP = 480;
      type SS = { siteId: string; siteName: string; completed: number; totalAllocMins: number; overAllocDays: number };
      const map = new Map<string, SS>();
      for (const s of allSites) {
        map.set(s.id, { siteId: s.id, siteName: s.name, completed: 0, totalAllocMins: 0, overAllocDays: 0 });
      }

      const dailyMins = new Map<string, number>();
      for (const b of bookings) {
        const ss = map.get(b.site.id);
        if (!ss) continue;
        ss.completed += 1;
        ss.totalAllocMins += b.serviceType.durationMins;
        const dk = `${b.site.id}:${b.readyByTime.toISOString().slice(0, 10)}`;
        dailyMins.set(dk, (dailyMins.get(dk) ?? 0) + b.serviceType.durationMins);
      }
      for (const [dk, mins] of dailyMins) {
        if (mins > DAILY_CAP) {
          const siteId = dk.split(":")[0]!;
          const ss = map.get(siteId);
          if (ss) ss.overAllocDays += 1;
        }
      }

      return Array.from(map.values());
    }),
});
