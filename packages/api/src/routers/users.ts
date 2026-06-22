import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Role } from "@ivaleter/db";
import { router, protectedProcedure, orgAdminProcedure } from "../trpc";
import { hashPassword } from "../auth";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const usersRouter = router({
  /** List valeters in the org, optionally filtered by site, with today's job counts. */
  listValeters: protectedProcedure
    .input(z.object({ siteId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const valeters = await ctx.prisma.user.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          role: Role.valeter,
          ...(input?.siteId ? { siteId: input.siteId } : {}),
        },
        include: { site: { select: { id: true, name: true } } },
        orderBy: { firstName: "asc" },
      });

      const today = startOfToday();
      const counts = await ctx.prisma.booking.groupBy({
        by: ["assignedToId"],
        where: {
          organisationId: ctx.session.organisationId,
          assignedToId: { in: valeters.map((v) => v.id) },
          readyByTime: { gte: today },
        },
        _count: { _all: true },
      });
      const countMap = new Map(
        counts.map((c) => [c.assignedToId, c._count._all]),
      );

      return valeters.map((v) => ({
        id: v.id,
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        siteId: v.siteId,
        siteName: v.site?.name ?? null,
        skills: v.skills,
        isActive: v.isActive,
        jobsToday: countMap.get(v.id) ?? 0,
      }));
    }),

  list: orgAdminProcedure
    .input(z.object({ role: z.nativeEnum(Role).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.user.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          ...(input?.role ? { role: input.role } : {}),
        },
        include: { site: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: orgAdminProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        password: z.string().min(6),
        role: z.nativeEnum(Role),
        siteId: z.string().optional(),
        skills: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase().trim() },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }

      if (input.siteId) {
        const site = await ctx.prisma.site.findFirst({
          where: {
            id: input.siteId,
            organisationId: ctx.session.organisationId,
          },
        });
        if (!site) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
        }
      }

      return ctx.prisma.user.create({
        data: {
          organisationId: ctx.session.organisationId,
          email: input.email.toLowerCase().trim(),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash: hashPassword(input.password),
          role: input.role,
          siteId: input.siteId ?? null,
          skills: input.skills,
        },
      });
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        siteId: z.string().nullable().optional(),
        skills: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const { id, ...data } = input;
      return ctx.prisma.user.update({ where: { id }, data });
    }),
});
