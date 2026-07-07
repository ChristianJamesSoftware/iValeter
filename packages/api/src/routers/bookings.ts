import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { BookingStatus, type Prisma } from "@ivaleter/db";
import {
  router,
  protectedProcedure,
  dealershipProcedure,
  orgAdminProcedure,
  valeterProcedure,
} from "../trpc";
import { resolveVehicleSizeValues, DEFAULT_SIZE_CONFIGS } from "./vehicle-size-config";

const statusEnum = z.nativeEnum(BookingStatus);

/** Valid forward transitions a valeter can drive from the PWA. */
const VALETER_TRANSITIONS: Record<string, BookingStatus | null> = {
  ASSIGNED: BookingStatus.IN_PROGRESS,
  IN_PROGRESS: BookingStatus.QC_CHECK,
  QC_CHECK: BookingStatus.COMPLETED,
};

/**
 * Build the org-isolation scope for the current session.
 * EVERY booking query merges this in — multi-tenancy is enforced here.
 */
function scopeFor(session: {
  organisationId: string;
  role: string;
  siteId: string | null;
  userId: string;
}): Prisma.BookingWhereInput {
  const base: Prisma.BookingWhereInput = {
    organisationId: session.organisationId,
  };
  if (session.role === "dealership_user" && session.siteId) {
    base.siteId = session.siteId;
  }
  if (session.role === "valeter") {
    base.assignedToId = session.userId;
  }
  return base;
}

