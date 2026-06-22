import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { HolidayStatus } from "@ivaleter/db";
import { router, protectedProcedure, orgAdminProcedure } from "../trpc";

export const holidayRouter = router({
  /** A valeter submits a leave request for themselves. */
  submitRequest: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.endDate < input.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be on or after start date",
        });
      }
      return ctx.prisma.holidayRequest.create({
        data: {
          userId: ctx.session.userId,
          startDate: input.startDate,
          endDate: input.endDate,
          reason: input.reason,
        },
      });
    }),

  /** The current user's own requests. */
  myRequests: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.holidayRequest.findMany({
      where: { userId: ctx.session.userId },
      orderBy: { createdAt: "desc" },
    });
  }),

  /** All requests across the org (admin view). */
  listRequests: orgAdminProcedure
    .input(z.object({ status: z.nativeEnum(HolidayStatus).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.holidayRequest.findMany({
        where: {
          user: { organisationId: ctx.session.organisationId },
          ...(input?.status ? { status: input.status } : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              site: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  approve: orgAdminProcedure
    .input(z.object({ id: z.string(), adminNote: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertInOrg(ctx, input.id);
      return ctx.prisma.holidayRequest.update({
        where: { id: input.id },
        data: { status: HolidayStatus.APPROVED, adminNote: input.adminNote },
      });
    }),

  reject: orgAdminProcedure
    .input(z.object({ id: z.string(), adminNote: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertInOrg(ctx, input.id);
      return ctx.prisma.holidayRequest.update({
        where: { id: input.id },
        data: { status: HolidayStatus.REJECTED, adminNote: input.adminNote },
      });
    }),
});

async function assertInOrg(
  ctx: { prisma: typeof import("@ivaleter/db").prisma; session: { organisationId: string } },
  requestId: string,
) {
  const req = await ctx.prisma.holidayRequest.findFirst({
    where: { id: requestId, user: { organisationId: ctx.session.organisationId } },
  });
  if (!req) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Holiday request not found" });
  }
}
