import { z } from "zod";
import { Prisma } from "@ivaleter/db";
import { TRPCError } from "@trpc/server";
import { Role } from "@ivaleter/db";
import { router, protectedProcedure, orgAdminProcedure, superAdminProcedure, dealershipProcedure } from "../trpc";
import { hashPassword } from "../auth";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function generatePayId(firstName: string, lastName: string): string {
  const f = firstName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
  const l = lastName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
  return `${f}.${l}`;
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
          isActive: true,
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
        mobile: v.mobile,
        payId: v.payId,
        dailyRate: v.dailyRate,
        dailyDeductions: v.dailyDeductions,
        startDate: v.startDate,
        contractComplete: v.contractComplete,
        jobsToday: countMap.get(v.id) ?? 0,
      }));
    }),

  list: orgAdminProcedure
    .input(z.object({ role: z.nativeEnum(Role).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.user.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          isActive: true,
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
        password: z.string().min(6).optional(), // omit to auto-generate a temp password
        role: z.nativeEnum(Role),
        siteId: z.string().optional(),
        skills: z.array(z.string()).default([]),
        mobile: z.string().optional(),
        payId: z.string().optional(),
        dailyRate: z.number().optional(),
        dailyDeductions: z.number().optional(),
        startDate: z.string().optional(),
        contractComplete: z.boolean().optional(),
        jobTitle: z.string().optional(),
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

      // If no password supplied, generate a secure random temp password
      // and set a password-reset token so the user must set their own on first login
      const { randomBytes } = await import("crypto");
      const tempPassword = input.password ?? randomBytes(16).toString("hex");
      const needsReset = !input.password;
      const resetToken = needsReset ? randomBytes(32).toString("hex") : null;
      const resetExpiry = needsReset
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        : null;

      return ctx.prisma.user.create({
        data: {
          organisationId: ctx.session.organisationId,
          email: input.email.toLowerCase().trim(),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash: hashPassword(tempPassword),
          passwordResetToken: resetToken,
          passwordResetExpiresAt: resetExpiry,
          role: input.role,
          siteId: input.siteId ?? null,
          skills: input.skills,
          mobile: input.mobile ?? null,
          payId:
            input.payId?.trim() ||
            generatePayId(input.firstName, input.lastName),
          dailyRate: input.dailyRate ?? null,
          dailyDeductions: input.dailyDeductions ?? null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          contractComplete: input.contractComplete ?? false,
          jobTitle: input.jobTitle ?? null,
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
        mobile: z.string().optional(),
        payId: z.string().optional(),
        dailyRate: z.number().optional(),
        dailyDeductions: z.number().optional(),
        startDate: z.string().optional(),
        contractComplete: z.boolean().optional(),
        jobTitle: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const { id, startDate, ...rest } = input;
      return ctx.prisma.user.update({
        where: { id },
        data: {
          ...rest,
          ...(startDate !== undefined
            ? { startDate: startDate ? new Date(startDate) : null }
            : {}),
        },
      });
    }),
  /**
   * Returns today's clock-in status for each valeter at a site.
   * Used by Ops Centre to show green/red status and flag late arrivals.
   */
  clockStatusToday: orgAdminProcedure
    .input(z.object({ siteId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const today = startOfToday();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // All active valeters for the org (optionally filtered by site)
      const valeters = await ctx.prisma.user.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          role: Role.valeter,
          isActive: true,
          ...(input.siteId ? { siteId: input.siteId } : {}),
        },
        select: { id: true, firstName: true, lastName: true, siteId: true },
      });

      // All clock events for these valeters today
      const events = await ctx.prisma.clockEvent.findMany({
        where: {
          userId: { in: valeters.map((v) => v.id) },
          timestamp: { gte: today, lt: tomorrow },
        },
        orderBy: { timestamp: "asc" },
      });

      // Build a map: userId -> earliest CLOCK_IN today
      const clockInMap = new Map<string, Date>();
      for (const e of events) {
        if (e.type === "CLOCK_IN" && !clockInMap.has(e.userId)) {
          clockInMap.set(e.userId, e.timestamp);
        }
      }

      // 8:15 AM threshold
      const cutoff = new Date(today);
      cutoff.setHours(8, 15, 0, 0);
      const now = new Date();

      return valeters.map((v) => {
        const clockedInAt = clockInMap.get(v.id) ?? null;
        const isClockedIn = clockedInAt !== null;
        const isLate = !isClockedIn && now > cutoff; // past 8:15 and still not in

        return {
          id: v.id,
          firstName: v.firstName,
          lastName: v.lastName,
          siteId: v.siteId,
          isClockedIn,
          clockedInAt,
          isLate, // needs flagging red + alert
        };
      });
    }),

  /** Valeter: clock in */
  clockIn: protectedProcedure
    .input(
      z.object({
        lat: z.number().optional(),
        lng: z.number().optional(),
      }).optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const siteId = ctx.session.siteId;
      if (!siteId) throw new TRPCError({ code: "BAD_REQUEST", message: "No site assigned" });
      return ctx.prisma.clockEvent.create({
        data: {
          userId: ctx.session.userId,
          siteId,
          type: "CLOCK_IN",
          timestamp: new Date(),
          lat: input?.lat ?? null,
          lng: input?.lng ?? null,
        },
      });
    }),

  /** Valeter: clock out */
  clockOut: protectedProcedure
    .input(
      z.object({
        lat: z.number().optional(),
        lng: z.number().optional(),
      }).optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const siteId = ctx.session.siteId;
      if (!siteId) throw new TRPCError({ code: "BAD_REQUEST", message: "No site assigned" });
      return ctx.prisma.clockEvent.create({
        data: {
          userId: ctx.session.userId,
          siteId,
          type: "CLOCK_OUT",
          timestamp: new Date(),
          lat: input?.lat ?? null,
          lng: input?.lng ?? null,
        },
      });
    }),

  /** Super admin: list ALL valeters across every org */
  listAllValeters: superAdminProcedure
    .input(z.object({ showInactive: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.user.findMany({
        where: {
          role: "valeter",
          ...(input?.showInactive ? {} : { isActive: true }),
        },
        include: {
          site: { select: { id: true, name: true } },
          organisation: { select: { id: true, name: true } },
        },
        orderBy: [{ organisation: { name: "asc" } }, { firstName: "asc" }],
      });
    }),

  /** Super admin: get a single valeter's full profile */
  getValeterById: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findFirst({
        where: { id: input.id, role: "valeter" },
        include: {
          site: { select: { id: true, name: true } },
          organisation: { select: { id: true, name: true } },
        },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Valeter not found" });
      return user;
    }),

  /** Super admin: set a valeter's password directly (no email required) */
  setValeterPassword: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        password: z.string().min(6, "Password must be at least 6 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findFirst({
        where: { id: input.id, role: "valeter" },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Valeter not found" });
      await ctx.prisma.user.update({
        where: { id: input.id },
        data: {
          passwordHash: hashPassword(input.password),
          // clear any pending reset token so they can log in immediately
          passwordResetToken: null,
          passwordResetExpiresAt: null,
          isActive: true,
        },
      });
      return { ok: true };
    }),

  /** Super admin: update any user (no org scope restriction) */
  superAdminUpdate: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        mobile: z.string().nullable().optional(),
        payId: z.string().nullable().optional(),
        jobTitle: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        workingDays: z.array(z.string()).optional(),
        contractedHours: z.number().nullable().optional(),
        saturdayHalfDay: z.boolean().optional(),
        dayHours: z.record(z.string(), z.number()).nullable().optional(),
        shiftStartTime: z.string().nullable().optional(),
        shiftEndTime: z.string().nullable().optional(),
        dailyRate: z.number().nullable().optional(),
        dailyDeductions: z.number().nullable().optional(),
        startDate: z.string().nullable().optional(),
        contractComplete: z.boolean().optional(),
        bankSortCode: z.string().nullable().optional(),
        bankAccountNumber: z.string().nullable().optional(),
        bankAccountName: z.string().nullable().optional(),
        bankReference: z.string().nullable().optional(),
        skills: z.array(z.string()).optional(),
        siteId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, startDate, dayHours, ...rest } = input;
      const user = await ctx.prisma.user.findUnique({ where: { id } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Prisma.UserUpdateInput = rest as any;
      if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
      if (dayHours !== undefined) data.dayHours = dayHours ?? Prisma.JsonNull;
      return ctx.prisma.user.update({ where: { id }, data });
    }),

  /** Super admin: create a user on any site/org (for adding site team members from dealership card) */
  superAdminCreate: superAdminProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        password: z.string().min(6).optional(),
        role: z.nativeEnum(Role),
        organisationId: z.string(),
        siteId: z.string().optional(),
        mobile: z.string().optional(),
        payId: z.string().optional(),
        jobTitle: z.string().optional(),
        dailyRate: z.number().optional(),
        dailyDeductions: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase().trim() },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
      const { randomBytes } = await import("crypto");
      const tempPassword = input.password ?? randomBytes(16).toString("hex");
      const needsReset = !input.password;
      const resetToken = needsReset ? randomBytes(32).toString("hex") : null;
      const resetExpiry = needsReset ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;
      return ctx.prisma.user.create({
        data: {
          organisationId: input.organisationId,
          email: input.email.toLowerCase().trim(),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash: hashPassword(tempPassword),
          passwordResetToken: resetToken,
          passwordResetExpiresAt: resetExpiry,
          role: input.role,
          siteId: input.siteId ?? null,
          mobile: input.mobile ?? null,
          payId: input.payId?.trim() || generatePayId(input.firstName, input.lastName),
          jobTitle: input.jobTitle ?? null,
          dailyRate: input.dailyRate ?? null,
          dailyDeductions: input.dailyDeductions ?? null,
        },
      });
    }),

  /** Super admin: list all management team members */
  listManagementTeam: superAdminProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.user.findMany({
        where: { role: "management", isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          jobTitle: true,
          managementRole: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: [{ managementRole: "asc" }, { firstName: "asc" }],
      });
    }),

  /** Super admin: create a management team member */
  createManagementUser: superAdminProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        password: z.string().min(6),
        managementRole: z.enum(["ADMINISTRATION", "ACCOUNTANT", "ACCOUNT_MANAGER", "COO", "CEO"]),
        mobile: z.string().optional(),
        jobTitle: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase().trim() },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
      // Attach to Total Valeting org
      const tvOrg = await ctx.prisma.organisation.findFirst({
        where: { name: { contains: "Total Valeting", mode: "insensitive" } },
        select: { id: true },
      });
      if (!tvOrg) throw new TRPCError({ code: "NOT_FOUND", message: "Total Valeting organisation not found" });
      return ctx.prisma.user.create({
        data: {
          organisationId: tvOrg.id,
          email: input.email.toLowerCase().trim(),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash: hashPassword(input.password),
          role: "management",
          managementRole: input.managementRole,
          mobile: input.mobile ?? null,
          jobTitle: input.jobTitle ?? null,
          payId: generatePayId(input.firstName, input.lastName),
        },
      });
    }),

  /** Super admin: update a management team member */
  updateManagementUser: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        mobile: z.string().nullable().optional(),
        jobTitle: z.string().nullable().optional(),
        managementRole: z.enum(["ADMINISTRATION", "ACCOUNTANT", "ACCOUNT_MANAGER", "COO", "CEO"]).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      return ctx.prisma.user.update({ where: { id }, data: rest });
    }),

  /** Super admin: remove management team member (soft delete) */
  deactivateManagementUser: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { isActive: false, archivedAt: new Date() },
      });
    }),


  /** Dealership: list users on their own site (for customer-side user management) */
  /** Super admin: list ALL dealership_user accounts across every org */
  listAllDealershipUsers: superAdminProcedure
    .input(z.object({ showInactive: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.user.findMany({
        where: {
          role: "dealership_user",
          ...(input?.showInactive ? {} : { isActive: true }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          jobTitle: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          site: { select: { id: true, name: true } },
          organisation: { select: { id: true, name: true } },
        },
        orderBy: [{ organisation: { name: "asc" } }, { firstName: "asc" }],
      });
    }),

  listDealershipUsers: dealershipProcedure
    .query(async ({ ctx }) => {
      const session = ctx.session!;
      // Find which dealership this user belongs to via their site
      const user = await ctx.prisma.user.findUnique({
        where: { id: session.userId },
        include: { site: { include: { dealership: true } } },
      });
      if (!user?.site?.dealership)
        throw new TRPCError({ code: "FORBIDDEN", message: "No dealership found for this user" });

      const dealership = user.site.dealership;
      const siteIds = await ctx.prisma.site.findMany({
        where: { dealershipId: dealership.id },
        select: { id: true },
      });

      return ctx.prisma.user.findMany({
        where: {
          siteId: { in: siteIds.map((s) => s.id) },
          role: "dealership_user",
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          jobTitle: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          site: { select: { id: true, name: true } },
        },
        orderBy: { firstName: "asc" },
      });
    }),

  /** Dealership: add a user to their own dealership */
  addDealershipUser: dealershipProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        password: z.string().min(6),
        siteId: z.string(),
        jobTitle: z.string().optional(),
        mobile: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      // Verify siteId belongs to caller's dealership
      const callerUser = await ctx.prisma.user.findUnique({
        where: { id: session.userId },
        include: { site: { include: { dealership: { include: { sites: { select: { id: true } } } } } } },
      });
      const allowedSiteIds = callerUser?.site?.dealership?.sites.map((s) => s.id) ?? [];
      if (!allowedSiteIds.includes(input.siteId))
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only add users to your own dealership's sites" });

      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase().trim() },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });

      const site = await ctx.prisma.site.findUnique({
        where: { id: input.siteId },
        select: { organisationId: true },
      });
      if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });

      return ctx.prisma.user.create({
        data: {
          organisationId: site.organisationId,
          siteId: input.siteId,
          email: input.email.toLowerCase().trim(),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash: hashPassword(input.password),
          role: "dealership_user",
          jobTitle: input.jobTitle ?? null,
          mobile: input.mobile ?? null,
          payId: generatePayId(input.firstName, input.lastName),
        },
      });
    }),

  /** Dealership: remove (deactivate) a user from their own dealership */
  removeDealershipUser: dealershipProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      // Verify target user belongs to same dealership
      const callerUser = await ctx.prisma.user.findUnique({
        where: { id: session.userId },
        include: { site: { include: { dealership: { include: { sites: { select: { id: true } } } } } } },
      });
      const allowedSiteIds = callerUser?.site?.dealership?.sites.map((s) => s.id) ?? [];

      const target = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        select: { siteId: true, role: true },
      });
      if (!target || !allowedSiteIds.includes(target.siteId ?? ""))
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot remove this user" });
      if (target.role !== "dealership_user")
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only remove dealership users" });

      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { isActive: false, archivedAt: new Date() },
      });
    }),


  /** Super admin: list all accidents for a valeter */
  listAccidents: superAdminProcedure
    .input(z.object({ valeterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.valeterAccident.findMany({
        where: { valeterId: input.valeterId },
        orderBy: { incidentDate: "desc" },
      });
    }),

  /** Super admin: add a new accident record */
  addAccident: superAdminProcedure
    .input(z.object({
      valeterId: z.string(),
      incidentDate: z.string(),
      vehicleReg: z.string().min(1),
      description: z.string().min(1),
      excessAmount: z.number().default(1000),
      weeklyDeduction: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.valeterAccident.create({
        data: {
          valeterId: input.valeterId,
          incidentDate: new Date(input.incidentDate),
          vehicleReg: input.vehicleReg.toUpperCase().trim(),
          description: input.description,
          excessAmount: input.excessAmount,
          weeklyDeduction: input.weeklyDeduction ?? null,
        },
      });
    }),

  /** Super admin: update deduction / settle an accident */
  updateAccidentDeduction: superAdminProcedure
    .input(z.object({
      id: z.string(),
      totalDeducted: z.number().optional(),
      weeklyDeduction: z.number().nullable().optional(),
      settled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.valeterAccident.update({
        where: { id },
        data: {
          ...(data.totalDeducted !== undefined && { totalDeducted: data.totalDeducted }),
          ...(data.weeklyDeduction !== undefined && { weeklyDeduction: data.weeklyDeduction ?? null }),
          ...(data.settled !== undefined && { settled: data.settled }),
        },
      });
    }),

});
// Note: router registration via root.ts
