import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { BookingStatus, type Prisma } from "@ivaleter/db";
import {
  router,
  protectedProcedure,
  dealershipProcedure,
  orgAdminProcedure,
} from "../trpc";

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
          date: z.date().optional(),
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
      if (input?.date) {
        const d = new Date(input.date);
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        where.readyByTime = { gte: start, lte: end };
      } else if (input?.dateFrom || input?.dateTo) {
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
      return booking;
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
        customerName: z.string().min(1),
        readyByTime: z.date(),
        isPriority: z.boolean().default(false),
        includeInspection: z.boolean().default(false),
        includeFreshScent: z.boolean().default(false),
        paintProtectionTier: z
          .enum(["essential", "standard", "premium", "ultimate"])
          .nullish(),
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
          customerName: input.customerName.trim(),
          readyByTime: input.readyByTime,
          isPriority: input.isPriority,
          includeInspection: input.includeInspection,
          includeFreshScent: input.includeFreshScent,
          paintProtectionTier: input.paintProtectionTier ?? null,
          createdById: ctx.session.userId,
          status: BookingStatus.PENDING,
        },
      });
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

  /** Store a single inspection/job photo against a booking. */
  uploadPhoto: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        photoData: z.string().min(1),
        type: z.string().min(1),
        stage: z.enum(["pre_valet", "post_valet"]).default("pre_valet"),
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
});
