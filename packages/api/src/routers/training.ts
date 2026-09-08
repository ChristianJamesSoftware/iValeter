import { z } from "zod";
import { router, orgAdminProcedure } from "../trpc";

export const trainingRouter = router({
  /**
   * List all valeters with their training records.
   */
  list: orgAdminProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      where: {
        organisationId: ctx.session.organisationId,
        role: "valeter",
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        trainingRecords: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    return users;
  }),

  /**
   * Add a training record for a valeter.
   */
  add: orgAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        course: z.string().min(1, "Course name required"),
        provider: z.string().optional(),
        completedAt: z.string().optional(), // ISO date string
        expiresAt: z.string().optional(), // ISO date string
        certificateUrl: z.string().url().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify valeter belongs to this org
      const user = await ctx.prisma.user.findFirst({
        where: {
          id: input.userId,
          organisationId: ctx.session.organisationId,
        },
        select: { id: true },
      });
      if (!user) throw new Error("Valeter not found in your organisation");

      return ctx.prisma.trainingRecord.create({
        data: {
          userId: input.userId,
          course: input.course,
          provider: input.provider ?? null,
          completedAt: input.completedAt ? new Date(input.completedAt) : null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          certificateUrl: input.certificateUrl ?? null,
          notes: input.notes ?? null,
        },
      });
    }),

  /**
   * Delete a training record.
   */
  delete: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.prisma.trainingRecord.findFirst({
        where: {
          id: input.id,
          user: { organisationId: ctx.session.organisationId },
        },
        select: { id: true },
      });
      if (!record) throw new Error("Training record not found");
      return ctx.prisma.trainingRecord.delete({ where: { id: input.id } });
    }),
});
