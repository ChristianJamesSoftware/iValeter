import { z } from "zod";
import { router, orgAdminProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const overtimeReasonsRouter = router({
  /** Anyone: list active reasons for their org (used by valeter form) */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.overtimeReason.findMany({
      where: { organisationId: ctx.session.organisationId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }),

  /** Admin: list all (including inactive) */
  listAll: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.overtimeReason.findMany({
      where: { organisationId: ctx.session.organisationId },
      orderBy: { sortOrder: "asc" },
    });
  }),

  /** Admin: create a new reason */
  create: orgAdminProcedure
    .input(z.object({ label: z.string().min(2).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.prisma.overtimeReason.findFirst({
        where: { organisationId: ctx.session.organisationId },
        orderBy: { sortOrder: "desc" },
      });
      return ctx.prisma.overtimeReason.create({
        data: {
          organisationId: ctx.session.organisationId,
          label: input.label.trim(),
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });
    }),

  /** Admin: update label or active state */
  update: orgAdminProcedure
    .input(z.object({
      id: z.string(),
      label: z.string().min(2).max(100).optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const reason = await ctx.prisma.overtimeReason.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!reason) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.overtimeReason.update({
        where: { id: input.id },
        data: {
          ...(input.label !== undefined && { label: input.label.trim() }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        },
      });
    }),

  /** Admin: delete (only if no requests have used it) */
  delete: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reason = await ctx.prisma.overtimeReason.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!reason) throw new TRPCError({ code: "NOT_FOUND" });
      const usageCount = await ctx.prisma.overtimeRequest.count({
        where: { reasonId: input.id },
      });
      if (usageCount > 0) {
        // Soft-delete — deactivate rather than remove
        return ctx.prisma.overtimeReason.update({
          where: { id: input.id },
          data: { isActive: false },
        });
      }
      return ctx.prisma.overtimeReason.delete({ where: { id: input.id } });
    }),
});
