/**
 * valetLibrary router
 *
 * Manages two platform-level libraries:
 *  - ValetTypeTemplate  — master list of valet type names SA configures; dealerships pick from it
 *  - RateTemplate       — master rate templates (with per-service-type lines) SA configures; dealerships apply one
 */
import { z } from "zod";
import { router, superAdminProcedure, protectedProcedure } from "../trpc";

const SERVICE_CATEGORIES = ["VALET", "PAINT", "CLEANING", "OTHER"] as const;

export const valetLibraryRouter = router({
  // ── Valet Type Templates ──────────────────────────────────────────────────

  listValetTypes: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.valetTypeTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }),

  listAllValetTypes: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.valetTypeTemplate.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }),

  createValetType: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        category: z.enum(SERVICE_CATEGORIES).default("VALET"),
        defaultDurationMins: z.number().int().min(1).max(600).default(60),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.valetTypeTemplate.create({ data: input });
    }),

  updateValetType: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().nullable().optional(),
        category: z.enum(SERVICE_CATEGORIES).optional(),
        defaultDurationMins: z.number().int().min(1).max(600).optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      return ctx.prisma.valetTypeTemplate.update({ where: { id }, data: rest });
    }),

  deleteValetType: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete — keeps historical service types intact
      return ctx.prisma.valetTypeTemplate.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ── Rate Templates ────────────────────────────────────────────────────────

  listRateTemplates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.rateTemplate.findMany({
      where: { isActive: true },
      include: { lines: true },
      orderBy: { name: "asc" },
    });
  }),

  listAllRateTemplates: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.rateTemplate.findMany({
      include: { lines: { orderBy: { serviceTypeName: "asc" } } },
      orderBy: { name: "asc" },
    });
  }),

  createRateTemplate: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        lines: z.array(
          z.object({
            serviceTypeName: z.string().min(1),
            basePricePence: z.number().int().min(0),
            baseAllocMins: z.number().int().min(1).default(60),
            pctSmall: z.number().int().default(-10),
            pctMedium: z.number().int().default(0),
            pctLarge: z.number().int().default(20),
            pctXL: z.number().int().default(35),
            pctVan: z.number().int().default(50),
          }),
        ).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { lines, ...rest } = input;
      return ctx.prisma.rateTemplate.create({
        data: {
          ...rest,
          lines: { create: lines },
        },
        include: { lines: true },
      });
    }),

  updateRateTemplate: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      return ctx.prisma.rateTemplate.update({ where: { id }, data: rest });
    }),

  upsertRateTemplateLine: superAdminProcedure
    .input(
      z.object({
        templateId: z.string(),
        serviceTypeName: z.string().min(1),
        basePricePence: z.number().int().min(0),
        baseAllocMins: z.number().int().min(1).default(60),
        pctSmall: z.number().int().default(-10),
        pctMedium: z.number().int().default(0),
        pctLarge: z.number().int().default(20),
        pctXL: z.number().int().default(35),
        pctVan: z.number().int().default(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { templateId, serviceTypeName, ...data } = input;
      return ctx.prisma.rateTemplateLine.upsert({
        where: { templateId_serviceTypeName: { templateId, serviceTypeName } },
        update: data,
        create: { templateId, serviceTypeName, ...data },
      });
    }),

  deleteRateTemplateLine: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rateTemplateLine.delete({ where: { id: input.id } });
    }),

  deleteRateTemplate: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rateTemplate.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ── Apply rate template to a dealership site ──────────────────────────────
  // Applies a rate template to a site — creates/updates VehicleSizeRate rows
  applyRateTemplate: superAdminProcedure
    .input(
      z.object({
        siteId: z.string(),
        templateId: z.string(),
        overwrite: z.boolean().default(false), // if false, only fills gaps
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.rateTemplate.findUnique({
        where: { id: input.templateId },
        include: { lines: true },
      });
      if (!template) throw new Error("Template not found");

      // Get all service types for this site's departments
      const site = await ctx.prisma.site.findUnique({
        where: { id: input.siteId },
        include: {
          departments: {
            include: { serviceTypes: { where: { isActive: true } } },
          },
        },
      });
      if (!site) throw new Error("Site not found");

      const serviceTypes = site.departments.flatMap((d) => d.serviceTypes);
      let applied = 0;

      for (const line of template.lines) {
        const matchingSTs = serviceTypes.filter(
          (st) => st.name.toLowerCase() === line.serviceTypeName.toLowerCase(),
        );
        for (const st of matchingSTs) {
          const existing = await ctx.prisma.vehicleSizeRate.findFirst({
            where: { siteId: input.siteId, serviceTypeId: st.id },
          });
          if (existing && !input.overwrite) continue;

          const rateData = {
            basePricePence: line.basePricePence,
            baseAllocMins: line.baseAllocMins,
            pctSmall: line.pctSmall,
            pctMedium: line.pctMedium,
            pctLarge: line.pctLarge,
            pctXL: line.pctXL,
            pctVan: line.pctVan,
          };
          if (existing) {
            await ctx.prisma.vehicleSizeRate.update({ where: { id: existing.id }, data: rateData });
          } else {
            await ctx.prisma.vehicleSizeRate.create({ data: { siteId: input.siteId, serviceTypeId: st.id, ...rateData } });
          }
          applied++;
        }
      }
      return { ok: true, applied };
    }),

  // ── Activate a valet type for a dealership (from template) ────────────────
  activateValetTypeForDealership: superAdminProcedure
    .input(
      z.object({
        dealershipId: z.string(),
        templateId: z.string(), // ValetTypeTemplate id
        durationMins: z.number().int().min(1).optional(), // override default
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.valetTypeTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!template) throw new Error("Valet type template not found");

      const dealership = await ctx.prisma.dealership.findUnique({
        where: { id: input.dealershipId },
        include: {
          sites: { include: { departments: true } },
        },
      });
      if (!dealership) throw new Error("Dealership not found");

      const durationMins = input.durationMins ?? template.defaultDurationMins;
      const departments = dealership.sites.flatMap((s) => s.departments);

      // Create ServiceType for each department (skip if name already exists)
      let created = 0;
      for (const dept of departments) {
        const existing = await ctx.prisma.serviceType.findFirst({
          where: {
            departmentId: dept.id,
            name: template.name,
            isActive: true,
          },
        });
        if (existing) continue;
        await ctx.prisma.serviceType.create({
          data: {
            departmentId: dept.id,
            name: template.name,
            category: template.category,
            durationMins,
          },
        });
        created++;
      }
      return { ok: true, created };
    }),

  deactivateValetTypeForDealership: superAdminProcedure
    .input(
      z.object({
        dealershipId: z.string(),
        name: z.string(), // service type name to deactivate across all departments
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const dealership = await ctx.prisma.dealership.findUnique({
        where: { id: input.dealershipId },
        include: { sites: { include: { departments: true } } },
      });
      if (!dealership) throw new Error("Dealership not found");

      const departmentIds = dealership.sites
        .flatMap((s) => s.departments)
        .map((d) => d.id);

      const updated = await ctx.prisma.serviceType.updateMany({
        where: { departmentId: { in: departmentIds }, name: input.name },
        data: { isActive: false },
      });
      return { ok: true, count: updated.count };
    }),
});
