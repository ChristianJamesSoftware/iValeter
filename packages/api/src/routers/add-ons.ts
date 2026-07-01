import { z } from "zod";
import { router, superAdminProcedure, protectedProcedure } from "../trpc";

export const addOnsRouter = router({
  /** All add-ons in the global catalogue */
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
      await ctx.prisma.dealershipAddOn.deleteMany({ where: { addOnId: input.id } });
      return ctx.prisma.addOn.delete({ where: { id: input.id } });
    }),

  /** Get all add-ons for a specific dealership with enabled status + price */
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

      const assignmentMap = new Map(
        assignments.map((a) => [a.addOnId, a]),
      );

      return allAddOns.map((addon) => {
        const assignment = assignmentMap.get(addon.id);
        return {
          ...addon,
          enabled:  assignment?.enabled ?? false,
          priceGbp: assignment?.priceGbp ?? null,
        };
      });
    }),

  /** Toggle an add-on on/off and optionally set price for a specific dealership */
  setForDealership: superAdminProcedure
    .input(
      z.object({
        dealershipId: z.string(),
        addOnId:      z.string(),
        enabled:      z.boolean(),
        priceGbp:     z.number().min(0).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealershipAddOn.upsert({
        where: {
          dealershipId_addOnId: {
            dealershipId: input.dealershipId,
            addOnId:      input.addOnId,
          },
        },
        update: {
          enabled:  input.enabled,
          ...(input.priceGbp !== undefined && { priceGbp: input.priceGbp }),
        },
        create: {
          dealershipId: input.dealershipId,
          addOnId:      input.addOnId,
          enabled:      input.enabled,
          priceGbp:     input.priceGbp ?? null,
        },
      });
    }),

  /** Update just the price for an enabled add-on (without toggling) */
  setPriceForDealership: superAdminProcedure
    .input(
      z.object({
        dealershipId: z.string(),
        addOnId:      z.string(),
        priceGbp:     z.number().min(0).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealershipAddOn.upsert({
        where: {
          dealershipId_addOnId: {
            dealershipId: input.dealershipId,
            addOnId:      input.addOnId,
          },
        },
        update: { priceGbp: input.priceGbp },
        create: {
          dealershipId: input.dealershipId,
          addOnId:      input.addOnId,
          enabled:      false,
          priceGbp:     input.priceGbp,
        },
      });
    }),
});
