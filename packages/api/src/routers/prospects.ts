/**
 * prospects router
 * Manage prospect valeters — pre-registration pipeline before full onboarding.
 * Accessible by org_admin and super_admin.
 */

import { z } from "zod";
import { router, orgAdminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const ProspectStatusEnum = z.enum([
  "NEW",
  "CONTACTED",
  "INTERVIEWED",
  "OFFERED",
  "ONBOARDED",
  "DECLINED",
]);

// Full prospect fields used in create + update
const prospectFields = {
  firstName:         z.string().min(1),
  lastName:          z.string().min(1),
  email:             z.string().email().optional().or(z.literal("")),
  phone:             z.string().optional(),
  town:              z.string().optional(),
  experience:        z.string().optional(),
  employmentHistory: z.string().optional(),
  ukLicence:         z.boolean().optional().nullable(),
  drives:            z.boolean().optional().nullable(),
  position:          z.string().optional(),
  payRequirementMin: z.number().int().optional().nullable(),
  payRequirementMax: z.number().int().optional().nullable(),
  source:            z.string().optional(),
  notes:             z.string().optional(),
  siteId:            z.string().optional().nullable(),
};

export const prospectsRouter = router({
  /** List all prospects for the org */
  list: orgAdminProcedure
    .input(
      z.object({
        status: ProspectStatusEnum.optional(),
        siteId: z.string().optional(),
        search: z.string().optional(),
        town:   z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        organisationId: ctx.session.organisationId,
      };
      if (input?.status) where.status = input.status;
      if (input?.siteId) where.siteId = input.siteId;
      if (input?.town)   where.town   = { contains: input.town, mode: "insensitive" };
      if (input?.search) {
        const s = input.search.trim();
        where.OR = [
          { firstName: { contains: s, mode: "insensitive" } },
          { lastName:  { contains: s, mode: "insensitive" } },
          { email:     { contains: s, mode: "insensitive" } },
          { phone:     { contains: s, mode: "insensitive" } },
          { town:      { contains: s, mode: "insensitive" } },
          { position:  { contains: s, mode: "insensitive" } },
        ];
      }

      return ctx.prisma.prospectValeter.findMany({
        where,
        include: {
          site: { select: { id: true, name: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      });
    }),

  /** Add a new prospect */
  create: orgAdminProcedure
    .input(z.object(prospectFields))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.prospectValeter.create({
        data: {
          organisationId:    ctx.session.organisationId,
          firstName:         input.firstName,
          lastName:          input.lastName,
          email:             input.email             || null,
          phone:             input.phone             || null,
          town:              input.town              || null,
          experience:        input.experience        || null,
          employmentHistory: input.employmentHistory || null,
          ukLicence:         input.ukLicence         ?? null,
          drives:            input.drives            ?? null,
          position:          input.position          || null,
          payRequirementMin: input.payRequirementMin ?? null,
          payRequirementMax: input.payRequirementMax ?? null,
          source:            input.source            || null,
          notes:             input.notes             || null,
          siteId:            input.siteId            || null,
          addedByUserId:     ctx.session.userId,
          status:            "NEW",
        },
      });
    }),

  /** Update status, notes, or any field */
  update: orgAdminProcedure
    .input(
      z.object({
        id:     z.string(),
        status: ProspectStatusEnum.optional(),
      }).merge(
        z.object(
          Object.fromEntries(
            Object.entries(prospectFields).map(([k, v]) => [k, v.optional()])
          ) as Record<string, z.ZodTypeAny>
        )
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospectValeter.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!prospect) throw new TRPCError({ code: "NOT_FOUND" });

      const { id, ...data } = input;
      return ctx.prisma.prospectValeter.update({
        where: { id },
        data: {
          ...(data.firstName         !== undefined && { firstName:         data.firstName }),
          ...(data.lastName          !== undefined && { lastName:          data.lastName }),
          ...(data.email             !== undefined && { email:             data.email || null }),
          ...(data.phone             !== undefined && { phone:             data.phone || null }),
          ...(data.town              !== undefined && { town:              data.town  || null }),
          ...(data.experience        !== undefined && { experience:        data.experience        || null }),
          ...(data.employmentHistory !== undefined && { employmentHistory: data.employmentHistory || null }),
          ...(data.ukLicence         !== undefined && { ukLicence:         data.ukLicence ?? null }),
          ...(data.drives            !== undefined && { drives:            data.drives    ?? null }),
          ...(data.position          !== undefined && { position:          data.position  || null }),
          ...(data.payRequirementMin !== undefined && { payRequirementMin: data.payRequirementMin ?? null }),
          ...(data.payRequirementMax !== undefined && { payRequirementMax: data.payRequirementMax ?? null }),
          ...(data.source            !== undefined && { source:            data.source    || null }),
          ...(data.notes             !== undefined && { notes:             data.notes     || null }),
          ...(data.status            !== undefined && { status:            data.status }),
          ...(data.siteId            !== undefined && { siteId:            data.siteId }),
        },
      });
    }),

  /** Archive (delete) a prospect */
  remove: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospectValeter.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!prospect) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.prospectValeter.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /** Count by status — for the stat cards */
  statusCounts: orgAdminProcedure.query(async ({ ctx }) => {
    const counts = await ctx.prisma.prospectValeter.groupBy({
      by: ["status"],
      where: { organisationId: ctx.session.organisationId },
      _count: { _all: true },
    });
    const map: Record<string, number> = {};
    for (const c of counts) map[c.status] = c._count._all;
    return {
      NEW:         map.NEW         ?? 0,
      CONTACTED:   map.CONTACTED   ?? 0,
      INTERVIEWED: map.INTERVIEWED ?? 0,
      OFFERED:     map.OFFERED     ?? 0,
      ONBOARDED:   map.ONBOARDED   ?? 0,
      DECLINED:    map.DECLINED    ?? 0,
      total:       counts.reduce((a, c) => a + c._count._all, 0),
    };
  }),

  /**
   * Import all existing active valeters into the Opportunities list.
   * Skips any valeter already present (matched by convertedToUserId).
   * Returns count of new records created.
   */
  importExistingValeters: orgAdminProcedure.mutation(async ({ ctx }) => {
    // Fetch all active valeters in the org
    const valeters = await ctx.prisma.user.findMany({
      where: { organisationId: ctx.session.organisationId, role: "valeter", isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, siteId: true },
    });

    // Get already-imported user IDs
    const existing = await ctx.prisma.prospectValeter.findMany({
      where: {
        organisationId: ctx.session.organisationId,
        convertedToUserId: { not: null },
      },
      select: { convertedToUserId: true },
    });
    const existingIds = new Set(existing.map((e) => e.convertedToUserId));

    const toCreate = valeters.filter((v) => !existingIds.has(v.id));
    if (toCreate.length === 0) return { created: 0 };

    await ctx.prisma.prospectValeter.createMany({
      data: toCreate.map((v) => ({
        organisationId:    ctx.session.organisationId,
        firstName:         v.firstName,
        lastName:          v.lastName,
        email:             v.email             ?? null,
        phone:             v.phone             ?? null,
        siteId:            v.siteId            ?? null,
        status:            "ONBOARDED" as const,
        source:            "Existing valeter",
        addedByUserId:     ctx.session.userId,
        convertedToUserId: v.id,
      })),
      skipDuplicates: true,
    });

    return { created: toCreate.length };
  }),

  /** List distinct towns for the filter dropdown */
  listTowns: orgAdminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.prospectValeter.findMany({
      where: { organisationId: ctx.session.organisationId, town: { not: null } },
      select: { town: true },
      distinct: ["town"],
      orderBy: { town: "asc" },
    });
    return rows.map((r) => r.town as string);
  }),

  /** Send a broadcast message to filtered prospects */
  broadcast: orgAdminProcedure
    .input(
      z.object({
        subject:      z.string().min(1),
        message:      z.string().min(1),
        areaFilter:   z.string().optional(),   // town filter
        statusFilter: z.string().optional(),   // comma-separated statuses e.g. "NEW,CONTACTED"
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Build the recipient query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        organisationId: ctx.session.organisationId,
      };
      if (input.areaFilter?.trim()) {
        where.town = { contains: input.areaFilter.trim(), mode: "insensitive" };
      }
      if (input.statusFilter?.trim()) {
        const statuses = input.statusFilter.split(",").map((s) => s.trim()).filter(Boolean);
        if (statuses.length > 0) where.status = { in: statuses };
      }

      const recipients = await ctx.prisma.prospectValeter.findMany({
        where,
        select: { id: true, email: true, phone: true },
      });

      // Create broadcast record + recipients in a transaction
      const broadcast = await ctx.prisma.$transaction(async (tx) => {
        const b = await tx.prospectBroadcast.create({
          data: {
            organisationId: ctx.session.organisationId,
            subject:        input.subject,
            message:        input.message,
            areaFilter:     input.areaFilter  || null,
            statusFilter:   input.statusFilter || null,
            recipientCount: recipients.length,
            sentByUserId:   ctx.session.userId,
          },
        });

        if (recipients.length > 0) {
          await tx.prospectBroadcastRecipient.createMany({
            data: recipients.map((r) => ({
              broadcastId: b.id,
              prospectId:  r.id,
            })),
            skipDuplicates: true,
          });
        }

        return b;
      });

      return {
        broadcastId:    broadcast.id,
        recipientCount: recipients.length,
      };
    }),

  /** List broadcast history */
  listBroadcasts: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.prospectBroadcast.findMany({
      where: { organisationId: ctx.session.organisationId },
      include: {
        sentBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { sentAt: "desc" },
      take: 50,
    });
  }),
});
