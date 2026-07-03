/**
 * prospects router
 * Manage prospect valeters — pre-registration pipeline before full onboarding.
 * Accessible by org_admin and super_admin.
 */

import { z } from "zod";
import { router, orgAdminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const ProspectStatusEnum = z.enum([
  "NEW",
  "CONTACTED",
  "INTERVIEWED",
  "OFFERED",
  "ONBOARDED",
  "DECLINED",
]);

export const prospectsRouter = router({
  /** List all prospects for the org, optionally filtered by status */
  list: orgAdminProcedure
    .input(
      z.object({
        status: ProspectStatusEnum.optional(),
        siteId: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        organisationId: ctx.session.organisationId,
      };
      if (input?.status) where.status = input.status;
      if (input?.siteId) where.siteId = input.siteId;
      if (input?.search) {
        const s = input.search.trim();
        where.OR = [
          { firstName: { contains: s, mode: "insensitive" } },
          { lastName:  { contains: s, mode: "insensitive" } },
          { email:     { contains: s, mode: "insensitive" } },
          { phone:     { contains: s, mode: "insensitive" } },
        ];
      }

      const rows = await ctx.prisma.prospectValeter.findMany({
        where,
        include: {
          site: { select: { id: true, name: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      });

      return rows.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email ?? null,
        phone: r.phone ?? null,
        notes: r.notes ?? null,
        status: r.status,
        siteId: r.siteId ?? null,
        siteName: r.site?.name ?? null,
        addedByUserId: r.addedByUserId ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    }),

  /** Add a new prospect */
  create: orgAdminProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName:  z.string().min(1),
        email:     z.string().email().optional().or(z.literal("")),
        phone:     z.string().optional(),
        notes:     z.string().optional(),
        siteId:    z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.prospectValeter.create({
        data: {
          organisationId: ctx.session.organisationId,
          firstName:      input.firstName,
          lastName:       input.lastName,
          email:          input.email || null,
          phone:          input.phone || null,
          notes:          input.notes || null,
          siteId:         input.siteId || null,
          addedByUserId:  ctx.session.userId,
          status:         "NEW",
        },
      });
    }),

  /** Update status, notes, or contact details */
  update: orgAdminProcedure
    .input(
      z.object({
        id:        z.string(),
        firstName: z.string().min(1).optional(),
        lastName:  z.string().min(1).optional(),
        email:     z.string().email().optional().or(z.literal("")).optional(),
        phone:     z.string().optional(),
        notes:     z.string().optional(),
        status:    ProspectStatusEnum.optional(),
        siteId:    z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospectValeter.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!prospect) throw new TRPCError({ code: "NOT_FOUND" });

      const { id, ...data } = input;
      return ctx.prisma.prospectValeter.update({
        where: { id },
        data: {
          ...(data.firstName !== undefined && { firstName: data.firstName }),
          ...(data.lastName  !== undefined && { lastName:  data.lastName }),
          ...(data.email     !== undefined && { email:     data.email || null }),
          ...(data.phone     !== undefined && { phone:     data.phone || null }),
          ...(data.notes     !== undefined && { notes:     data.notes || null }),
          ...(data.status    !== undefined && { status:    data.status }),
          ...(data.siteId    !== undefined && { siteId:    data.siteId }),
        },
      });
    }),

  /** Archive (delete) a prospect */
  remove: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospectValeter.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!prospect) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.prospectValeter.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /** Count by status — for the stat cards */
  statusCounts: orgAdminProcedure.query(async ({ ctx }) => {
    const counts = await ctx.prisma.prospectValeter.groupBy({
      by: ["status"],
      where: { organisationId: ctx.session.organisationId },
      _count: { _all: true },
    });
    const map: Record<string, number> = {};
    for (const c of counts) map[c.status] = c._count._all;
    return {
      NEW:         map.NEW         ?? 0,
      CONTACTED:   map.CONTACTED   ?? 0,
      INTERVIEWED: map.INTERVIEWED ?? 0,
      OFFERED:     map.OFFERED     ?? 0,
      ONBOARDED:   map.ONBOARDED   ?? 0,
      DECLINED:    map.DECLINED    ?? 0,
      total:       counts.reduce((a, c) => a + c._count._all, 0),
    };
  }),
});
