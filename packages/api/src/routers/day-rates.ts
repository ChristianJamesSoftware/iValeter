import { z } from "zod";
import { router, protectedProcedure, orgAdminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const dayRatesRouter = router({

  // ── Roles ──────────────────────────────────────────────────────────────────

  /** List all day rate roles (platform defaults + org custom) */
  listRoles: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.dayRateRole.findMany({
      where: {
        isActive: true,
        OR: [
          { organisationId: null },
          { organisationId: ctx.session.organisationId },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }),

  /** Add a custom day rate role for this org */
  addRole: orgAdminProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dayRateRole.create({
        data: {
          organisationId: ctx.session.organisationId,
          name: input.name.trim(),
          description: input.description?.trim(),
        },
      });
    }),

  // ── Dealership day rates ────────────────────────────────────────────────────

  /** Get all day rates set for a dealership */
  getDayRates: protectedProcedure
    .input(z.object({ dealershipId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dealershipDayRate.findMany({
        where: { dealershipId: input.dealershipId },
        include: { role: true },
      });
    }),

  /** Upsert a day rate for a role at a dealership */
  setDayRate: orgAdminProcedure
    .input(z.object({
      dealershipId: z.string(),
      roleId: z.string(),
      ratePence: z.number().int().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const dealer = await ctx.prisma.dealership.findFirst({
        where: { id: input.dealershipId, organisationId: ctx.session.organisationId },
      });
      if (!dealer) throw new TRPCError({ code: "NOT_FOUND", message: "Dealership not found" });

      return ctx.prisma.dealershipDayRate.upsert({
        where: { dealershipId_roleId: { dealershipId: input.dealershipId, roleId: input.roleId } },
        create: { dealershipId: input.dealershipId, roleId: input.roleId, ratePence: input.ratePence },
        update: { ratePence: input.ratePence },
      });
    }),

  /** Remove a day rate entry */
  removeDayRate: orgAdminProcedure
    .input(z.object({ dealershipId: z.string(), roleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealershipDayRate.deleteMany({
        where: { dealershipId: input.dealershipId, roleId: input.roleId },
      });
    }),

  // ── Dealership operatives ───────────────────────────────────────────────────

  /** List all active operatives for a dealership */
  listOperatives: orgAdminProcedure
    .input(z.object({ dealershipId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dealershipOperative.findMany({
        where: { dealershipId: input.dealershipId, isActive: true },
        include: { role: true },
        orderBy: { createdAt: "asc" },
      });
    }),

  /** Add an operative position to a dealership */
  addOperative: orgAdminProcedure
    .input(z.object({
      dealershipId: z.string(),
      roleId: z.string(),
      departmentName: z.string().optional(),
      quantity: z.number().int().min(1).default(1),
      allocatedHoursPerDay: z.number().min(0.5).max(24).default(8),
      dayRatePence: z.number().int().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const dealer = await ctx.prisma.dealership.findFirst({
        where: { id: input.dealershipId, organisationId: ctx.session.organisationId },
      });
      if (!dealer) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.dealershipOperative.create({ data: input });
    }),

  /** Update an operative position */
  updateOperative: orgAdminProcedure
    .input(z.object({
      id: z.string(),
      roleId: z.string().optional(),
      departmentName: z.string().nullable().optional(),
      quantity: z.number().int().min(1).optional(),
      allocatedHoursPerDay: z.number().min(0.5).max(24).optional(),
      dayRatePence: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.dealershipOperative.update({ where: { id }, data });
    }),

  /** Remove (soft-delete) an operative */
  removeOperative: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealershipOperative.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ── Dealership weekly tasks ─────────────────────────────────────────────────

  /** List weekly tasks for a dealership */
  listWeeklyTasks: orgAdminProcedure
    .input(z.object({ dealershipId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dealershipWeeklyTask.findMany({
        where: { dealershipId: input.dealershipId, isActive: true },
        orderBy: { createdAt: "asc" },
      });
    }),

  /** Add a weekly task */
  addWeeklyTask: orgAdminProcedure
    .input(z.object({
      dealershipId: z.string(),
      description: z.string().min(1),
      allocatedHoursPerWeek: z.number().min(0.5),
      weeklyRatePence: z.number().int().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const dealer = await ctx.prisma.dealership.findFirst({
        where: { id: input.dealershipId, organisationId: ctx.session.organisationId },
      });
      if (!dealer) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.dealershipWeeklyTask.create({ data: input });
    }),

  /** Update a weekly task */
  updateWeeklyTask: orgAdminProcedure
    .input(z.object({
      id: z.string(),
      description: z.string().min(1).optional(),
      allocatedHoursPerWeek: z.number().min(0.5).optional(),
      weeklyRatePence: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.dealershipWeeklyTask.update({ where: { id }, data });
    }),

  /** Remove a weekly task */
  removeWeeklyTask: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealershipWeeklyTask.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ── Valeter standing charges ────────────────────────────────────────────────

  /** List standing charges for a valeter */
  listStandingCharges: orgAdminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.valeterStandingCharge.findMany({
        where: { userId: input.userId, isActive: true },
        orderBy: { createdAt: "asc" },
      });
    }),

  /** Add a standing charge for a valeter */
  addStandingCharge: orgAdminProcedure
    .input(z.object({
      userId: z.string(),
      description: z.string().min(1),
      ratePence: z.number().int().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.valeterStandingCharge.create({
        data: {
          userId: input.userId,
          description: input.description.trim(),
          ratePence: input.ratePence,
        },
      });
    }),

  /** Update a standing charge */
  updateStandingCharge: orgAdminProcedure
    .input(z.object({
      id: z.string(),
      description: z.string().min(1).optional(),
      ratePence: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.valeterStandingCharge.update({ where: { id }, data });
    }),

  /** Deactivate (soft-delete) a standing charge */
  removeStandingCharge: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.valeterStandingCharge.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),
});
