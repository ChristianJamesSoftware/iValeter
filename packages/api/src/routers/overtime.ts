import { z } from "zod";
import { router, protectedProcedure, orgAdminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const overtimeRouter = router({
  /** Valeter: submit an overtime request */
  request: protectedProcedure
    .input(
      z.object({
        requestedDate: z.string(), // ISO date string
        requestedHours: z.number().min(0.5).max(12),
        reason: z.string().min(10).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.overtimeRequest.create({
        data: {
          userId: ctx.session.userId,
          organisationId: ctx.session.organisationId,
          siteId: ctx.session.siteId,
          requestedDate: new Date(input.requestedDate),
          requestedHours: input.requestedHours,
          reason: input.reason,
          status: "PENDING",
        },
      });
    }),

  /** Valeter: my overtime request history */
  myRequests: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.overtimeRequest.findMany({
      where: { userId: ctx.session.userId },
      orderBy: { createdAt: "desc" },
    });
  }),

  /** HQ: list all pending overtime requests */
  listPending: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.overtimeRequest.findMany({
      where: { organisationId: ctx.session.organisationId, status: "PENDING" },
      include: {
        user: { select: { firstName: true, lastName: true, payId: true, site: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  /** HQ: approve or decline an overtime request */
  review: orgAdminProcedure
    .input(
      z.object({
        requestId: z.string(),
        action: z.enum(["APPROVED", "DECLINED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.overtimeRequest.findFirst({
        where: { id: input.requestId, organisationId: ctx.session.organisationId },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.overtimeRequest.update({
        where: { id: input.requestId },
        data: {
          status: input.action,
          reviewedByUserId: ctx.session.userId,
          reviewedAt: new Date(),
        },
      });
    }),
});
