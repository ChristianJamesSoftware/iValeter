import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Role } from "@ivaleter/db";
import { router, superAdminProcedure } from "../trpc";
import { hashPassword } from "../auth";
import { PLANS, planFeatures, type PlanKey } from "../lib/plans";

const featureInput = z.object({
  inspection: z.boolean(),
  photography: z.boolean(),
  freshScent: z.boolean(),
  paintProtection: z.boolean(),
  xero: z.boolean(),
});

export const organisationsRouter = router({
  list: superAdminProcedure.query(async ({ ctx }) => {
    const orgs = await ctx.prisma.organisation.findMany({
      include: { _count: { select: { sites: true, users: true } } },
      orderBy: { createdAt: "desc" },
    });
    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      plan: o.plan,
      isActive: o.isActive,
      sitesCount: o._count.sites,
      usersCount: o._count.users,
      createdAt: o.createdAt,
    }));
  }),

  getById: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.prisma.organisation.findUnique({
        where: { id: input.id },
        include: {
          sites: { include: { _count: { select: { users: true, bookings: true } } } },
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      return org;
    }),

  setActive: superAdminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.organisation.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  /** Full sell-on onboarding: org + site + departments + admin user, atomically. */
  create: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and dashes"),
        plan: z.enum(["starter", "pro", "enterprise"]),
        contactName: z.string().optional(),
        contactEmail: z.string().email().or(z.literal("")).optional(),
        contactPhone: z.string().optional(),
        features: featureInput,
        site: z.object({
          name: z.string().min(1),
          address: z.string().optional(),
          departments: z.array(z.string().min(1)).min(1),
        }),
        admin: z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.string().email(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug = input.slug.toLowerCase().trim();
      const existingSlug = await ctx.prisma.organisation.findUnique({
        where: { slug },
      });
      if (existingSlug) {
        throw new TRPCError({ code: "CONFLICT", message: "Slug already in use" });
      }
      const existingEmail = await ctx.prisma.user.findUnique({
        where: { email: input.admin.email.toLowerCase().trim() },
      });
      if (existingEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with the admin email already exists",
        });
      }

      // Only features included in the plan may be enabled.
      const available = new Set(planFeatures(input.plan));
      const gate = (k: keyof typeof input.features) =>
        input.features[k] && available.has(k);

      const tempPassword = "Welcome123!";

      const org = await ctx.prisma.$transaction(async (tx) => {
        const created = await tx.organisation.create({
          data: {
            name: input.name.trim(),
            slug,
            plan: input.plan,
            contactEmail: input.contactEmail || null,
            contactPhone: input.contactPhone || null,
            featureInspection: gate("inspection"),
            featurePhotography: gate("photography"),
            featureFreshScent: gate("freshScent"),
            featurePaintProtection: gate("paintProtection"),
            featureXero: gate("xero"),
          },
        });

        await tx.site.create({
          data: {
            organisationId: created.id,
            name: input.site.name.trim(),
            address: input.site.address || null,
            departments: {
              create: input.site.departments.map((name) => ({ name })),
            },
          },
        });

        await tx.user.create({
          data: {
            organisationId: created.id,
            email: input.admin.email.toLowerCase().trim(),
            firstName: input.admin.firstName.trim(),
            lastName: input.admin.lastName.trim(),
            passwordHash: hashPassword(tempPassword),
            role: Role.org_admin,
            skills: [],
          },
        });

        return created;
      });

      return { id: org.id, tempPassword };
    }),

  /** Plan catalogue for the onboarding UI. */
  plans: superAdminProcedure.query(() => {
    return (Object.keys(PLANS) as PlanKey[]).map((k) => PLANS[k]);
  }),
});
