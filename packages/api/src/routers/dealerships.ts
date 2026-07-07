import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, orgAdminProcedure, superAdminProcedure } from "../trpc";

export const dealershipsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Total Valeting manages sites that are linked to dealerships.
    // Dealerships belong to their own organisations (e.g. "Wollaston BMW Group"),
    // NOT to Total Valeting. We therefore query via Site → Dealership.
    const sites = await ctx.prisma.site.findMany({
      where: {
        organisationId: ctx.session.organisationId,
        dealershipId: { not: null },
        isActive: true,
      },
      include: {
        dealership: true,
        _count: { select: { bookings: true, users: true } },
      },
      orderBy: { name: "asc" },
    });

    // Group sites by dealership, de-duplicate
    const dealershipMap = new Map<string, {
      id: string; name: string; address: string | null;
      contactName: string | null; contactEmail: string | null;
      contactPhone: string | null; sites: typeof sites;
    }>();

    for (const site of sites) {
      if (!site.dealership) continue;
      const d = site.dealership;
      if (!dealershipMap.has(d.id)) {
        dealershipMap.set(d.id, {
          id: d.id, name: d.name, address: d.address ?? null,
          contactName: d.contactName ?? null, contactEmail: d.contactEmail ?? null,
          contactPhone: d.contactPhone ?? null, sites: [],
        });
      }
      dealershipMap.get(d.id)!.sites.push(site);
    }

    return Array.from(dealershipMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((d) => ({
        ...d,
        _count: { sites: d.sites.length },
        isActive: true,
      }));
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
                include: {
                  serviceTypes: {
                    select: { id: true, name: true, isActive: true, durationMins: true },
                  },
                },
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
        // Accounts contact
        accountsContactName:  z.string().optional(),
        accountsContactEmail: z.string().optional(),
        accountsContactPhone: z.string().optional(),
        // Payment terms
        paymentTermsDays: z.number().int().nullable().optional(),
        paymentTermsNote: z.string().nullable().optional(),
        creditLimit:      z.number().nullable().optional(),
        // Branding
        logoUrl: z.string().nullable().optional(),
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

  /** Super-admin: toggle active state on any dealership */
  setActive: superAdminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealership.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  /** Super-admin: list ALL dealerships across all head offices */
  listAll: superAdminProcedure
    .input(z.object({ showInactive: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dealership.findMany({
        where: input?.showInactive ? undefined : { isActive: true },
        include: {
          organisation: { select: { id: true, name: true } },
          _count: { select: { sites: { where: { isActive: true } } } },
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

  // ─── Contact Log (Notes) ────────────────────────────────────────────────────

  /** List all contact log notes for a dealership — SA and management only */
  listNotes: superAdminProcedure
    .input(z.object({ dealershipId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dealershipNote.findMany({
        where: { dealershipId: input.dealershipId },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { contactDate: "desc" },
      });
    }),

  /** Add a new contact log note */
  addNote: superAdminProcedure
    .input(
      z.object({
        dealershipId: z.string(),
        contactDate: z.string(), // ISO date string
        contactName: z.string().min(1, "Contact name required"),
        regards: z.string().min(1, "Subject required"),
        agreed: z.string().min(1, "Outcome required"),
        followUpDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealershipNote.create({
        data: {
          dealershipId: input.dealershipId,
          contactDate: new Date(input.contactDate),
          contactName: input.contactName.trim(),
          regards: input.regards.trim(),
          agreed: input.agreed.trim(),
          followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
          createdByUserId: ctx.session.userId,
          updatedAt: new Date(),
        },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      });
    }),

  /** Update an existing note */
  updateNote: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        contactDate: z.string().optional(),
        contactName: z.string().min(1).optional(),
        regards: z.string().min(1).optional(),
        agreed: z.string().min(1).optional(),
        followUpDate: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, followUpDate, contactDate, ...rest } = input;
      return ctx.prisma.dealershipNote.update({
        where: { id },
        data: {
          ...rest,
          ...(contactDate && { contactDate: new Date(contactDate) }),
          ...(followUpDate !== undefined && {
            followUpDate: followUpDate ? new Date(followUpDate) : null,
          }),
          updatedAt: new Date(),
        },
      });
    }),

  /** Delete a note */
  deleteNote: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealershipNote.delete({ where: { id: input.id } });
    }),

  /**
   * Returns the dealer's own logo URL + the Total Valeting platform logo URL.
   * Used by the customer dashboard partnership banner.
   */
  getPartnershipLogos: protectedProcedure.query(async ({ ctx }) => {
    // Resolve the caller's dealership via their site
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.userId },
      include: { site: { include: { dealership: { select: { id: true, name: true, logoUrl: true } } } } },
    });
    const dealership = user?.site?.dealership ?? null;

    // TV logo stored in platform config
    const tvConfig = await ctx.prisma.platformConfig.findUnique({
      where: { key: "TV_LOGO_URL" },
    });

    return {
      dealerLogoUrl:  dealership?.logoUrl  ?? null,
      dealerName:     dealership?.name     ?? null,
      tvLogoUrl:      tvConfig?.value      ?? null,
    };
  }),

  /** Super-admin: move an existing dealership to a different head office */
  reassignToHeadOffice: superAdminProcedure
    .input(z.object({
      dealershipId:     z.string(),
      headOfficeId:     z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealership.update({
        where: { id: input.dealershipId },
        data:  { organisationId: input.headOfficeId },
      });
    }),
});