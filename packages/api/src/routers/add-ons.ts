import { z } from "zod";
import { router, superAdminProcedure, protectedProcedure } from "../trpc";

export const addOnsRouter = router({
  /** All add-ons in the global catalogue (super admin + any authenticated user for display) */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.addOn.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }),

  /** Create a new add-on in the catalogue */
  create: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.addOn.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
          sortOrder: input.sortOrder,
        },
      });
    }),

  /** Update name / description / sortOrder / isActive */
  update: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.addOn.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description.trim() || null }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });
    }),

  /** Delete an add-on from the catalogue (also removes all dealership assignments) */
  delete: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Remove all dealership assignments first
      await ctx.prisma.dealershipAddOn.deleteMany({ where: { addOnId: input.id } });
      return ctx.prisma.addOn.delete({ where: { id: input.id } });
    }),

  /** Get all add-ons for a specific dealership, with enabled status */
  getForDealership: protectedProcedure
    .input(z.object({ dealershipId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [allAddOns, assignments] = await Promise.all([
        ctx.prisma.addOn.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        }),
        ctx.prisma.dealershipAddOn.findMany({
          where: { dealershipId: input.dealershipId },
        }),
      ]);

      const enabledSet = new Set(
        assignments.filter((a) => a.enabled).map((a) => a.addOnId),
      );

      return allAddOns.map((addon) => ({
        ...addon,
        enabled: enabledSet.has(addon.id),
      }));
    }),

  /** Toggle an add-on on/off for a specific dealership */
  setForDealership: superAdminProcedure
    .input(
      z.object({
        dealershipId: z.string(),
        addOnId: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealershipAddOn.upsert({
        where: {
          dealershipId_addOnId: {
            dealershipId: input.dealershipId,
            addOnId: input.addOnId,
          },
        },
        update: { enabled: input.enabled },
        create: {
          dealershipId: input.dealershipId,
          addOnId: input.addOnId,
          enabled: input.enabled,
        },
      });
    }),
});
