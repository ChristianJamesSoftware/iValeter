/**
 * equipment router
 *
 * Manages on-site equipment per dealership site:
 *  - CRUD for registered equipment items
 *  - Monthly stock checks
 *  - Weekly Monday safety audits (team leader submits, ops can view history)
 */

import { z } from "zod";
import { router, orgAdminProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const equipmentRouter = router({
  // ───────────────────────────────────────────────────────────────────────────
  // EQUIPMENT CRUD
  // ───────────────────────────────────────────────────────────────────────────

  /** List all equipment for a site */
  listBySite: orgAdminProcedure
    .input(z.object({ siteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.siteEquipment.findMany({
        where: {
          siteId: input.siteId,
          site: { organisationId: ctx.session.organisationId },
        },
        include: {
          responsibleUser: { select: { id: true, firstName: true, lastName: true } },
          stockChecks: {
            orderBy: { checkedAt: "desc" },
            take: 1,
          },
          auditItems: {
            orderBy: { audit: { auditDate: "desc" } },
            take: 1,
            include: { audit: { select: { auditDate: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? null,
        deliveredAt: item.deliveredAt?.toISOString() ?? null,
        photoUrl: item.photoUrl ?? null,
        isActive: item.isActive,
        responsibleUser: item.responsibleUser
          ? { id: item.responsibleUser.id, name: `${item.responsibleUser.firstName} ${item.responsibleUser.lastName}` }
          : null,
        lastStockCheck: item.stockChecks[0]
          ? { checkedAt: item.stockChecks[0].checkedAt.toISOString(), present: item.stockChecks[0].present, condition: item.stockChecks[0].condition ?? null }
          : null,
        lastAuditResult: item.auditItems[0]
          ? { result: item.auditItems[0].result, auditDate: item.auditItems[0].audit.auditDate.toISOString() }
          : null,
      }));
    }),

  /** Add a new equipment item */
  create: orgAdminProcedure
    .input(z.object({
      siteId:            z.string(),
      name:              z.string().min(1),
      description:       z.string().optional(),
      deliveredAt:       z.string().optional(), // ISO date string
      photoUrl:          z.string().optional(),
      responsibleUserId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify site belongs to org
      const site = await ctx.prisma.site.findFirst({
        where: { id: input.siteId, organisationId: ctx.session.organisationId },
      });
      if (!site) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.siteEquipment.create({
        data: {
          siteId:            input.siteId,
          name:              input.name,
          description:       input.description || null,
          deliveredAt:       input.deliveredAt ? new Date(input.deliveredAt) : null,
          photoUrl:          input.photoUrl || null,
          responsibleUserId: input.responsibleUserId || null,
        },
      });
    }),

  /** Update equipment item */
  update: orgAdminProcedure
    .input(z.object({
      id:                z.string(),
      name:              z.string().min(1).optional(),
      description:       z.string().optional().nullable(),
      deliveredAt:       z.string().optional().nullable(),
      photoUrl:          z.string().optional().nullable(),
      responsibleUserId: z.string().optional().nullable(),
      isActive:          z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.siteEquipment.findFirst({
        where: { id: input.id, site: { organisationId: ctx.session.organisationId } },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.siteEquipment.update({
        where: { id: input.id },
        data: {
          ...(input.name              !== undefined && { name: input.name }),
          ...(input.description       !== undefined && { description: input.description }),
          ...(input.deliveredAt       !== undefined && { deliveredAt: input.deliveredAt ? new Date(input.deliveredAt) : null }),
          ...(input.photoUrl          !== undefined && { photoUrl: input.photoUrl }),
          ...(input.responsibleUserId !== undefined && { responsibleUserId: input.responsibleUserId }),
          ...(input.isActive          !== undefined && { isActive: input.isActive }),
        },
      });
    }),

  /** Remove equipment item */
  remove: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.siteEquipment.findFirst({
        where: { id: input.id, site: { organisationId: ctx.session.organisationId } },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.siteEquipment.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // MONTHLY STOCK CHECK
  // ───────────────────────────────────────────────────────────────────────────

  /** Submit a stock check for one equipment item */
  submitStockCheck: orgAdminProcedure
    .input(z.object({
      equipmentId: z.string(),
      present:     z.boolean(),
      condition:   z.enum(["Good", "Fair", "Poor"]).optional(),
      notes:       z.string().optional(),
      photoUrl:    z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.siteEquipment.findFirst({
        where: { id: input.equipmentId, site: { organisationId: ctx.session.organisationId } },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.equipmentStockCheck.create({
        data: {
          equipmentId:     input.equipmentId,
          checkedByUserId: ctx.session.userId,
          present:         input.present,
          condition:       input.condition ?? null,
          notes:           input.notes ?? null,
          photoUrl:        input.photoUrl ?? null,
        },
      });
    }),

  /** List stock check history for a site (all items, last N checks each) */
  stockCheckHistory: orgAdminProcedure
    .input(z.object({ siteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.siteEquipment.findMany({
        where: { siteId: input.siteId, site: { organisationId: ctx.session.organisationId } },
        include: {
          stockChecks: {
            orderBy: { checkedAt: "desc" },
            take: 6, // last 6 months
            include: {
              checkedBy: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      return items.map((item) => ({
        id: item.id,
        name: item.name,
        checks: item.stockChecks.map((c) => ({
          id: c.id,
          checkedAt: c.checkedAt.toISOString(),
          present: c.present,
          condition: c.condition ?? null,
          notes: c.notes ?? null,
          photoUrl: c.photoUrl ?? null,
          checkedBy: c.checkedBy ? `${c.checkedBy.firstName} ${c.checkedBy.lastName}` : null,
        })),
      }));
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // WEEKLY SAFETY AUDITS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Team leader / valeter: submit a weekly safety audit.
   * One item-level result per piece of equipment on the site.
   */
  submitAudit: protectedProcedure
    .input(z.object({
      siteId:    z.string(),
      auditDate: z.string(), // ISO date — the Monday
      notes:     z.string().optional(),
      items: z.array(z.object({
        equipmentId: z.string(),
        result:      z.enum(["PASS", "ADVISORY", "FAIL"]),
        notes:       z.string().optional(),
        photoUrl:    z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const overallPass = input.items.every((i) => i.result !== "FAIL");

      const audit = await ctx.prisma.equipmentAudit.create({
        data: {
          siteId:           input.siteId,
          conductedByUserId: ctx.session.userId,
          auditDate:        new Date(input.auditDate),
          overallPass,
          notes:            input.notes ?? null,
          items: {
            create: input.items.map((i) => ({
              equipmentId: i.equipmentId,
              result:      i.result,
              notes:       i.notes ?? null,
              photoUrl:    i.photoUrl ?? null,
            })),
          },
        },
        include: { items: true },
      });

      return audit;
    }),

  /** OPS: list all audits for a site, newest first */
  auditHistory: orgAdminProcedure
    .input(z.object({ siteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const audits = await ctx.prisma.equipmentAudit.findMany({
        where: {
          siteId: input.siteId,
          site: { organisationId: ctx.session.organisationId },
        },
        include: {
          conductedBy: { select: { firstName: true, lastName: true } },
          items: {
            include: {
              equipment: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { auditDate: "desc" },
      });

      return audits.map((a) => ({
        id: a.id,
        auditDate: a.auditDate.toISOString(),
        submittedAt: a.submittedAt.toISOString(),
        overallPass: a.overallPass,
        notes: a.notes ?? null,
        conductedBy: a.conductedBy ? `${a.conductedBy.firstName} ${a.conductedBy.lastName}` : null,
        items: a.items.map((i) => ({
          id: i.id,
          equipmentId: i.equipmentId,
          equipmentName: i.equipment.name,
          result: i.result,
          notes: i.notes ?? null,
          photoUrl: i.photoUrl ?? null,
        })),
      }));
    }),

  /**
   * Team leader / valeter: list equipment for their site so they can
   * fill in the audit form. Uses the session siteId.
   */
  listForAudit: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.siteId) throw new TRPCError({ code: "BAD_REQUEST", message: "No site assigned." });

    return ctx.prisma.siteEquipment.findMany({
      where: { siteId: ctx.session.siteId, isActive: true },
      select: { id: true, name: true, description: true, photoUrl: true },
      orderBy: { name: "asc" },
    });
  }),
});
