import { z } from "zod";
import { dealershipProcedure, orgAdminProcedure, router } from "../trpc";
// orgAdminProcedure used for daysInPrep below
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

  /**
   * Manager Report — site-scoped KPIs for dealership site managers.
   * Includes completed valets by department, today's capacity utilisation,
   * 7-day over-allocation forecast, and a full booking list for CSV export.
   */
  managerReport: dealershipProcedure
    .input(
      z.object({
        siteId: z.string(),
        dateFrom: z.date(),
        dateTo: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const DAILY_CAP = 480;

      // D. Site info
      const siteData = await ctx.prisma.site.findUnique({
        where: { id: input.siteId },
        select: {
          id: true,
          name: true,
          address: true,
          dealership: { select: { name: true } },
        },
      });

      const siteName = siteData?.name ?? "";
      const siteAddress = siteData?.address ?? null;
      const dealershipName = siteData?.dealership?.name ?? null;

      // A. Valets completed (by department) in date range
      const completedBookings = await ctx.prisma.booking.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          siteId: input.siteId,
          status: "COMPLETED",
          readyByTime: { gte: input.dateFrom, lte: input.dateTo },
        },
        include: {
          serviceType: { select: { durationMins: true } },
          department: { select: { id: true, name: true } },
        },
      });

      const byDeptMap: Record<string, { deptName: string; completed: number; totalMins: number }> = {};
      for (const b of completedBookings) {
        const deptId = b.department.id;
        if (!byDeptMap[deptId]) {
          byDeptMap[deptId] = { deptName: b.department.name, completed: 0, totalMins: 0 };
        }
        const entry = byDeptMap[deptId]!;
        entry.completed += 1;
        entry.totalMins += b.serviceType.durationMins;
      }
      const byDepartment = Object.values(byDeptMap);
      const totalCompleted = completedBookings.length;

      // B. Today's daily hours utilised vs capacity
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayBookings = await ctx.prisma.booking.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          siteId: input.siteId,
          status: { not: "CANCELLED" },
          readyByTime: { gte: todayStart, lte: todayEnd },
        },
        include: { serviceType: { select: { durationMins: true } } },
      });

      const todayAllocMins = todayBookings.reduce((s, b) => s + b.serviceType.durationMins, 0);
      const todayCapMins = DAILY_CAP;
      const todayUtilPct = Math.min(Math.round((todayAllocMins / DAILY_CAP) * 100), 100);

      // C. 7-day over-allocation forecast (next 7 days)
      const forecastDays: Array<{
        date: string;
        allocMins: number;
        capMins: number;
        overAllocated: boolean;
        utilPct: number;
      }> = [];

      for (let i = 0; i < 7; i++) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() + i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dayBookings = await ctx.prisma.booking.findMany({
          where: {
            organisationId: ctx.session.organisationId,
            siteId: input.siteId,
            status: { not: "CANCELLED" },
            readyByTime: { gte: dayStart, lte: dayEnd },
          },
          include: { serviceType: { select: { durationMins: true } } },
        });

        const allocMins = dayBookings.reduce((s, b) => s + b.serviceType.durationMins, 0);
        forecastDays.push({
          date: dayStart.toISOString().slice(0, 10),
          allocMins,
          capMins: DAILY_CAP,
          overAllocated: allocMins > DAILY_CAP,
          utilPct: Math.min(Math.round((allocMins / DAILY_CAP) * 100), 100),
        });
      }

      // E. Booking list for CSV
      const bookingsListRaw = await ctx.prisma.booking.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          siteId: input.siteId,
          status: { not: "CANCELLED" },
          readyByTime: { gte: input.dateFrom, lte: input.dateTo },
        },
        include: {
          serviceType: { select: { name: true, durationMins: true } },
          department: { select: { name: true } },
        },
        orderBy: { readyByTime: "asc" },
      });

      const bookingsList = bookingsListRaw.map((b) => ({
        vehicleReg: b.vehicleReg,
        customerName: b.customerName,
        serviceType: b.serviceType.name,
        department: b.department.name,
        status: b.status as string,
        durationMins: b.serviceType.durationMins,
        readyByTime: b.readyByTime,
      }));

      return {
        siteName,
        siteAddress,
        dealershipName,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        totalCompleted,
        byDepartment,
        todayAllocMins,
        todayCapMins,
        todayUtilPct,
        forecastDays,
        bookingsList,
      };
    }),

  /**
   * Days in Prep report — how long each completed booking took from creation to completion.
   */
  daysInPrep: orgAdminProcedure
    .input(z.object({
      siteId: z.string().optional(),
      from: z.date().optional(),
      to: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const bookings = await ctx.prisma.booking.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          ...(input.siteId && { siteId: input.siteId }),
          ...(input.from && { createdAt: { gte: input.from } }),
          ...(input.to && { createdAt: { lte: input.to } }),
          status: "COMPLETED",
          completedAt: { not: null },
        },
        select: {
          id: true,
          vehicleReg: true,
          customerName: true,
          createdAt: true,
          completedAt: true,
          site: { select: { name: true } },
          department: { select: { name: true } },
          serviceType: { select: { name: true } },
        },
        orderBy: { completedAt: "desc" },
      });

      const withDays = bookings.map((b) => ({
        ...b,
        daysInPrep: b.completedAt
          ? Math.ceil((b.completedAt.getTime() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }));

      const avgDays = withDays.length > 0
        ? withDays.reduce((sum, b) => sum + (b.daysInPrep ?? 0), 0) / withDays.length
        : 0;

      return {
        bookings: withDays,
        avgDaysInPrep: Math.round(avgDays * 10) / 10,
        totalCompleted: withDays.length,
        fastestDays: withDays.length > 0 ? Math.min(...withDays.map((b) => b.daysInPrep ?? 999)) : null,
        slowestDays: withDays.length > 0 ? Math.max(...withDays.map((b) => b.daysInPrep ?? 0)) : null,
      };
    }),
  /**
   * Platform-wide summary for super_admin / org_admin SA dashboard.
   * Returns headline KPIs, per-site performance, dept breakdown, quality scores,
   * busiest sites and a period comparison.
   */
  platformSummary: orgAdminProcedure
    .input(
      z.object({
        dateFrom: z.date(),
        dateTo: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo } = input;

      // ── A. Fetch all non-cancelled bookings in range ──────────────────────
      const bookings = await ctx.prisma.booking.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          readyByTime: { gte: dateFrom, lte: dateTo },
          status: { not: "CANCELLED" },
        },
        include: {
          serviceType: { select: { durationMins: true } },
          site: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
      });

      const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
      const totalBookings = bookings.length;
      const totalCompleted = completedBookings.length;
      const completionRate =
        totalBookings > 0 ? Math.round((totalCompleted / totalBookings) * 100) : 0;

      // ── A. Headline KPIs ──────────────────────────────────────────────────
      const activeValeters = await ctx.prisma.user.count({
        where: {
          organisationId: ctx.session.organisationId,
          role: "valeter",
          isActive: true,
        },
      });

      const avgCompletionMins =
        completedBookings.length > 0
          ? Math.round(
              completedBookings.reduce((s, b) => s + b.serviceType.durationMins, 0) /
                completedBookings.length,
            )
          : 0;

      // isPriority exists in schema
      const priorityCount = bookings.filter((b) => b.isPriority).length;
      // doNotClean exists in schema
      const dncCount = bookings.filter((b) => b.doNotClean).length;

      // ── B. Site performance ───────────────────────────────────────────────
      const DAILY_CAP = 480;

      type SitePerf = {
        siteId: string;
        siteName: string;
        completed: number;
        totalMins: number;
        avgMins: number;
        overAllocDays: number;
      };

      const sitePerfMap = new Map<string, SitePerf>();
      const siteDailyMins = new Map<string, number>(); // key: siteId:date

      for (const b of bookings) {
        const siteId = b.site.id;
        if (!sitePerfMap.has(siteId)) {
          sitePerfMap.set(siteId, {
            siteId,
            siteName: b.site.name,
            completed: 0,
            totalMins: 0,
            avgMins: 0,
            overAllocDays: 0,
          });
        }
        // Daily minutes for over-alloc (all non-cancelled)
        const dk = `${siteId}:${b.readyByTime.toISOString().slice(0, 10)}`;
        siteDailyMins.set(dk, (siteDailyMins.get(dk) ?? 0) + b.serviceType.durationMins);

        // Completed-only metrics
        if (b.status === "COMPLETED") {
          const sp = sitePerfMap.get(siteId)!;
          sp.completed += 1;
          sp.totalMins += b.serviceType.durationMins;
        }
      }

      // Tally over-alloc days
      for (const [dk, mins] of siteDailyMins) {
        if (mins > DAILY_CAP) {
          const siteId = dk.split(":")[0]!;
          const sp = sitePerfMap.get(siteId);
          if (sp) sp.overAllocDays += 1;
        }
      }

      // Compute avgMins
      for (const sp of sitePerfMap.values()) {
        sp.avgMins = sp.completed > 0 ? Math.round(sp.totalMins / sp.completed) : 0;
      }

      const sitePerformance = Array.from(sitePerfMap.values());

      // ── C. Quality scores (qualityScore field exists in schema) ──────────
      const qualityBookings = completedBookings.filter((b) => b.qualityScore !== null);
      const avgQualityScore =
        qualityBookings.length > 0
          ? Math.round(
              (qualityBookings.reduce((s, b) => s + (b.qualityScore ?? 0), 0) /
                qualityBookings.length) *
                10,
            ) / 10
          : null;

      // ── D. Busiest sites — top 5 by completed count ───────────────────────
      const busiestSites = [...sitePerformance]
        .sort((a, b) => b.completed - a.completed)
        .slice(0, 5)
        .map((s) => ({ siteId: s.siteId, siteName: s.siteName, completed: s.completed }));

      // ── E. Department breakdown ───────────────────────────────────────────
      const deptMap = new Map<string, { deptId: string; deptName: string; completed: number }>();
      for (const b of completedBookings) {
        const deptId = b.department.id;
        if (!deptMap.has(deptId)) {
          deptMap.set(deptId, { deptId, deptName: b.department.name, completed: 0 });
        }
        deptMap.get(deptId)!.completed += 1;
      }
      const departmentBreakdown = Array.from(deptMap.values()).sort(
        (a, b) => b.completed - a.completed,
      );

      // ── F. Period comparison ──────────────────────────────────────────────
      const periodMs = dateTo.getTime() - dateFrom.getTime();
      const prevDateTo = new Date(dateFrom.getTime() - 1);
      const prevDateFrom = new Date(prevDateTo.getTime() - periodMs);

      const prevCompleted = await ctx.prisma.booking.count({
        where: {
          organisationId: ctx.session.organisationId,
          readyByTime: { gte: prevDateFrom, lte: prevDateTo },
          status: "COMPLETED",
        },
      });

      return {
        // A. Headline KPIs
        totalCompleted,
        totalBookings,
        completionRate,
        activeValeters,
        avgCompletionMins,
        dncCount,
        priorityCount,
        // B. Site performance
        sitePerformance,
        // C. Quality
        avgQualityScore,
        // D. Busiest sites
        busiestSites,
        // E. Department breakdown
        departmentBreakdown,
        // F. Period comparison
        periodComparison: {
          current: totalCompleted,
          previous: prevCompleted,
          delta: totalCompleted - prevCompleted,
          deltaPercent:
            prevCompleted > 0
              ? Math.round(((totalCompleted - prevCompleted) / prevCompleted) * 100)
              : null,
        },
      };
    }),

  /**
   * Vehicle size report — actual valet time grouped by size.
   * Org admin only.
   */
  vehicleSizeReport: orgAdminProcedure
    .input(
      z.object({
        siteId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const dateFrom = input.dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dateTo = input.dateTo ?? new Date();

      const bookings = await ctx.prisma.booking.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          ...(input.siteId ? { siteId: input.siteId } : {}),
          status: "COMPLETED",
          completedAt: { gte: dateFrom, lte: dateTo },
        },
        select: {
          id: true,
          vehicleSize: true,
          resolvedDurationMins: true,
          createdAt: true,
          completedAt: true,
          serviceType: { select: { durationMins: true } },
        },
      });

      const sizes = ["SMALL", "MEDIUM", "LARGE", "XL", "VAN"] as const;
      type SizeBucket = { size: string; count: number; totalActualMins: number; totalAllocatedMins: number };
      const sizeMap: Record<string, SizeBucket> = Object.fromEntries(
        sizes.map((s) => [s, { size: s, count: 0, totalActualMins: 0, totalAllocatedMins: 0 }]),
      );

      for (const b of bookings) {
        const size = b.vehicleSize ?? "LARGE";
        const bucket = sizeMap[size];
        if (!bucket) continue;
        bucket.count += 1;
        const allocated = b.resolvedDurationMins ?? b.serviceType.durationMins;
        bucket.totalAllocatedMins += allocated;
        if (b.completedAt) {
          const actualMins = Math.round((b.completedAt.getTime() - b.createdAt.getTime()) / 60000);
          if (actualMins > 0 && actualMins < 480) {
            bucket.totalActualMins += actualMins;
          }
        }
      }

      return sizes.map((size) => {
        const bucket = sizeMap[size];
        if (!bucket) return { size, count: 0, avgActualMins: null, avgAllocatedMins: null, differenceMins: null };
        const avgActualMins = bucket.count > 0 ? Math.round(bucket.totalActualMins / bucket.count) : null;
        const avgAllocatedMins = bucket.count > 0 ? Math.round(bucket.totalAllocatedMins / bucket.count) : null;
        return {
          size,
          count: bucket.count,
          avgActualMins,
          avgAllocatedMins,
          differenceMins: avgActualMins != null && avgAllocatedMins != null
            ? avgActualMins - avgAllocatedMins
            : null,
        };
      });
    }),

});