export const bookingsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          siteId: z.string().optional(),
          departmentId: z.string().optional(),
          status: statusEnum.optional(),
          isPriority: z.boolean().optional(),
          assignedToId: z.string().optional(),
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.BookingWhereInput = scopeFor(ctx.session);
      if (input?.siteId) where.siteId = input.siteId;
      if (input?.departmentId) where.departmentId = input.departmentId;
      if (input?.status) where.status = input.status;
      if (input?.isPriority !== undefined) where.isPriority = input.isPriority;
      if (input?.assignedToId) where.assignedToId = input.assignedToId;
      if (input?.dateFrom || input?.dateTo) {
        where.readyByTime = {};
        if (input.dateFrom) where.readyByTime.gte = input.dateFrom;
        if (input.dateTo) where.readyByTime.lte = input.dateTo;
      }
      if (input?.search) {
        where.OR = [
          { vehicleReg: { contains: input.search, mode: "insensitive" } },
          { customerName: { contains: input.search, mode: "insensitive" } },
        ];
      }

      return ctx.prisma.booking.findMany({
        where,
        include: {
          site: true,
          department: true,
          serviceType: true,
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: [{ isPriority: "desc" }, { readyByTime: "asc" }],
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findFirst({
        where: { id: input.id, ...scopeFor(ctx.session) },
        include: {
          site: true,
          department: true,
          serviceType: true,
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          statusHistory: {
            orderBy: { createdAt: "asc" },
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      const daysInPrep = booking.completedAt
        ? Math.ceil((booking.completedAt.getTime() - booking.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : Math.ceil((Date.now() - booking.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      return { ...booking, daysInPrep };
    }),

  create: dealershipProcedure
    .input(
      z.object({
        siteId: z.string(),
        departmentId: z.string(),
        serviceTypeId: z.string(),
        vehicleReg: z.string().min(1).max(12),
        vehicleMake: z.string().optional(),
        vehicleModel: z.string().optional(),
        vehicleColour: z.string().optional(),
        customerName: z.string().optional(),
        readyByTime: z.date(),
        isPriority: z.boolean().default(false),
        includeInspection: z.boolean().default(false),
        includeFreshScent: z.boolean().default(false),
        paintProtectionTier: z
          .enum(["essential", "standard", "premium", "ultimate"])
          .nullish(),
        paintProtectionProductId: z.string().nullish(),
        photographyPackage: z.enum(["standard", "premium", "full"]).nullish(),
        vehicleSize: z.enum(["SMALL", "MEDIUM", "LARGE", "XL", "VAN"]).optional(),
        doNotClean: z.boolean().default(false),
        budgetLimit: z.number().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // dealership_user can only create for their own site
      if (
        ctx.session.role === "dealership_user" &&
        ctx.session.siteId !== input.siteId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot create bookings for another site",
        });
      }

      const site = await ctx.prisma.site.findFirst({
        where: { id: input.siteId, organisationId: ctx.session.organisationId },
      });
      if (!site) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
      }

      // Resolve size-adjusted price and duration
      const [serviceType, sizeConfigs] = await Promise.all([
        ctx.prisma.serviceType.findUnique({
          where: { id: input.serviceTypeId },
          select: { durationMins: true, chargeRate: true },
        }),
        ctx.prisma.orgVehicleSizeConfig.findMany({
          where: { organisationId: ctx.session.organisationId },
        }),
      ]);

      const { resolvedDurationMins, resolvedPricePence } = resolveVehicleSizeValues(
        sizeConfigs,
        serviceType?.durationMins ?? 60,
        serviceType?.chargeRate,
        input.vehicleSize ?? "LARGE",
      );

      return ctx.prisma.booking.create({
        data: {
          organisationId: ctx.session.organisationId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          serviceTypeId: input.serviceTypeId,
          vehicleReg: input.vehicleReg.toUpperCase().trim(),
          vehicleMake: input.vehicleMake,
          vehicleModel: input.vehicleModel,
          vehicleColour: input.vehicleColour,
          customerName: input.customerName?.trim() ?? "",
          readyByTime: input.readyByTime,
          isPriority: input.isPriority,
          includeInspection: input.includeInspection,
          includeFreshScent: input.includeFreshScent,
          paintProtectionTier: input.paintProtectionTier ?? null,
          paintProtectionProductId: input.paintProtectionProductId ?? null,
          photographyPackage: input.photographyPackage ?? null,
          vehicleSize: input.vehicleSize ?? "LARGE",
          resolvedDurationMins,
          resolvedPricePence,
          doNotClean: input.doNotClean,
          budgetLimit: input.budgetLimit ?? null,
          createdById: ctx.session.userId,
          status: BookingStatus.PENDING,
        },
      });
    }),

  /**
   * Valeter: list service types available for their organisation (for the add-job form).
   */
  valeterListServiceTypes: valeterProcedure
    .query(async ({ ctx }) => {
      // Must be scoped to the valeter's assigned site — never fall back to org-wide.
      if (!ctx.session.siteId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not assigned to a site. Please ask your manager to assign you to a site and log out then back in.",
        });
      }

      return ctx.prisma.serviceType.findMany({
        where: {
          department: { site: { id: ctx.session.siteId, organisationId: ctx.session.organisationId } },
          isActive: true,
        },
        select: { id: true, name: true, durationMins: true },
        orderBy: { name: "asc" },
      });
    }),

  /**
   * Valeter self-service: add a job directly from the valeter PWA.
   * Simpler than the dealership create — valeter picks reg, vehicle size, service type
   * and ready-by time. Job is created as PENDING on their own site, assigned to them.
   */
  valeterCreate: valeterProcedure
    .input(
      z.object({
        vehicleReg:    z.string().min(1).max(12),
        vehicleMake:   z.string().optional(),
        vehicleModel:  z.string().optional(),
        vehicleColour: z.string().optional(),
        vehicleSize:   z.enum(["SMALL", "MEDIUM", "LARGE", "XL", "VAN"]).default("LARGE"),
        serviceTypeId: z.string(),
        customerName:  z.string().optional(),
        keyNumber:     z.string().optional(),
        vehicleLocation: z.string().optional(),
        readyByTime:   z.string(), // ISO string — client sends local datetime string
        notes:         z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.siteId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be assigned to a site to add a job.",
        });
      }

      // Find the valeter's department (first department on their site)
      const site = await ctx.prisma.site.findFirst({
        where: { id: ctx.session.siteId, organisationId: ctx.session.organisationId },
        include: { departments: { take: 1, orderBy: { name: "asc" } } },
      });
      if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });

      const departmentId = site.departments[0]?.id;
      if (!departmentId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No department found for your site. Ask your manager to set one up.",
        });
      }

      // Resolve service type & size-adjusted pricing
      const [serviceType, sizeConfigs] = await Promise.all([
        ctx.prisma.serviceType.findFirst({
          where: {
            id: input.serviceTypeId,
            department: { site: { organisationId: ctx.session.organisationId } },
          },
          select: { id: true, durationMins: true, chargeRate: true },
        }),
        ctx.prisma.orgVehicleSizeConfig.findMany({
          where: { organisationId: ctx.session.organisationId },
        }),
      ]);
      if (!serviceType) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service type not found" });
      }

      const { resolvedDurationMins, resolvedPricePence } = resolveVehicleSizeValues(
        sizeConfigs,
        serviceType.durationMins ?? 60,
        serviceType.chargeRate,
        input.vehicleSize,
      );

      const booking = await ctx.prisma.booking.create({
        data: {
          organisationId:      ctx.session.organisationId,
          siteId:              ctx.session.siteId,
          departmentId,
          serviceTypeId:       input.serviceTypeId,
          vehicleReg:          input.vehicleReg.toUpperCase().trim(),
          vehicleMake:         input.vehicleMake?.trim() ?? null,
          vehicleModel:        input.vehicleModel?.trim() ?? null,
          vehicleColour:       input.vehicleColour?.trim() ?? null,
          vehicleSize:         input.vehicleSize,
          customerName:        input.customerName?.trim() ?? "",
          keyNumber:           input.keyNumber?.trim() ?? null,
          vehicleLocation:     input.vehicleLocation?.trim() ?? null,
          readyByTime:         new Date(input.readyByTime),
          resolvedDurationMins,
          resolvedPricePence,
          assignedToId:        ctx.session.userId, // auto-assign to the valeter
          createdById:         ctx.session.userId,
          status:              BookingStatus.ASSIGNED, // straight to ASSIGNED since valeter is adding it
        },
      });

      // Log the creation in status history
      await ctx.prisma.jobStatusHistory.create({
        data: {
          bookingId:  booking.id,
          fromStatus: null,
          toStatus:   BookingStatus.ASSIGNED,
          note:       "Job added by valeter via app",
          userId:     ctx.session.userId,
        },
      });

      return booking;
    }),

  /**
   * Valeter: accept a job — advances PENDING → ASSIGNED when the valeter opens it.
   * Safe to call repeatedly (no-op if already ASSIGNED or beyond).
   */
  valeterAccept: valeterProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findFirst({
        where: { id: input.id, assignedToId: ctx.session.userId },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.status !== BookingStatus.PENDING) return booking; // already past PENDING

      const updated = await ctx.prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.ASSIGNED },
      });
      await ctx.prisma.jobStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.ASSIGNED,
          userId: ctx.session.userId,
          note: "Accepted by valeter",
        },
      });
      return updated;
    }),

  /**
   * Valeter: self-assign a PENDING job on their site that has no assignee yet.
   * Also handles the case where they ARE already the assignee (idempotent).
   * Advances straight to ASSIGNED so they can start immediately.
   */
  valeterSelfAssign: valeterProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.siteId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No site assigned to your account" });
      }
      const booking = await ctx.prisma.booking.findFirst({
        where: {
          id: input.id,
          siteId: ctx.session.siteId,
          organisationId: ctx.session.organisationId,
          status: BookingStatus.PENDING,
        },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found or already taken" });

      const updated = await ctx.prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.ASSIGNED, assignedToId: ctx.session.userId },
      });
      await ctx.prisma.jobStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.ASSIGNED,
          userId: ctx.session.userId,
          note: "Self-assigned by valeter",
        },
      });
      return updated;
    }),

  /**
   * List bookings that are overdue — not COMPLETED/CANCELLED and readyByTime
   * was more than 48 hours ago. Used by the account manager reallocation view.
   */
  listOverdue: orgAdminProcedure.query(async ({ ctx }) => {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    return ctx.prisma.booking.findMany({
      where: {
        organisationId: ctx.session.organisationId,
        status: { notIn: [BookingStatus.COMPLETED, BookingStatus.CANCELLED] },
        readyByTime: { lt: cutoff },
      },
      include: {
        site:        { select: { id: true, name: true } },
        department:  { select: { id: true, name: true } },
        serviceType: { select: { id: true, name: true } },
        assignedTo:  { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { readyByTime: "asc" },
    });
  }),

  /**
   * Reallocate an overdue booking — reassign valeter and/or push the date.
   * Increments rollCount on every call so the job card tracks how many times
   * it has been rolled.
   */
  reallocate: orgAdminProcedure
    .input(
      z.object({
        bookingId:    z.string(),
        valeterId:    z.string().optional(),
        newReadyByTime: z.string(), // ISO string
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findFirst({
        where: { id: input.bookingId, organisationId: ctx.session.organisationId },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      // Validate valeter if provided
      if (input.valeterId) {
        const valeter = await ctx.prisma.user.findFirst({
          where: { id: input.valeterId, organisationId: ctx.session.organisationId, role: "valeter" },
        });
        if (!valeter) throw new TRPCError({ code: "NOT_FOUND", message: "Valeter not found" });
      }

      const updated = await ctx.prisma.booking.update({
        where: { id: booking.id },
        data: {
          readyByTime:  new Date(input.newReadyByTime),
          assignedToId: input.valeterId ?? booking.assignedToId,
          status:       booking.status === BookingStatus.PENDING && input.valeterId
                          ? BookingStatus.ASSIGNED
                          : booking.status,
          rollCount:    { increment: 1 },
          lastRolledAt: new Date(),
        },
      });

      await ctx.prisma.jobStatusHistory.create({
        data: {
          bookingId:  booking.id,
          userId:     ctx.session.userId,
          fromStatus: booking.status,
          toStatus:   updated.status,
          note:       `Reallocated (roll #${updated.rollCount}) — rescheduled to ${new Date(input.newReadyByTime).toLocaleDateString("en-GB")}${
                        input.valeterId ? " + reassigned" : ""
                      }`,
        },
      });

      return updated;
    }),

  /** Assign a valeter to a booking (org_admin / super_admin). */
  assign: orgAdminProcedure
    .input(z.object({ bookingId: z.string(), valeterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findFirst({
        where: {
          id: input.bookingId,
          organisationId: ctx.session.organisationId,
        },
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      const valeter = await ctx.prisma.user.findFirst({
        where: {
          id: input.valeterId,
          organisationId: ctx.session.organisationId,
          role: "valeter",
        },
      });
      if (!valeter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Valeter not found" });
      }

      const updated = await ctx.prisma.booking.update({
        where: { id: booking.id },
        data: {
          assignedToId: valeter.id,
          status:
            booking.status === BookingStatus.PENDING
              ? BookingStatus.ASSIGNED
              : booking.status,
        },
      });

      await ctx.prisma.jobStatusHistory.create({
        data: {
          bookingId: booking.id,
          userId: ctx.session.userId,
          fromStatus: booking.status,
          toStatus: updated.status,
          note: `Assigned to ${valeter.firstName} ${valeter.lastName}`,
        },
      });

      return updated;
    }),

  /** Advance/change a booking's status with history logging. */
  updateStatus: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        toStatus: statusEnum,
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findFirst({
        where: { id: input.bookingId, ...scopeFor(ctx.session) },
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      // Valeters may only follow the linear forward flow on their own jobs.
      if (ctx.session.role === "valeter") {
        const allowed = VALETER_TRANSITIONS[booking.status];
        if (!allowed || allowed !== input.toStatus) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot move job from ${booking.status} to ${input.toStatus}`,
          });
        }
      }

      // A required pre-valet inspection must be completed before work starts.
      if (
        input.toStatus === BookingStatus.IN_PROGRESS &&
        booking.includeInspection &&
        !booking.inspectionComplete
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Complete the vehicle inspection before starting this job",
        });
      }

      const completedAt =
        input.toStatus === BookingStatus.COMPLETED ? new Date() : booking.completedAt;

      const updated = await ctx.prisma.booking.update({
        where: { id: booking.id },
        data: { status: input.toStatus, completedAt },
      });

      await ctx.prisma.jobStatusHistory.create({
        data: {
          bookingId: booking.id,
          userId: ctx.session.userId,
          fromStatus: booking.status,
          toStatus: input.toStatus,
          note: input.note,
        },
      });

      return updated;
    }),

  /**
   * Dealer/org_admin: submit a quality score (1–5) and optional feedback note
   * on any booking belonging to their organisation.
   */
  submitQuality: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        qualityScore: z.number().int().min(1).max(5),
        qualityNote: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findFirst({
        where: { id: input.bookingId, ...scopeFor(ctx.session) },
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      return ctx.prisma.booking.update({
        where: { id: booking.id },
        data: {
          qualityScore: input.qualityScore,
          qualityNote: input.qualityNote ?? null,
        },
        select: { id: true, qualityScore: true, qualityNote: true },
      });
    }),

  /**
   * CSI score for the dealer's site — rolling window.
   * Returns average quality score, star breakdown, rated/total job count, and 7-day trend.
   */
  getCsiScore: dealershipProcedure
    .input(z.object({ days: z.number().int().min(7).max(365).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      const bookings = await ctx.prisma.booking.findMany({
        where: {
          ...scopeFor(ctx.session),
          status: "COMPLETED",
          completedAt: { gte: since },
        },
        select: { id: true, qualityScore: true, completedAt: true },
        orderBy: { completedAt: "asc" },
      });

      const rated = bookings.filter((b) => b.qualityScore !== null);
      const totalCompleted = bookings.length;
      const totalRated = rated.length;

      const avg =
        totalRated > 0
          ? Math.round((rated.reduce((s, b) => s + (b.qualityScore ?? 0), 0) / totalRated) * 10) / 10
          : null;

      // Star breakdown (1-5)
      const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const b of rated) {
        if (b.qualityScore) breakdown[b.qualityScore] = (breakdown[b.qualityScore] ?? 0) + 1;
      }

      // 7-day trend
      const trend: { date: string; avg: number | null; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const dayRated = rated.filter(
          (b) => b.completedAt && b.completedAt >= dayStart && b.completedAt <= dayEnd,
        );
        trend.push({
          date: dayStart.toISOString().slice(0, 10),
          avg: dayRated.length > 0
            ? Math.round((dayRated.reduce((s, b) => s + (b.qualityScore ?? 0), 0) / dayRated.length) * 10) / 10
            : null,
          count: dayRated.length,
        });
      }

      const coverageRate = totalCompleted > 0 ? Math.round((totalRated / totalCompleted) * 100) : 0;

      return { avg, totalRated, totalCompleted, coverageRate, breakdown, trend, days: input.days };
    }),

  /**
   * Photos for a booking. Dealership users only ever see photography-stage
   * photos — inspection photos are internal to the valeting company.
   */
  getPhotos: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findFirst({
        where: { id: input.bookingId, ...scopeFor(ctx.session) },
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      return ctx.prisma.jobPhoto.findMany({
        where: {
          bookingId: booking.id,
          ...(ctx.session.role === "dealership_user"
            ? { stage: "photography" }
            : {}),
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  /** Store a single inspection/job photo against a booking. */
  uploadPhoto: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        photoData: z.string().min(1),
        type: z.string().min(1),
        stage: z.enum(["pre_valet", "post_valet", "photography"]).default("pre_valet"),
        label: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findFirst({
        where: { id: input.bookingId, ...scopeFor(ctx.session) },
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      // MVP storage: keep the base64 payload inline as a data URL.
      const url = input.photoData.startsWith("data:")
        ? input.photoData
        : `data:image/jpeg;base64,${input.photoData}`;

      return ctx.prisma.jobPhoto.create({
        data: {
          bookingId: booking.id,
          url,
          type: input.type,
          stage: input.stage,
          label: input.label,
        },
      });
    }),

  /** Mark the pre-valet inspection as complete. */
  completeInspection: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findFirst({
        where: { id: input.bookingId, ...scopeFor(ctx.session) },
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      return ctx.prisma.booking.update({
        where: { id: booking.id },
        data: { inspectionComplete: true },
      });
    }),

  /** Confirm sensory add-ons were applied during job completion. */
  confirmAddOns: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        freshScentConfirmed: z.boolean().optional(),
        paintProtectionApplied: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findFirst({
        where: { id: input.bookingId, ...scopeFor(ctx.session) },
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      return ctx.prisma.booking.update({
        where: { id: booking.id },
        data: {
          freshScentConfirmed:
            input.freshScentConfirmed ?? booking.freshScentConfirmed,
          paintProtectionApplied:
            input.paintProtectionApplied ?? booking.paintProtectionApplied,
        },
      });
    }),
  /**
   * Edit an existing booking (customer/dealership side).
   * Only allowed while the booking has not been COMPLETED or CANCELLED.
   */
  update: dealershipProcedure
    .input(
      z.object({
        id: z.string(),
        serviceTypeId: z.string().optional(),
        vehicleReg: z.string().min(1).max(12).optional(),
        vehicleMake: z.string().optional(),
        vehicleModel: z.string().optional(),
        vehicleColour: z.string().optional(),
        customerName: z.string().min(1).optional(),
        readyByTime: z.date().optional(),
        keyNumber: z.string().optional(),
        vehicleLocation: z.string().optional(),
        vehicleSize: z.enum(["SMALL", "MEDIUM", "LARGE", "XL", "VAN"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;

      const booking = await ctx.prisma.booking.findFirst({
        where: { id, ...scopeFor(ctx.session) },
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      if (
        booking.status === BookingStatus.COMPLETED ||
        booking.status === BookingStatus.CANCELLED
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot edit a completed or cancelled booking",
        });
      }

      // If changing service type, verify it exists in the same org
      if (fields.serviceTypeId) {
        const st = await ctx.prisma.serviceType.findFirst({
          where: {
            id: fields.serviceTypeId,
            department: { site: { organisationId: ctx.session.organisationId } },
          },
        });
        if (!st) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Service type not found",
          });
        }
      }

      const updated = await ctx.prisma.booking.update({
        where: { id: booking.id },
        data: {
          ...(fields.serviceTypeId && { serviceTypeId: fields.serviceTypeId }),
          ...(fields.vehicleReg && { vehicleReg: fields.vehicleReg.toUpperCase().trim() }),
          ...(fields.vehicleMake !== undefined && { vehicleMake: fields.vehicleMake }),
          ...(fields.vehicleModel !== undefined && { vehicleModel: fields.vehicleModel }),
          ...(fields.vehicleColour !== undefined && { vehicleColour: fields.vehicleColour }),
          ...(fields.customerName && { customerName: fields.customerName.trim() }),
          ...(fields.readyByTime && { readyByTime: fields.readyByTime }),
          ...(fields.keyNumber !== undefined && { keyNumber: fields.keyNumber }),
          ...(fields.vehicleLocation !== undefined && { vehicleLocation: fields.vehicleLocation }),
          ...(fields.vehicleSize !== undefined && { vehicleSize: fields.vehicleSize }),
        },
        include: { serviceType: true, site: true, department: true },
      });

      await ctx.prisma.jobStatusHistory.create({
        data: {
          bookingId: booking.id,
          userId: ctx.session.userId,
          fromStatus: booking.status,
          toStatus: booking.status,
          note: "Booking details updated",
        },
      });

      return updated;
    }),

  /** Valeter: drop GPS pin for parking location */
  confirmParking: protectedProcedure
    .input(z.object({
      bookingId: z.string(),
      lat: z.number(),
      lng: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findFirst({
        where: { id: input.bookingId, ...scopeFor(ctx.session) },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      return ctx.prisma.booking.update({
        where: { id: input.bookingId },
        data: {
          parkingLat: input.lat,
          parkingLng: input.lng,
          parkingConfirmedAt: new Date(),
        },
      });
    }),

  /** Check for duplicate active booking by vehicleReg in the same org */
  checkDuplicate: dealershipProcedure
    .input(z.object({ vehicleReg: z.string().min(1), siteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.prisma.booking.findFirst({
        where: {
          vehicleReg: input.vehicleReg.toUpperCase().trim(),
          organisationId: ctx.session.organisationId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        select: {
          id: true,
          vehicleReg: true,
          customerName: true,
          status: true,
          site: { select: { name: true } },
          createdAt: true,
        },
      });
      return existing ?? null;
    }),

  /**
   * Get daily allocation for a site on a given date.
   * Returns total booked minutes per valeter and an over-allocation flag
   * if any valeter exceeds their daily capacity (default 8h = 480 mins).
   */
  getDayAllocation: dealershipProcedure
    .input(
      z.object({
        siteId: z.string(),
        date: z.date(),
        capacityMinsPerValeter: z.number().default(480), // 8 hours
      }),
    )
    .query(async ({ ctx, input }) => {
      const dayStart = new Date(input.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(input.date);
      dayEnd.setHours(23, 59, 59, 999);

      // All non-cancelled bookings for this site on this day
      const bookings = await ctx.prisma.booking.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          siteId: input.siteId,
          readyByTime: { gte: dayStart, lte: dayEnd },
          status: { not: BookingStatus.CANCELLED },
        },
        include: {
          serviceType: { select: { durationMins: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Use resolvedDurationMins if set, else fall back to serviceType.durationMins
      const effectiveMins = (b: { resolvedDurationMins: number | null; serviceType: { durationMins: number } }) =>
        b.resolvedDurationMins ?? b.serviceType.durationMins;

      // Total minutes booked for the day (all valeters combined, for the site)
      const totalBookedMins = bookings.reduce(
        (sum, b) => sum + effectiveMins(b),
        0,
      );

      // Per-valeter breakdown (only assigned bookings)
      const valeterMap: Record<
        string,
        { name: string; bookedMins: number; bookingCount: number }
      > = {};

      for (const b of bookings) {
        if (!b.assignedTo) continue;
        const vid = b.assignedTo.id;
        if (!valeterMap[vid]) {
          valeterMap[vid] = {
            name: `${b.assignedTo.firstName} ${b.assignedTo.lastName}`,
            bookedMins: 0,
            bookingCount: 0,
          };
        }
        valeterMap[vid].bookedMins += effectiveMins(b);
        valeterMap[vid].bookingCount += 1;
      }

      const capacityMins = input.capacityMinsPerValeter;
      const overAllocatedValeters = Object.entries(valeterMap)
        .filter(([, v]) => v.bookedMins > capacityMins)
        .map(([id, v]) => ({ id, ...v }));

      return {
        date: input.date,
        siteId: input.siteId,
        totalBookings: bookings.length,
        totalBookedMins,
        capacityMinsPerValeter: capacityMins,
        isOverAllocated: overAllocatedValeters.length > 0,
        overAllocatedValeters,
        valeterBreakdown: Object.entries(valeterMap).map(([id, v]) => ({
          id,
          ...v,
          isOverCapacity: v.bookedMins > capacityMins,
        })),
      };
    }),

  bulkCreate: dealershipProcedure
    .input(
      z.object({
        siteId: z.string(),
        rows: z.array(
          z.object({
            vehicleReg: z.string().min(1).max(12),
            customerName: z.string().optional(),
            readyByTime: z.date(),
            departmentId: z.string(),
            serviceTypeId: z.string(),
            vehicleSize: z.enum(["SMALL", "MEDIUM", "LARGE", "XL", "VAN"]).optional(),
          }),
        ).min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Scope check
      if (ctx.session.role === "dealership_user" && ctx.session.siteId !== input.siteId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create bookings for another site" });
      }
      const site = await ctx.prisma.site.findFirst({
        where: { id: input.siteId, organisationId: ctx.session.organisationId },
      });
      if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });

      const sizeConfigs = await ctx.prisma.orgVehicleSizeConfig.findMany({
        where: { organisationId: ctx.session.organisationId },
      });

      let created = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i]!;
        try {
          const serviceType = await ctx.prisma.serviceType.findUnique({
            where: { id: row.serviceTypeId },
            select: { durationMins: true, chargeRate: true },
          });
          const { resolvedDurationMins, resolvedPricePence } = resolveVehicleSizeValues(
            sizeConfigs,
            serviceType?.durationMins ?? 60,
            serviceType?.chargeRate,
            row.vehicleSize ?? "LARGE",
          );
          await ctx.prisma.booking.create({
            data: {
              organisationId: ctx.session.organisationId,
              siteId: input.siteId,
              departmentId: row.departmentId,
              serviceTypeId: row.serviceTypeId,
              vehicleReg: row.vehicleReg.toUpperCase().trim(),
              customerName: row.customerName?.trim() ?? "",
              readyByTime: row.readyByTime,
              vehicleSize: row.vehicleSize ?? "LARGE",
              resolvedDurationMins,
              resolvedPricePence,
              status: BookingStatus.PENDING,
              createdById: ctx.session.userId,
            },
          });
          created++;
        } catch {
          errors.push({ row: i + 1, message: `Row ${i + 1}: failed to create booking for ${row.vehicleReg}` });
        }
      }

      return { created, errors };
    }),
});
