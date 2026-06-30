import { z } from "zod";
import { router, orgAdminProcedure } from "../trpc";

export const auditsRouter = router({
  /** List all site visits (audits) for the org, optionally filtered by month */
  list: orgAdminProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12), // 1-based
      }),
    )
    .query(async ({ ctx, input }) => {
      const start = new Date(input.year, input.month - 1, 1);
      const end = new Date(input.year, input.month, 1);

      return ctx.prisma.audit.findMany({
        where: {
          site: { organisationId: ctx.session.organisationId },
          visitDate: { gte: start, lt: end },
        },
        include: {
          site: { select: { id: true, name: true } },
          accountManager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { visitDate: "asc" },
      });
    }),

  /** Upcoming visits — next 30 days */
  upcoming: orgAdminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);

    return ctx.prisma.audit.findMany({
      where: {
        site: { organisationId: ctx.session.organisationId },
        visitDate: { gte: now, lte: in30 },
      },
      include: {
        site: { select: { id: true, name: true } },
        accountManager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { visitDate: "asc" },
    });
  }),

  /** Schedule a new site visit */
  schedule: orgAdminProcedure
    .input(
      z.object({
        siteId: z.string(),
        accountManagerUserId: z.string(),
        visitDate: z.string(), // ISO date
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify site belongs to org
      const site = await ctx.prisma.site.findFirst({
        where: { id: input.siteId, organisationId: ctx.session.organisationId },
      });
      if (!site) throw new Error("Site not found");

      return ctx.prisma.audit.create({
        data: {
          siteId: input.siteId,
          accountManagerUserId: input.accountManagerUserId,
          visitDate: new Date(input.visitDate),
          notes: input.notes ?? null,
          status: "DRAFT",
        },
      });
    }),

  /** Mark a visit as completed (published) with optional score + notes */
  complete: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        overallScore: z.number().min(0).max(10).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.audit.update({
        where: { id: input.id },
        data: {
          status: "PUBLISHED",
          overallScore: input.overallScore ?? null,
          notes: input.notes ?? null,
        },
      });
    }),

  /** Cancel / delete a scheduled visit */
  remove: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.audit.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  /** List account managers for this org (role = org_admin) */
  listAccountManagers: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: {
        organisationId: ctx.session.organisationId,
        role: "org_admin",
        isActive: true,
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    });
  }),
});
