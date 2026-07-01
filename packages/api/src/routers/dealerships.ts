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
      const isSuperAdmin = ctx.session.role === "super_admin";
      const d = await ctx.prisma.dealership.findFirst({
        where: {
          id: input.id,
          ...(isSuperAdmin ? {} : { organisationId: ctx.session.organisationId }),
        },
        include: {
          organisation: { select: { id: true, name: true } },
          sites: {
            include: {
              departments: {
                include: { serviceTypes: { where: { isActive: true } } },
              },
              users: {
                where: { isActive: true },
                select: { id: true, firstName: true, lastName: true, role: true, payId: true, staffType: true, siteId: true, email: true, organisationId: true },
                orderBy: { firstName: "asc" },
              },
              vehicleSizeRates: {
                include: { serviceType: { select: { id: true, name: true } } },
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

  /** Update dealership details including special instructions */
  updateDetails: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().optional(),
        contactPhone: z.string().optional(),
        specialInstructions: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isSuperAdmin = ctx.session.role === "super_admin";
      const d = await ctx.prisma.dealership.findFirst({
        where: {
          id: input.id,
          ...(isSuperAdmin ? {} : { organisationId: ctx.session.organisationId }),
        },
      });
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Dealership not found" });
      const { id, ...data } = input;
      return ctx.prisma.dealership.update({ where: { id }, data });
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

  /**
   * Super admin: add a valet type (service type) to every department
   * across all sites belonging to a dealership.
   */
  addServiceType: superAdminProcedure
    .input(
      z.object({
        dealershipId: z.string(),
        name: z.string().min(1),
        durationMins: z.number().int().min(1).max(600),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Resolve all departments under this dealership's sites
      const dealership = await ctx.prisma.dealership.findUnique({
        where: { id: input.dealershipId },
        include: {
          sites: { include: { departments: { select: { id: true } } } },
        },
      });
      if (!dealership) throw new TRPCError({ code: "NOT_FOUND", message: "Dealership not found" });

      const departments = dealership.sites.flatMap((s) => s.departments);
      if (departments.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No departments exist on this dealership\u2019s sites. Add a site and department first.",
        });
      }

      await ctx.prisma.serviceType.createMany({
        data: departments.map((d) => ({
          departmentId: d.id,
          name: input.name.trim(),
          durationMins: input.durationMins,
        })),
      });

      return { ok: true, count: departments.length };
    }),

  /**
   * Super admin: list all active dealerships with their site users,
   * so we can pick a user to impersonate for the "Preview Dealer View" flow.
   */
  listAllWithUsers: superAdminProcedure.query(async ({ ctx }) => {
    const dealerships = await ctx.prisma.dealership.findMany({
      where: { isActive: true },
      include: {
        organisation: { select: { id: true, name: true } },
        sites: {
          select: {
            id: true,
            name: true,
            users: {
              where: {
                isActive: true,
                role: { in: ["dealership_user", "org_admin"] },
              },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                organisationId: true,
                siteId: true,
              },
              take: 1, // only need one per site
            },
          },
        },
      },
      orderBy: [{ organisation: { name: "asc" } }, { name: "asc" }],
    });

    return dealerships.map((d) => {
      // Return each site with its preview user so the UI can offer a site picker
      const sites = d.sites.map((s) => {
        const previewUser =
          s.users.find((u) => u.role === "dealership_user") ??
          s.users.find((u) => u.role === "org_admin") ??
          null;
        return {
          id: s.id,
          name: s.name,
          previewUser,
        };
      }).filter((s) => s.previewUser !== null); // only include sites that have a usable user

      return {
        id: d.id,
        name: d.name,
        organisationId: d.organisationId,
        organisationName: d.organisation.name,
        sites,
      };
    });
  }),
});
