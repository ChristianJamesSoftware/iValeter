import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const messagesRouter = router({
  /** My inbox — messages sent to me */
  inbox: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.message.findMany({
      where: { toUserId: ctx.session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }),

  /** Messages I sent */
  sent: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.message.findMany({
      where: { fromUserId: ctx.session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        toUser: { select: { firstName: true, lastName: true, role: true } },
      },
    });
  }),

  /** Unread count */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.message.count({
      where: { toUserId: ctx.session.userId, isRead: false },
    });
  }),

  /** Send a message to a user in the same org */
  send: protectedProcedure
    .input(
      z.object({
        toUserId: z.string(),
        body: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify recipient is in the same org
      const recipient = await ctx.prisma.user.findFirst({
        where: { id: input.toUserId, organisationId: ctx.session.organisationId },
      });
      if (!recipient) throw new TRPCError({ code: "NOT_FOUND", message: "Recipient not found" });
      return ctx.prisma.message.create({
        data: {
          organisationId: ctx.session.organisationId,
          fromUserId: ctx.session.userId,
          toUserId: input.toUserId,
          body: input.body,
        },
      });
    }),

  /** Mark a message as read */
  markRead: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.message.updateMany({
        where: { id: input.messageId, toUserId: ctx.session.userId },
        data: { isRead: true },
      });
    }),

  /** Mark all inbox messages as read */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.message.updateMany({
      where: { toUserId: ctx.session.userId, isRead: false },
      data: { isRead: true },
    });
  }),
});
