import { z } from "zod";
import { router, orgAdminProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ─── Shared input schemas ────────────────────────────────────────────────────

const checkItemInput = z.object({
  label: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(100),
  isRequired: z.boolean().default(true),
  sortOrder: z.number().int().optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const inspectionTemplatesRouter = router({
  // ── Templates ──────────────────────────────────────────────────────────────

  /** Admin: list all templates for the org (with their check items) */
  listTemplates: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.inspectionTemplate.findMany({
      where: { organisationId: ctx.session.organisationId },
      orderBy: { sortOrder: "asc" },
      include: {
        checkItems: {
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { siteTemplates: true } },
      },
    });
  }),

  /** Admin: create a new template */
  createTemplate: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        description: z.string().max(500).optional(),
        type: z.enum(["PDI", "USED_TRANSFER", "CUSTOM"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.prisma.inspectionTemplate.findFirst({
        where: { organisationId: ctx.session.organisationId },
        orderBy: { sortOrder: "desc" },
      });
      return ctx.prisma.inspectionTemplate.create({
        data: {
          organisationId: ctx.session.organisationId,
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
          type: input.type,
          sortOrder: (last?.sortOrder ?? 0) + 1,
        },
      });
    }),

  /** Admin: update a template's name/description/active state */
  updateTemplate: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.inspectionTemplate.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.inspectionTemplate.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.description !== undefined && { description: input.description.trim() }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        },
      });
    }),

  /** Admin: delete a template (only if no sites are using it) */
  deleteTemplate: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.inspectionTemplate.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      const siteCount = await ctx.prisma.siteInspectionTemplate.count({
        where: { templateId: input.id },
      });
      if (siteCount > 0) {
        // Soft-delete — disable rather than remove
        return ctx.prisma.inspectionTemplate.update({
          where: { id: input.id },
          data: { isActive: false },
        });
      }
      return ctx.prisma.inspectionTemplate.delete({ where: { id: input.id } });
    }),

  /** Admin: duplicate a template with all its check items */
  duplicateTemplate: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const src = await ctx.prisma.inspectionTemplate.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
        include: { checkItems: { orderBy: { sortOrder: "asc" } } },
      });
      if (!src) throw new TRPCError({ code: "NOT_FOUND" });

      const copy = await ctx.prisma.inspectionTemplate.create({
        data: {
          organisationId: ctx.session.organisationId,
          name: `${src.name} (copy)`,
          description: src.description,
          type: src.type,
          isActive: true,
          sortOrder: src.sortOrder,
        },
      });

      if (src.checkItems.length > 0) {
        await ctx.prisma.inspectionCheckItem.createMany({
          data: src.checkItems.map((item) => ({
            templateId: copy.id,
            label: item.label,
            description: item.description,
            category: item.category,
            isRequired: item.isRequired,
            sortOrder: item.sortOrder,
          })),
        });
      }

      return copy;
    }),

  // ── Check Items ────────────────────────────────────────────────────────────

  /** Admin: add a check item to a template */
  addCheckItem: orgAdminProcedure
    .input(z.object({ templateId: z.string(), ...checkItemInput.shape }))
    .mutation(async ({ ctx, input }) => {
      // Verify template belongs to this org
      const template = await ctx.prisma.inspectionTemplate.findFirst({
        where: { id: input.templateId, organisationId: ctx.session.organisationId },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      const last = await ctx.prisma.inspectionCheckItem.findFirst({
        where: { templateId: input.templateId },
        orderBy: { sortOrder: "desc" },
      });
      return ctx.prisma.inspectionCheckItem.create({
        data: {
          templateId: input.templateId,
          label: input.label.trim(),
          description: input.description?.trim() ?? null,
          category: input.category.trim(),
          isRequired: input.isRequired,
          sortOrder: input.sortOrder ?? (last?.sortOrder ?? 0) + 1,
        },
      });
    }),

  /** Admin: update a check item */
  updateCheckItem: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        label: z.string().min(2).max(200).optional(),
        description: z.string().max(500).optional(),
        category: z.string().min(1).max(100).optional(),
        isRequired: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify check item belongs to an org-owned template
      const item = await ctx.prisma.inspectionCheckItem.findFirst({
        where: { id: input.id },
        include: { template: { select: { organisationId: true } } },
      });
      if (!item || item.template.organisationId !== ctx.session.organisationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.prisma.inspectionCheckItem.update({
        where: { id: input.id },
        data: {
          ...(input.label !== undefined && { label: input.label.trim() }),
          ...(input.description !== undefined && { description: input.description.trim() }),
          ...(input.category !== undefined && { category: input.category.trim() }),
          ...(input.isRequired !== undefined && { isRequired: input.isRequired }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        },
      });
    }),

  /** Admin: delete a check item */
  deleteCheckItem: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.inspectionCheckItem.findFirst({
        where: { id: input.id },
        include: { template: { select: { organisationId: true } } },
      });
      if (!item || item.template.organisationId !== ctx.session.organisationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.prisma.inspectionCheckItem.delete({ where: { id: input.id } });
    }),

  // ── Site Assignment ────────────────────────────────────────────────────────

  /** Admin: get all site assignments for a template (which sites have it enabled) */
  getSiteAssignments: orgAdminProcedure
    .input(z.object({ templateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.inspectionTemplate.findFirst({
        where: { id: input.templateId, organisationId: ctx.session.organisationId },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });

      // All sites in the org
      const sites = await ctx.prisma.site.findMany({
        where: { organisationId: ctx.session.organisationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      // Which have this template enabled
      const assignments = await ctx.prisma.siteInspectionTemplate.findMany({
        where: { templateId: input.templateId },
        include: {
          checkOverrides: true,
        },
      });

      const assignmentMap = new Map(assignments.map((a) => [a.siteId, a]));

      return sites.map((site) => ({
        ...site,
        assignment: assignmentMap.get(site.id) ?? null,
      }));
    }),

  /** Admin: enable a template at a site */
  assignToSite: orgAdminProcedure
    .input(z.object({ templateId: z.string(), siteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify both belong to this org
      const [template, site] = await Promise.all([
        ctx.prisma.inspectionTemplate.findFirst({
          where: { id: input.templateId, organisationId: ctx.session.organisationId },
        }),
        ctx.prisma.site.findFirst({
          where: { id: input.siteId, organisationId: ctx.session.organisationId },
        }),
      ]);
      if (!template || !site) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.siteInspectionTemplate.upsert({
        where: {
          siteId_templateId: { siteId: input.siteId, templateId: input.templateId },
        },
        create: { siteId: input.siteId, templateId: input.templateId, isEnabled: true },
        update: { isEnabled: true },
      });
    }),

  /** Admin: disable a template at a site */
  removeFromSite: orgAdminProcedure
    .input(z.object({ templateId: z.string(), siteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.siteInspectionTemplate.updateMany({
        where: {
          templateId: input.templateId,
          siteId: input.siteId,
          template: { organisationId: ctx.session.organisationId },
        },
        data: { isEnabled: false },
      });
    }),

  // ── Site-level check overrides ─────────────────────────────────────────────

  /** Admin / Site manager: get site-level overrides for a template at a site */
  getSiteOverrides: orgAdminProcedure
    .input(z.object({ siteId: z.string(), templateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const siteTemplate = await ctx.prisma.siteInspectionTemplate.findFirst({
        where: {
          siteId: input.siteId,
          templateId: input.templateId,
          template: { organisationId: ctx.session.organisationId },
          site: { organisationId: ctx.session.organisationId },
        },
        include: {
          checkOverrides: { orderBy: { sortOrder: "asc" } },
          template: {
            include: {
              checkItems: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
            },
          },
        },
      });
      if (!siteTemplate) throw new TRPCError({ code: "NOT_FOUND" });
      return siteTemplate;
    }),

  /** Admin: hide an org-level check item at a specific site (HIDDEN override) */
  hideCheckAtSite: orgAdminProcedure
    .input(z.object({ siteId: z.string(), templateId: z.string(), checkItemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const siteTemplate = await ctx.prisma.siteInspectionTemplate.findFirst({
        where: {
          siteId: input.siteId,
          templateId: input.templateId,
          template: { organisationId: ctx.session.organisationId },
        },
      });
      if (!siteTemplate) throw new TRPCError({ code: "NOT_FOUND" });

      // Check if a HIDDEN override already exists for this check item
      const existing = await ctx.prisma.siteInspectionCheckOverride.findFirst({
        where: {
          siteTemplateId: siteTemplate.id,
          checkItemId: input.checkItemId,
          overrideType: "HIDDEN",
        },
      });
      if (existing) return existing;

      return ctx.prisma.siteInspectionCheckOverride.create({
        data: {
          siteTemplateId: siteTemplate.id,
          overrideType: "HIDDEN",
          checkItemId: input.checkItemId,
        },
      });
    }),

  /** Admin: restore a hidden check at a site */
  restoreCheckAtSite: orgAdminProcedure
    .input(z.object({ siteId: z.string(), templateId: z.string(), checkItemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const siteTemplate = await ctx.prisma.siteInspectionTemplate.findFirst({
        where: {
          siteId: input.siteId,
          templateId: input.templateId,
          template: { organisationId: ctx.session.organisationId },
        },
      });
      if (!siteTemplate) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.siteInspectionCheckOverride.deleteMany({
        where: {
          siteTemplateId: siteTemplate.id,
          checkItemId: input.checkItemId,
          overrideType: "HIDDEN",
        },
      });
    }),

  /** Admin: add a site-specific extra check (ADDED override) */
  addSiteCheck: orgAdminProcedure
    .input(
      z.object({
        siteId: z.string(),
        templateId: z.string(),
        ...checkItemInput.shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const siteTemplate = await ctx.prisma.siteInspectionTemplate.findFirst({
        where: {
          siteId: input.siteId,
          templateId: input.templateId,
          template: { organisationId: ctx.session.organisationId },
        },
      });
      if (!siteTemplate) throw new TRPCError({ code: "NOT_FOUND" });

      const last = await ctx.prisma.siteInspectionCheckOverride.findFirst({
        where: { siteTemplateId: siteTemplate.id, overrideType: "ADDED" },
        orderBy: { sortOrder: "desc" },
      });

      return ctx.prisma.siteInspectionCheckOverride.create({
        data: {
          siteTemplateId: siteTemplate.id,
          overrideType: "ADDED",
          label: input.label.trim(),
          description: input.description?.trim() ?? null,
          category: input.category.trim(),
          isRequired: input.isRequired,
          sortOrder: input.sortOrder ?? (last?.sortOrder ?? 100) + 1,
        },
      });
    }),

  /** Admin: remove a site-specific added check */
  removeSiteCheck: orgAdminProcedure
    .input(z.object({ overrideId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const override = await ctx.prisma.siteInspectionCheckOverride.findFirst({
        where: {
          id: input.overrideId,
          overrideType: "ADDED",
          siteTemplate: { template: { organisationId: ctx.session.organisationId } },
        },
      });
      if (!override) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.siteInspectionCheckOverride.delete({ where: { id: input.overrideId } });
    }),

  // ── Site-facing queries ────────────────────────────────────────────────────

  /** Anyone: get active templates for their site (merging overrides) */
  getTemplatesForSite: protectedProcedure.query(async ({ ctx }) => {
    const siteId = ctx.session.siteId;
    if (!siteId) return [];

    const siteTemplates = await ctx.prisma.siteInspectionTemplate.findMany({
      where: {
        siteId,
        isEnabled: true,
        template: { isActive: true, organisationId: ctx.session.organisationId },
      },
      include: {
        template: {
          include: {
            checkItems: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
          },
        },
        checkOverrides: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { template: { sortOrder: "asc" } },
    });

    // Merge org-level checks with site overrides
    return siteTemplates.map((st) => {
      const hiddenIds = new Set(
        st.checkOverrides
          .filter((o) => o.overrideType === "HIDDEN" && o.checkItemId)
          .map((o) => o.checkItemId!)
      );
      const addedChecks = st.checkOverrides.filter((o) => o.overrideType === "ADDED");

      return {
        id: st.id,
        templateId: st.template.id,
        name: st.template.name,
        description: st.template.description,
        type: st.template.type,
        checks: [
          ...st.template.checkItems
            .filter((c) => !hiddenIds.has(c.id))
            .map((c) => ({
              id: c.id,
              label: c.label,
              description: c.description,
              category: c.category,
              isRequired: c.isRequired,
              sortOrder: c.sortOrder,
              source: "template" as const,
            })),
          ...addedChecks.map((o) => ({
            id: o.id,
            label: o.label!,
            description: o.description,
            category: o.category!,
            isRequired: o.isRequired,
            sortOrder: o.sortOrder,
            source: "site" as const,
          })),
        ].sort((a, b) => a.sortOrder - b.sortOrder),
      };
    });
  }),
});
