import { z } from "zod";
import { router, orgAdminProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { prisma as _prismaRef } from "@ivaleter/db";

type PrismaInstance = typeof _prismaRef;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Midnight UTC for a given date */
function toMidnightUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * Returns true if a template should generate an occurrence for `date`.
 */
function templateScheduledForDate(
  template: {
    frequency: string;
    customDays: unknown;
    createdAt: Date;
  },
  date: Date,
): boolean {
  const dayName = DAY_NAMES[date.getDay()];
  if (!dayName) return false;

  switch (template.frequency) {
    case "DAILY":
      // Mon–Fri only
      return date.getDay() >= 1 && date.getDay() <= 5;

    case "SPECIFIC_DAYS": {
      const days = (template.customDays as string[] | null) ?? [];
      return days.includes(dayName);
    }

    case "EVERY_OTHER_DAY": {
      // Count days since template was created
      const msPerDay = 86_400_000;
      const daysSinceCreation = Math.floor(
        (date.getTime() - template.createdAt.getTime()) / msPerDay,
      );
      return daysSinceCreation % 2 === 0;
    }

    case "WEEKLY": {
      // Same day of week as creation date
      return date.getDay() === template.createdAt.getDay();
    }

    case "FORTNIGHTLY": {
      const msPerDay = 86_400_000;
      const daysSinceCreation = Math.floor(
        (date.getTime() - template.createdAt.getTime()) / msPerDay,
      );
      return daysSinceCreation % 14 === 0;
    }

    case "MONTHLY": {
      // Same day-of-month as creation date
      return date.getDate() === template.createdAt.getDate();
    }

    default:
      return false;
  }
}

/**
 * Ensure today's occurrence exists for every active template scheduled today.
 * Called at the start of list queries so the valeter always sees today's jobs.
 */
async function ensureTodayOccurrences(
  prisma: PrismaInstance,
  organisationId: string,
) {
  const today = toMidnightUTC(new Date());
  const templates = await prisma.recurringJobTemplate.findMany({
    where: { organisationId, isActive: true },
  });

  const scheduled = templates.filter((t) => templateScheduledForDate(t, today));

  await Promise.all(
    scheduled.map((t) =>
      prisma.recurringJobOccurrence.upsert({
        where: { templateId_dueDate: { templateId: t.id, dueDate: today } },
        create: {
          id: `rjo_${t.id}_${today.getTime()}`,
          templateId: t.id,
          dueDate: today,
          status: "PENDING",
          updatedAt: new Date(),
        },
        update: {}, // already exists — leave it
      }),
    ),
  );
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const recurringJobsRouter = router({

  // ── ADMIN: manage templates ──────────────────────────────────────────────

  /** List all templates for the org (admin) */
  listTemplates: orgAdminProcedure
    .input(z.object({ siteId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.recurringJobTemplate.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          ...(input.siteId ? { siteId: input.siteId } : {}),
        },
        orderBy: [{ siteId: "asc" }, { name: "asc" }],
        include: {
          site: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }),

  /** Create a recurring job template */
  createTemplate: orgAdminProcedure
    .input(
      z.object({
        siteId: z.string(),
        name: z.string().min(2),
        description: z.string().optional(),
        frequency: z.enum(["DAILY", "SPECIFIC_DAYS", "EVERY_OTHER_DAY", "WEEKLY", "FORTNIGHTLY", "MONTHLY"]),
        customDays: z.array(z.enum(["MON","TUE","WED","THU","FRI","SAT","SUN"])).optional(),
        mustDoneByTime: z.string().regex(/^\d{2}:\d{2}$/).default("17:00"),
        assignedToId: z.string().optional(),
        auditQuestions: z.array(z.string().min(2)).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { customDays, auditQuestions, assignedToId, ...rest } = input;
      return ctx.prisma.recurringJobTemplate.create({
        data: {
          ...rest,
          organisationId: ctx.session.organisationId,
          createdById: ctx.session.userId,
          assignedToId: assignedToId ?? null,
          customDays: customDays ? (customDays as unknown as import("@prisma/client").Prisma.InputJsonValue) : undefined,
          auditQuestions: auditQuestions
            ? (auditQuestions as unknown as import("@prisma/client").Prisma.InputJsonValue)
            : undefined,
        },
        include: {
          site: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }),

  /** Update a template */
  updateTemplate: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        frequency: z.enum(["DAILY", "SPECIFIC_DAYS", "EVERY_OTHER_DAY", "WEEKLY", "FORTNIGHTLY", "MONTHLY"]).optional(),
        customDays: z.array(z.enum(["MON","TUE","WED","THU","FRI","SAT","SUN"])).optional(),
        mustDoneByTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        assignedToId: z.string().nullable().optional(),
        auditQuestions: z.array(z.string().min(2)).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, customDays, auditQuestions, ...rest } = input;
      const template = await ctx.prisma.recurringJobTemplate.findFirst({
        where: { id, organisationId: ctx.session.organisationId },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.recurringJobTemplate.update({
        where: { id },
        data: {
          ...rest,
          ...(customDays !== undefined
            ? { customDays: customDays as unknown as import("@prisma/client").Prisma.InputJsonValue }
            : {}),
          ...(auditQuestions !== undefined
            ? { auditQuestions: auditQuestions as unknown as import("@prisma/client").Prisma.InputJsonValue }
            : {}),
        },
        include: {
          site: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }),

  /** Delete (hard) a template — removes all occurrences via cascade */
  deleteTemplate: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.recurringJobTemplate.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.recurringJobTemplate.delete({ where: { id: input.id } });
    }),

  // ── ADMIN: view occurrences / history ───────────────────────────────────

  /** Today's occurrences for admin view — auto-generates any missing */
  todayOccurrences: orgAdminProcedure
    .input(z.object({ siteId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await ensureTodayOccurrences(ctx.prisma, ctx.session.organisationId);
      const today = toMidnightUTC(new Date());
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      return ctx.prisma.recurringJobOccurrence.findMany({
        where: {
          dueDate: { gte: today, lt: tomorrow },
          template: {
            organisationId: ctx.session.organisationId,
            ...(input.siteId ? { siteId: input.siteId } : {}),
          },
        },
        include: {
          template: {
            include: {
              site: { select: { id: true, name: true } },
              assignedTo: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          claimedBy: { select: { id: true, firstName: true, lastName: true } },
          auditAnswers: true,
        },
        orderBy: { template: { mustDoneByTime: "asc" } },
      });
    }),

  /** History of occurrences (any date range) */
  occurrenceHistory: orgAdminProcedure
    .input(
      z.object({
        siteId: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const from = input.from ? new Date(input.from) : undefined;
      const to = input.to ? new Date(input.to) : undefined;

      return ctx.prisma.recurringJobOccurrence.findMany({
        where: {
          template: {
            organisationId: ctx.session.organisationId,
            ...(input.siteId ? { siteId: input.siteId } : {}),
          },
          ...(from || to
            ? {
                dueDate: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
        include: {
          template: { include: { site: { select: { id: true, name: true } } } },
          claimedBy: { select: { id: true, firstName: true, lastName: true } },
          auditAnswers: true,
        },
        orderBy: { dueDate: "desc" },
        take: 200,
      });
    }),

  // ── VALETER: see + claim + complete ─────────────────────────────────────

  /**
   * Valeter's recurring jobs for today.
   * Returns occurrences where:
   *   - template.siteId matches the valeter's site
   *   - AND (assignedToId == valeter OR assignedToId == null [open-claim])
   * Auto-generates any missing occurrences first.
   */
  myTodayJobs: protectedProcedure.query(async ({ ctx }) => {
    const siteId = ctx.session.siteId;
    if (!siteId) return [];

    await ensureTodayOccurrences(ctx.prisma, ctx.session.organisationId);

    const today = toMidnightUTC(new Date());
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    return ctx.prisma.recurringJobOccurrence.findMany({
      where: {
        dueDate: { gte: today, lt: tomorrow },
        template: {
          organisationId: ctx.session.organisationId,
          siteId,
          isActive: true,
          OR: [
            { assignedToId: ctx.session.userId },
            { assignedToId: null },
          ],
        },
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            mustDoneByTime: true,
            auditQuestions: true,
            assignedToId: true,
          },
        },
        claimedBy: { select: { id: true, firstName: true, lastName: true } },
        auditAnswers: true,
      },
      orderBy: { template: { mustDoneByTime: "asc" } },
    });
  }),

  /** Valeter claims an occurrence (marks as IN_PROGRESS / CLAIMED) */
  claim: protectedProcedure
    .input(z.object({ occurrenceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const occ = await ctx.prisma.recurringJobOccurrence.findFirst({
        where: {
          id: input.occurrenceId,
          status: "PENDING",
          template: {
            organisationId: ctx.session.organisationId,
            OR: [
              { assignedToId: ctx.session.userId },
              { assignedToId: null },
            ],
          },
        },
      });
      if (!occ) throw new TRPCError({ code: "NOT_FOUND", message: "Job not available to claim" });

      return ctx.prisma.recurringJobOccurrence.update({
        where: { id: input.occurrenceId },
        data: {
          status: "CLAIMED",
          claimedById: ctx.session.userId,
          claimedAt: new Date(),
        },
      });
    }),

  /**
   * Valeter completes an occurrence — submits audit answers + optional photo/note.
   * All required audit questions must be answered.
   */
  complete: protectedProcedure
    .input(
      z.object({
        occurrenceId: z.string(),
        auditAnswers: z
          .array(z.object({ question: z.string(), answer: z.boolean() }))
          .optional(),
        photoUrl: z.string().url().optional(),
        completionNote: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const occ = await ctx.prisma.recurringJobOccurrence.findFirst({
        where: {
          id: input.occurrenceId,
          status: { in: ["PENDING", "CLAIMED"] },
          template: { organisationId: ctx.session.organisationId },
        },
        include: { template: { select: { auditQuestions: true, assignedToId: true } } },
      });
      if (!occ) throw new TRPCError({ code: "NOT_FOUND", message: "Occurrence not found or already completed" });

      // Only the assigned or claimer can complete (or any valeter if open-claim)
      const isAssigned = !occ.template.assignedToId || occ.template.assignedToId === ctx.session.userId;
      const isClaimer = !occ.claimedById || occ.claimedById === ctx.session.userId;
      if (!isAssigned && !isClaimer) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This job was claimed by someone else" });
      }

      // Write audit answers
      if (input.auditAnswers && input.auditAnswers.length > 0) {
        await ctx.prisma.recurringJobAuditAnswer.createMany({
          data: input.auditAnswers.map((a) => ({
            id: `rja_${input.occurrenceId}_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
            occurrenceId: input.occurrenceId,
            question: a.question,
            answer: a.answer,
          })),
          skipDuplicates: true,
        });
      }

      return ctx.prisma.recurringJobOccurrence.update({
        where: { id: input.occurrenceId },
        data: {
          status: "COMPLETED",
          claimedById: occ.claimedById ?? ctx.session.userId,
          claimedAt: occ.claimedAt ?? new Date(),
          completedAt: new Date(),
          photoUrl: input.photoUrl ?? null,
          completionNote: input.completionNote ?? null,
        },
      });
    }),

  // ── Admin: mark occurrence missed (cron / manual) ────────────────────────

  markMissed: orgAdminProcedure
    .input(z.object({ occurrenceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.recurringJobOccurrence.update({
        where: { id: input.occurrenceId },
        data: { status: "MISSED" },
      });
    }),
});
