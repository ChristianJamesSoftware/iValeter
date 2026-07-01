import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, orgAdminProcedure, superAdminProcedure } from "../trpc";

export const dealershipsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.dealership.findMany({
      where: { organisationId: ctx.session.organisationId, isActive: true },
      include: {
        sites: {
          include: {
            _count: { select: { bookings: true, users: true } },
          },
        },
        _count: { select: { sites: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const d = await ctx.prisma.dealership.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
        include: {
          sites: {
            include: {
              departments: {
                include: { serviceTypes: { where: { isActive: true } } },
              },
              _count: { select: { bookings: true, users: true } },
            },
          },
        },
      });
      if (!d)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dealership not found",
        });
      return d;
    }),

  create: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealership.create({
        data: {
          organisationId: ctx.session.organisationId,
          name: input.name.trim(),
          address: input.address,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
        },
      });
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().optional(),
        contactPhone: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const d = await ctx.prisma.dealership.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!d)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dealership not found",
        });
      const { id, ...data } = input;
      return ctx.prisma.dealership.update({ where: { id }, data });
    }),

  /** Super-admin: list ALL dealerships across all head offices */
  listAll: superAdminProcedure
    .input(z.object({ showInactive: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dealership.findMany({
        where: input?.showInactive ? undefined : { isActive: true },
        include: {
          organisation: { select: { id: true, name: true } },
          _count: { select: { sites: true } },
        },
        orderBy: [{ organisation: { name: "asc" } }, { name: "asc" }],
      });
    }),

  /** Super-admin: create a dealership under a specific head office */
  createForHeadOffice: superAdminProcedure
    .input(
      z.object({
        organisationId: z.string(),
        name: z.string().min(1),
        address: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().or(z.literal("")).optional(),
        contactPhone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealership.create({
        data: {
          organisationId: input.organisationId,
          name: input.name.trim(),
          address: input.address?.trim() ?? null,
          contactName: input.contactName?.trim() ?? null,
          contactEmail: input.contactEmail?.trim() || null,
          contactPhone: input.contactPhone?.trim() ?? null,
        },
      });
    }),
});
