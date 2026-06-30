import { z } from "zod";
import { dealershipProcedure, router } from "../trpc";
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
        bookings: bookings.map((b) => ({
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
});
