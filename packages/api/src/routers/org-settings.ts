import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, orgAdminProcedure } from "../trpc";
import { PLANS, planFeatures, type FeatureKey } from "../lib/plans";

/** Group an org's service types by name (they are duplicated per department). */
async function groupedServiceTypes(
  prisma: import("@ivaleter/db").PrismaClient,
  organisationId: string,
) {
  const rows = await prisma.serviceType.findMany({
    where: { department: { site: { organisationId } } },
    orderBy: { name: "asc" },
  });
  const byName = new Map<
    string,
    { name: string; durationMins: number; isActive: boolean; nominalCode: string | null; ids: string[] }
  >();
  for (const r of rows) {
    const e = byName.get(r.name);
    if (e) {
      e.ids.push(r.id);
      e.isActive = e.isActive || r.isActive;
      if (!e.nominalCode && r.nominalCode) e.nominalCode = r.nominalCode;
    } else {
      byName.set(r.name, {
        name: r.name,
        durationMins: r.durationMins,
        isActive: r.isActive,
        nominalCode: r.nominalCode,
        ids: [r.id],
      });
    }
  }
  return Array.from(byName.values()).map((e) => ({
    id: e.ids[0]!,
    ids: e.ids,
    name: e.name,
    durationMins: e.durationMins,
    isActive: e.isActive,
    nominalCode: e.nominalCode ?? "",
  }));
}

export const orgSettingsRouter = router({
  getProfile: orgAdminProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organisation.findUnique({
      where: { id: ctx.session.organisationId },
    });
    if (!org) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      billingAddress: org.billingAddress ?? "",
      vatNumber: org.vatNumber ?? "",
      contactEmail: org.contactEmail ?? "",
      contactPhone: org.contactPhone ?? "",
    };
  }),

  updateProfile: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        billingAddress: z.string().optional(),
        vatNumber: z.string().optional(),
        contactEmail: z.string().email().or(z.literal("")).optional(),
        contactPhone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.organisation.update({
        where: { id: ctx.session.organisationId },
        data: {
          name: input.name.trim(),
          billingAddress: input.billingAddress || null,
          vatNumber: input.vatNumber || null,
          contactEmail: input.contactEmail || null,
          contactPhone: input.contactPhone || null,
        },
      });
    }),

  listServiceTypes: orgAdminProcedure.query(async ({ ctx }) => {
    return groupedServiceTypes(ctx.prisma, ctx.session.organisationId);
  }),

  /** Add a custom service type to every department in the org. */
  addServiceType: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        durationMins: z.number().int().min(1).max(600),
        nominalCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const departments = await ctx.prisma.department.findMany({
        where: { site: { organisationId: ctx.session.organisationId } },
        select: { id: true },
      });
      await ctx.prisma.serviceType.createMany({
        data: departments.map((d) => ({
          departmentId: d.id,
          name: input.name.trim(),
          durationMins: input.durationMins,
          nominalCode: input.nominalCode || null,
        })),
      });
      return { ok: true };
    }),

  /** Toggle active state for every service type sharing this name. */
  setServiceActive: orgAdminProcedure
    .input(z.object({ name: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.serviceType.updateMany({
        where: {
          name: input.name,
          department: { site: { organisationId: ctx.session.organisationId } },
        },
        data: { isActive: input.isActive },
      });
      return { ok: true };
    }),

  /** Save nominal codes against service types (matched by name). */
  saveNominalCodes: orgAdminProcedure
    .input(
      z.object({
        codes: z.array(z.object({ name: z.string(), nominalCode: z.string() })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      for (const c of input.codes) {
        await ctx.prisma.serviceType.updateMany({
          where: {
            name: c.name,
            department: { site: { organisationId: ctx.session.organisationId } },
          },
          data: { nominalCode: c.nominalCode.trim() || null },
        });
      }
      return { ok: true };
    }),

  getFeatures: orgAdminProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organisation.findUnique({
      where: { id: ctx.session.organisationId },
    });
    if (!org) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      plan: org.plan,
      planName: PLANS[(org.plan as keyof typeof PLANS) in PLANS ? (org.plan as keyof typeof PLANS) : "starter"].name,
      available: planFeatures(org.plan),
      enabled: {
        inspection: org.featureInspection,
        photography: org.featurePhotography,
        freshScent: org.featureFreshScent,
        paintProtection: org.featurePaintProtection,
        xero: org.featureXero,
      } satisfies Record<FeatureKey, boolean>,
    };
  }),

  updateFeatures: orgAdminProcedure
    .input(
      z.object({
        inspection: z.boolean(),
        photography: z.boolean(),
        freshScent: z.boolean(),
        paintProtection: z.boolean(),
        xero: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.organisation.findUnique({
        where: { id: ctx.session.organisationId },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      const available = new Set(planFeatures(org.plan));
      // A feature can only be enabled if the plan includes it.
      const gate = (k: FeatureKey, v: boolean) => v && available.has(k);
      return ctx.prisma.organisation.update({
        where: { id: org.id },
        data: {
          featureInspection: gate("inspection", input.inspection),
          featurePhotography: gate("photography", input.photography),
          featureFreshScent: gate("freshScent", input.freshScent),
          featurePaintProtection: gate("paintProtection", input.paintProtection),
          featureXero: gate("xero", input.xero),
        },
      });
    }),
});
