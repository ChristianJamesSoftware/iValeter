import { z } from "zod";
import { orgAdminProcedure, dealershipProcedure, router } from "../trpc";

/**
 * Vehicle size rate router.
 *
 * Stores per-site, per-service-type % modifiers for piece-work pricing
 * and time allocation. MEDIUM is the baseline (0%). Modifiers are integers
 * representing percentage points (e.g. 20 = +20%, -10 = -10%).
 *
 * GET:  listBySite  — org_admin + dealership_user (site managers)
 * SET:  upsert      — org_admin only (per site — same as client/site setup pattern)
 */
export const vehicleSizeRatesRouter = router({
  /**
   * List all VehicleSizeRate rows for a given site, joined with service type name.
   * Returns one row per service type that has a rate configured.
   */
  listBySite: dealershipProcedure
    .input(z.object({ siteId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Site must belong to the session's org
      const site = await ctx.prisma.site.findFirstOrThrow({
        where: { id: input.siteId, organisationId: ctx.session.organisationId },
        select: { id: true, name: true },
      });

      const rates = await ctx.prisma.vehicleSizeRate.findMany({
        where: { siteId: site.id },
        include: {
          serviceType: {
            select: { id: true, name: true, durationMins: true, chargeRate: true, category: true },
          },
        },
        orderBy: { serviceType: { name: "asc" } },
      });

      return rates;
    }),

  /**
   * List all service types for the org (used to populate the rate matrix rows).
   */
  listServiceTypes: dealershipProcedure
    .input(z.object({ siteId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Resolve site → departments → service types
      const site = await ctx.prisma.site.findFirstOrThrow({
        where: { id: input.siteId, organisationId: ctx.session.organisationId },
        select: { id: true },
      });

      const departments = await ctx.prisma.department.findMany({
        where: { siteId: site.id },
        include: {
          serviceTypes: {
            where: { isActive: true },
            select: { id: true, name: true, durationMins: true, chargeRate: true, category: true },
          },
        },
      });

      return departments.flatMap((d) => d.serviceTypes);
    }),

  /**
   * Upsert a VehicleSizeRate row for a specific site + serviceType.
   * Creates if not exists, updates if it does.
   * Only org_admin can write rates.
   */
  upsert: orgAdminProcedure
    .input(
      z.object({
        siteId: z.string(),
        serviceTypeId: z.string(),
        basePricePence: z.number().int().min(0).optional().nullable(),
        baseAllocMins: z.number().int().min(1).optional().nullable(),
        pctSmall: z.number().int().min(-100).max(200),
        pctMedium: z.number().int().default(0),
        pctLarge: z.number().int().min(-100).max(200),
        pctXL: z.number().int().min(-100).max(200),
        pctVan: z.number().int().min(-100).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate site belongs to org
      await ctx.prisma.site.findFirstOrThrow({
        where: { id: input.siteId, organisationId: ctx.session.organisationId },
        select: { id: true },
      });

      const { siteId, serviceTypeId, ...data } = input;

      return ctx.prisma.vehicleSizeRate.upsert({
        where: { siteId_serviceTypeId: { siteId, serviceTypeId } },
        create: { siteId, serviceTypeId, ...data },
        update: { ...data },
      });
    }),

  /**
   * Delete a rate row (resets site to org defaults).
   */
  remove: orgAdminProcedure
    .input(z.object({ siteId: z.string(), serviceTypeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.site.findFirstOrThrow({
        where: { id: input.siteId, organisationId: ctx.session.organisationId },
        select: { id: true },
      });

      return ctx.prisma.vehicleSizeRate.deleteMany({
        where: { siteId: input.siteId, serviceTypeId: input.serviceTypeId },
      });
    }),
});
