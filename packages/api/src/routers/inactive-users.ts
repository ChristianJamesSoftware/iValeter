import { z } from "zod";
import { orgAdminProcedure, router } from "../trpc";

/**
 * Inactive Users router.
 *
 * Two reports for managers and HQ:
 *
 * 1. inactiveValeters — valeters who have not logged in for 3+ consecutive days
 *    (uses lastLoginAt; falls back to clockEvents if lastLoginAt is null)
 *
 * 2. inactiveClients — dealership_user accounts with no booking created
 *    in the last 14 days. Keeps the database clean and flags dormant sites.
 *
 * Actions (org_admin only):
 *  - suspend   → sets isActive = false  (can be re-enabled)
 *  - archive   → sets isActive = false + archivedAt = now (soft-delete)
 *  - reinstate → sets isActive = true, archivedAt = null
 */
export const inactiveUsersRouter = router({
  /**
   * Valeters with no login for 3+ days.
   * Ordered by longest inactive first.
   */
  inactiveValeters: orgAdminProcedure
    .input(
      z.object({
        siteId: z.string().optional(), // org_admin can filter by site
        thresholdDays: z.number().int().min(1).default(3),
      }),
    )
    .query(async ({ ctx, input }) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - input.thresholdDays);
      cutoff.setHours(0, 0, 0, 0);

      // Fetch all active valeters in the org (not already archived)
      const valeters = await ctx.prisma.user.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          role: "valeter",
          archivedAt: null,
          ...(input.siteId ? { siteId: input.siteId } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          siteId: true,
          site: { select: { name: true } },
          clockEvents: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
        orderBy: { lastLoginAt: "asc" },
      });

      const inactive = valeters
        .map((v) => {
          // Best available last-seen date:
          // 1. lastLoginAt (portal login)
          // 2. most recent clock event (clocked in from site)
          // 3. null (never logged in — always flag)
          const lastClock = v.clockEvents[0]?.createdAt ?? null;
          const lastSeen =
            v.lastLoginAt && lastClock
              ? v.lastLoginAt > lastClock
                ? v.lastLoginAt
                : lastClock
              : (v.lastLoginAt ?? lastClock);

          const daysSince = lastSeen
            ? Math.floor(
                (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24),
              )
            : null; // null = never seen

          return {
            id: v.id,
            firstName: v.firstName,
            lastName: v.lastName,
            email: v.email,
            isActive: v.isActive,
            siteName: v.site?.name ?? "—",
            lastSeen,
            daysSince, // null = never logged in
            neverLoggedIn: lastSeen === null,
          };
        })
        .filter(
          (v) =>
            v.neverLoggedIn || // never logged in = always flag
            (v.daysSince !== null && v.daysSince >= input.thresholdDays),
        )
        .sort((a, b) => {
          // Never-logged-in first, then by longest inactive
          if (a.neverLoggedIn && !b.neverLoggedIn) return -1;
          if (!a.neverLoggedIn && b.neverLoggedIn) return 1;
          return (b.daysSince ?? 9999) - (a.daysSince ?? 9999);
        });

      return inactive;
    }),

  /**
   * Client (dealership_user) accounts with no booking created in 14+ days.
   * Ordered by longest inactive first.
   */
  inactiveClients: orgAdminProcedure
    .input(
      z.object({
        siteId: z.string().optional(),
        thresholdDays: z.number().int().min(1).default(14),
      }),
    )
    .query(async ({ ctx, input }) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - input.thresholdDays);
      cutoff.setHours(0, 0, 0, 0);

      const clients = await ctx.prisma.user.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          role: "dealership_user",
          archivedAt: null,
          ...(input.siteId ? { siteId: input.siteId } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          siteId: true,
          site: { select: { name: true } },
          createdBookings: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      });

      const inactive = clients
        .map((c) => {
          const lastBooking = c.createdBookings[0]?.createdAt ?? null;

          const daysSinceBooking = lastBooking
            ? Math.floor(
                (Date.now() - lastBooking.getTime()) / (1000 * 60 * 60 * 24),
              )
            : null; // null = never created a booking

          return {
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            isActive: c.isActive,
            siteName: c.site?.name ?? "—",
            lastLoginAt: c.lastLoginAt,
            lastBookingAt: lastBooking,
            daysSinceBooking,
            neverBooked: lastBooking === null,
          };
        })
        .filter(
          (c) =>
            c.neverBooked ||
            (c.daysSinceBooking !== null &&
              c.daysSinceBooking >= input.thresholdDays),
        )
        .sort((a, b) => {
          if (a.neverBooked && !b.neverBooked) return -1;
          if (!a.neverBooked && b.neverBooked) return 1;
          return (b.daysSinceBooking ?? 9999) - (a.daysSinceBooking ?? 9999);
        });

      return inactive;
    }),

  /**
   * Suspend a user — sets isActive = false.
   * They cannot log in but their data is preserved.
   * Can be reinstated.
   */
  suspend: orgAdminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Scope check — user must be in same org
      await ctx.prisma.user.findFirstOrThrow({
        where: { id: input.userId, organisationId: ctx.session.organisationId },
        select: { id: true },
      });

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { isActive: false },
        select: { id: true, isActive: true },
      });
    }),

  /**
   * Archive a user — sets isActive = false + archivedAt = now.
   * Soft-delete: data stays in the database but the user is excluded
   * from all active queries. Use for permanent removal from the platform.
   */
  archive: orgAdminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.findFirstOrThrow({
        where: { id: input.userId, organisationId: ctx.session.organisationId },
        select: { id: true },
      });

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { isActive: false, archivedAt: new Date() },
        select: { id: true, isActive: true, archivedAt: true },
      });
    }),

  /**
   * Reinstate a suspended or archived user.
   */
  reinstate: orgAdminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.findFirstOrThrow({
        where: { id: input.userId, organisationId: ctx.session.organisationId },
        select: { id: true },
      });

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { isActive: true, archivedAt: null },
        select: { id: true, isActive: true },
      });
    }),
});
