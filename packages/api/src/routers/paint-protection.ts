import { z } from "zod";
import { router, superAdminProcedure, protectedProcedure } from "../trpc";

export const paintProtectionRouter = router({
  /** All active products — used by the customer booking form */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.paintProtectionProduct.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }),

  /** All products including inactive — used by ops settings */
  listAll: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.paintProtectionProduct.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }),

  create: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        detailedDescription: z.string().optional(),
        durationMonths: z.number().int().min(0),
        guaranteeNote: z.string().optional(),
        priceGbp: z.number().min(0),
        applicationMins: z.number().int().min(0).default(0),
        popular: z.boolean().default(false),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.paintProtectionProduct.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
          detailedDescription: input.detailedDescription?.trim() ?? null,
          durationMonths: input.durationMonths,
          guaranteeNote: input.guaranteeNote?.trim() ?? null,
          priceGbp: input.priceGbp,
          applicationMins: input.applicationMins,
          popular: input.popular,
          sortOrder: input.sortOrder,
        },
      });
    }),

  update: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        detailedDescription: z.string().optional(),
        durationMonths: z.number().int().min(0).optional(),
        guaranteeNote: z.string().optional(),
        priceGbp: z.number().min(0).optional(),
        applicationMins: z.number().int().min(0).optional(),
        popular: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.paintProtectionProduct.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description.trim() || null }),
          ...(data.detailedDescription !== undefined && { detailedDescription: data.detailedDescription.trim() || null }),
          ...(data.durationMonths !== undefined && { durationMonths: data.durationMonths }),
          ...(data.guaranteeNote !== undefined && { guaranteeNote: data.guaranteeNote.trim() || null }),
          ...(data.priceGbp !== undefined && { priceGbp: data.priceGbp }),
          ...(data.applicationMins !== undefined && { applicationMins: data.applicationMins }),
          ...(data.popular !== undefined && { popular: data.popular }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        },
      });
    }),

  delete: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Unlink any bookings that reference this product before deleting
      await ctx.prisma.booking.updateMany({
        where: { paintProtectionProductId: input.id },
        data: { paintProtectionProductId: null },
      });
      return ctx.prisma.paintProtectionProduct.delete({ where: { id: input.id } });
    }),
});
