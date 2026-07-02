import { z } from "zod";
import { router, orgAdminProcedure, dealershipProcedure } from "../trpc";

export const supportServicesRouter = router({
  // List all active services for the org, grouped
  list: dealershipProcedure.query(async ({ ctx }) => {
    return ctx.prisma.supportService.findMany({
      where: { organisationId: ctx.session.organisationId, isActive: true },
      orderBy: [{ group: "asc" }, { name: "asc" }],
    });
  }),

  // Admin: list all (including inactive)
  listAll: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.supportService.findMany({
      where: { organisationId: ctx.session.organisationId },
      orderBy: [{ group: "asc" }, { name: "asc" }],
    });
  }),

  // Admin: toggle active
  toggleActive: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const svc = await ctx.prisma.supportService.findFirstOrThrow({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      return ctx.prisma.supportService.update({
        where: { id: input.id },
        data: { isActive: !svc.isActive },
      });
    }),

  // Admin: add custom service
  add: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(2),
        group: z.string(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.supportService.create({
        data: { ...input, organisationId: ctx.session.organisationId },
      });
    }),

  // Book a support service
  book: dealershipProcedure
    .input(
      z.object({
        serviceId: z.string(),
        siteId: z.string(),
        scheduledDate: z.date(),
        notes: z.string().optional(),
        contactName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.supportServiceBooking.create({
        data: {
          ...input,
          organisationId: ctx.session.organisationId,
          createdById: ctx.session.userId,
        },
      });
    }),

  // Book multiple services at once — creates one booking row per service
  bookMultiple: dealershipProcedure
    .input(
      z.object({
        serviceIds: z.array(z.string()).min(1),
        siteId: z.string(),
        scheduledDate: z.date(),
        notes: z.string().optional(),
        contactName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { serviceIds, ...shared } = input;
      return ctx.prisma.$transaction(
        serviceIds.map((serviceId) =>
          ctx.prisma.supportServiceBooking.create({
            data: {
              ...shared,
              serviceId,
              organisationId: ctx.session.organisationId,
              createdById: ctx.session.userId,
            },
          }),
        ),
      );
    }),

  // List bookings for admin
  listBookings: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.supportServiceBooking.findMany({
      where: { organisationId: ctx.session.organisationId },
      include: { service: true, site: { select: { name: true } } },
      orderBy: { scheduledDate: "desc" },
      take: 100,
    });
  }),

  // Update booking status
  updateStatus: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.supportServiceBooking.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
