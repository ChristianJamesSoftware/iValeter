import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, orgAdminProcedure } from "../trpc";

export const sitesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.site.findMany({
      where: { organisationId: ctx.session.organisationId },
      include: {
        departments: {
          include: { serviceTypes: { where: { isActive: true } } },
        },
        _count: { select: { bookings: true, users: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const site = await ctx.prisma.site.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
        include: {
          departments: {
            include: { serviceTypes: { where: { isActive: true } } },
          },
        },
      });
      if (!site) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
      }
      return site;
    }),

  create: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        departments: z.array(z.string()).default(["New Car Sales", "Used Car Sales", "Service"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.site.create({
        data: {
          organisationId: ctx.session.organisationId,
          name: input.name.trim(),
          address: input.address,
          departments: {
            create: input.departments.map((name) => ({ name })),
          },
        },
        include: { departments: true },
      });
    }),
});
