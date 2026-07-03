/**
 * site-submissions router
 *
 * Manages the site-level timesheet bundle sent to the dealer for sign-off.
 *
 * Pipeline:
 *   1. All valeters at a site reach SA_APPROVED for the week
 *   2. Ops sees the site unlock in siteSummary → hits sendToDealer
 *   3. Dealer sees it in their portal → approve or dispute with note
 *   4. If no response after 4h → autoAcceptDue cron fires → AUTO_ACCEPTED
 *   5. Once DEALER_ACCEPTED or AUTO_ACCEPTED → Xero + NatWest export enabled
 */

import { z } from "zod";
import { router, orgAdminProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const siteSubmissionsRouter = router({
  /**
   * OPS: For a given week, return one row per site that has at least one
   * SA_APPROVED timesheet. Each row includes:
   *  - total valeters at site
   *  - how many are SA_APPROVED for this week
   *  - whether site is "ready" (all approved)
   *  - agreed hours (from contractedHours × working days) vs actual hours
   *  - current submission status (if a SiteWeekSubmission exists)
   */
  siteSummary: orgAdminProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const weekStartDate = new Date(input.weekStart);

      // Get all timesheets for the week across the org
      const timesheets = await ctx.prisma.timesheet.findMany({
        where: {
          user: { organisationId: ctx.session.organisationId },
          weekStarting: weekStartDate,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dailyRate: true,
              contractedHours: true,
              payId: true,
              bankReference: true,
              bankSortCode: true,
              bankAccountNumber: true,
              bankAccountName: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
              customerContactName: true,
              customerContactEmail: true,
            },
          },
        },
      });

      // Count total active valeters per site in the org
      const siteValeterCounts = await ctx.prisma.user.groupBy({
        by: ["siteId"],
        where: {
          organisationId: ctx.session.organisationId,
          role: "valeter",
          isActive: true,
          siteId: { not: null },
        },
        _count: { _all: true },
      });
      const totalBysite = new Map(
        siteValeterCounts.map((r) => [r.siteId ?? "", r._count._all]),
      );

      // Fetch existing SiteWeekSubmissions for this week
      const siteIds = [...new Set(timesheets.map((t) => t.siteId))];
      const submissions = await ctx.prisma.siteWeekSubmission.findMany({
        where: { siteId: { in: siteIds }, weekStarting: weekStartDate },
      });
      const submissionBySite = new Map(submissions.map((s) => [s.siteId, s]));

      // Group timesheets by site
      const bysite = new Map<string, typeof timesheets>();
      for (const ts of timesheets) {
        const arr = bysite.get(ts.siteId) ?? [];
        arr.push(ts);
        bysite.set(ts.siteId, arr);
      }

      const rows = [];
      for (const [siteId, siteTs] of bysite.entries()) {
        const site = siteTs[0]!.site;
        const approvedTs = siteTs.filter((t) => t.status === "SA_APPROVED");
        const totalValeters = totalBysite.get(siteId) ?? siteTs.length;
        const allApproved =
          approvedTs.length > 0 && approvedTs.length >= siteTs.length;

        // Agreed hours: contractedHours (per day) × 5 working days, summed across approved valeters
        const agreedHours = approvedTs.reduce(
          (acc, t) => acc + (t.user.contractedHours ?? 8) * 5,
          0,
        );
        const actualRegular = approvedTs.reduce(
          (acc, t) => acc + t.totalRegularHours,
          0,
        );
        const actualOvertime = approvedTs.reduce(
          (acc, t) => acc + t.totalOvertimeHours,
          0,
        );

        const submission = submissionBySite.get(siteId) ?? null;

        rows.push({
          siteId,
          siteName: site.name,
          customerContactName: site.customerContactName,
          customerContactEmail: site.customerContactEmail,
          totalValeters,
          approvedCount: approvedTs.length,
          totalCount: siteTs.length,
          allApproved,
          agreedHours,
          actualRegular,
          actualOvertime,
          // Submission state
          submissionId: submission?.id ?? null,
          submissionStatus: submission?.status ?? null,
          sentAt: submission?.sentAt?.toISOString() ?? null,
          dealerRespondedAt: submission?.dealerRespondedAt?.toISOString() ?? null,
          dealerDisputeNote: submission?.dealerDisputeNote ?? null,
          autoAcceptedAt: submission?.autoAcceptedAt?.toISOString() ?? null,
        });
      }

      // Sort: ready-to-send first, then by site name
      rows.sort((a, b) => {
        if (a.allApproved && !b.allApproved) return -1;
        if (!a.allApproved && b.allApproved) return 1;
        return a.siteName.localeCompare(b.siteName);
      });

      return rows;
    }),

  /**
   * OPS: Get per-valeter detail for a site+week, for the ops review panel.
   * Shows agreed vs actual per valeter — no pay figures exposed to dealer.
   */
  siteValeterDetail: orgAdminProcedure
    .input(z.object({ siteId: z.string(), weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const weekStartDate = new Date(input.weekStart);
      const timesheets = await ctx.prisma.timesheet.findMany({
        where: {
          siteId: input.siteId,
          weekStarting: weekStartDate,
          user: { organisationId: ctx.session.organisationId },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dailyRate: true,
              contractedHours: true,
              payId: true,
              bankReference: true,
              bankSortCode: true,
              bankAccountNumber: true,
              bankAccountName: true,
            },
          },
          lines: { orderBy: { date: "asc" } },
          extraLines: true,
        },
        orderBy: [{ user: { lastName: "asc" } }],
      });

      return timesheets.map((ts) => {
        const agreedHours = (ts.user.contractedHours ?? 8) * 5;
        const hourlyRate = (ts.user.dailyRate ?? 0) / 8;
        const estimatedPay =
          ts.totalRegularHours * hourlyRate +
          ts.totalOvertimeHours * hourlyRate * 1.5;

        return {
          timesheetId: ts.id,
          userId: ts.user.id,
          name: `${ts.user.firstName} ${ts.user.lastName}`,
          payId: ts.user.payId ?? null,
          bankReference: ts.user.bankReference ?? null,
          bankSortCode: ts.user.bankSortCode ?? null,
          bankAccountNumber: ts.user.bankAccountNumber ?? null,
          bankAccountName: ts.user.bankAccountName ?? null,
          dailyRate: ts.user.dailyRate ?? 0,
          hourlyRate,
          agreedHours,
          actualRegular: ts.totalRegularHours,
          actualOvertime: ts.totalOvertimeHours,
          estimatedPay,
          status: ts.status,
          extraLines: ts.extraLines.map((el) => ({
            description: el.description,
            ratePence: el.ratePence,
          })),
        };
      });
    }),

  /**
   * OPS: Send the site bundle to the dealer for approval.
   * Creates or upserts a SiteWeekSubmission and marks it SENT.
   */
  sendToDealer: orgAdminProcedure
    .input(z.object({ siteId: z.string(), weekStart: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const weekStartDate = new Date(input.weekStart);

      // Verify all timesheets for this site+week are SA_APPROVED
      const timesheets = await ctx.prisma.timesheet.findMany({
        where: {
          siteId: input.siteId,
          weekStarting: weekStartDate,
          user: { organisationId: ctx.session.organisationId },
        },
        select: { status: true },
      });

      if (timesheets.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No timesheets found for this site and week." });
      }

      const notApproved = timesheets.filter((t) => t.status !== "SA_APPROVED");
      if (notApproved.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${notApproved.length} timesheet(s) are not yet fully approved.`,
        });
      }

      const submission = await ctx.prisma.siteWeekSubmission.upsert({
        where: { siteId_weekStarting: { siteId: input.siteId, weekStarting: weekStartDate } },
        create: {
          siteId: input.siteId,
          weekStarting: weekStartDate,
          status: "SENT",
          sentAt: new Date(),
          sentByUserId: ctx.session.userId,
        },
        update: {
          status: "SENT",
          sentAt: new Date(),
          sentByUserId: ctx.session.userId,
          dealerDisputeNote: null,
          dealerRespondedAt: null,
          autoAcceptedAt: null,
        },
      });

      return submission;
    }),

  /**
   * DEALER: Accept the weekly submission for their site.
   */
  dealerAccept: protectedProcedure
    .input(z.object({ submissionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify this submission belongs to the dealer's site
      const sub = await ctx.prisma.siteWeekSubmission.findFirst({
        where: {
          id: input.submissionId,
          site: { users: { some: { id: ctx.session.userId } } },
        },
      });
      if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
      if (sub.status === "DEALER_ACCEPTED" || sub.status === "AUTO_ACCEPTED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already accepted." });
      }

      return ctx.prisma.siteWeekSubmission.update({
        where: { id: input.submissionId },
        data: {
          status: "DEALER_ACCEPTED",
          dealerRespondedAt: new Date(),
        },
      });
    }),

  /**
   * DEALER: Raise a dispute on the weekly submission.
   */
  dealerDispute: protectedProcedure
    .input(z.object({ submissionId: z.string(), note: z.string().min(5) }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.prisma.siteWeekSubmission.findFirst({
        where: {
          id: input.submissionId,
          site: { users: { some: { id: ctx.session.userId } } },
        },
      });
      if (!sub) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.siteWeekSubmission.update({
        where: { id: input.submissionId },
        data: {
          status: "DEALER_DISPUTED",
          dealerDisputeNote: input.note,
          dealerRespondedAt: new Date(),
        },
      });
    }),

  /**
   * DEALER: List submissions for the dealer's own site.
   */
  dealerList: protectedProcedure
    .input(z.object({ weekStart: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        site: { users: { some: { id: ctx.session.userId } } },
        status: { in: ["SENT", "DEALER_ACCEPTED", "DEALER_DISPUTED", "AUTO_ACCEPTED"] },
      };
      if (input.weekStart) {
        where.weekStarting = new Date(input.weekStart);
      }

      const submissions = await ctx.prisma.siteWeekSubmission.findMany({
        where,
        include: {
          site: { select: { id: true, name: true } },
        },
        orderBy: { weekStarting: "desc" },
      });

      return submissions.map((s) => ({
        id: s.id,
        siteId: s.site.id,
        siteName: s.site.name,
        weekStarting: s.weekStarting.toISOString(),
        status: s.status,
        sentAt: s.sentAt?.toISOString() ?? null,
        dealerRespondedAt: s.dealerRespondedAt?.toISOString() ?? null,
        dealerDisputeNote: s.dealerDisputeNote ?? null,
        autoAcceptedAt: s.autoAcceptedAt?.toISOString() ?? null,
        // 4-hour auto-approve deadline
        autoApproveAt: s.sentAt
          ? new Date(s.sentAt.getTime() + 4 * 60 * 60 * 1000).toISOString()
          : null,
      }));
    }),

  /**
   * CRON: Auto-accept site submissions that have been SENT for > 4 hours.
   * Called every 15 minutes by the existing cron job.
   */
  autoAcceptDue: orgAdminProcedure.mutation(async ({ ctx }) => {
    const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const result = await ctx.prisma.siteWeekSubmission.updateMany({
      where: {
        status: "SENT",
        sentAt: { lte: cutoff },
        site: { organisationId: ctx.session.organisationId },
      },
      data: {
        status: "AUTO_ACCEPTED",
        autoAcceptedAt: new Date(),
        dealerRespondedAt: new Date(),
      },
    });

    return { autoAccepted: result.count };
  }),

  /**
   * OPS: Get payroll export data for NatWest BACS file.
   * Only returns valeters from DEALER_ACCEPTED or AUTO_ACCEPTED site submissions.
   */
  natwestExport: orgAdminProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const weekStartDate = new Date(input.weekStart);

      // Find accepted site submissions for this week
      const acceptedSubmissions = await ctx.prisma.siteWeekSubmission.findMany({
        where: {
          weekStarting: weekStartDate,
          status: { in: ["DEALER_ACCEPTED", "AUTO_ACCEPTED"] },
          site: { organisationId: ctx.session.organisationId },
        },
        select: { siteId: true },
      });

      const acceptedSiteIds = acceptedSubmissions.map((s) => s.siteId);

      if (acceptedSiteIds.length === 0) return { rows: [], weekStart: input.weekStart };

      const timesheets = await ctx.prisma.timesheet.findMany({
        where: {
          siteId: { in: acceptedSiteIds },
          weekStarting: weekStartDate,
          status: "SA_APPROVED",
          user: { organisationId: ctx.session.organisationId },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              payId: true,
              bankReference: true,
              bankSortCode: true,
              bankAccountNumber: true,
              bankAccountName: true,
              dailyRate: true,
            },
          },
          site: { select: { name: true } },
          extraLines: true,
        },
        orderBy: [{ site: { name: "asc" } }, { user: { lastName: "asc" } }],
      });

      const rows = timesheets.map((ts) => {
        const hourlyRate = (ts.user.dailyRate ?? 0) / 8;
        const basePay = ts.totalRegularHours * hourlyRate + ts.totalOvertimeHours * hourlyRate * 1.5;
        const extras = ts.extraLines.reduce((acc, l) => acc + l.ratePence / 100, 0);
        const totalPay = basePay + extras;

        return {
          payId: ts.user.payId ?? "",
          name: `${ts.user.firstName} ${ts.user.lastName}`,
          siteName: ts.site.name,
          sortCode: ts.user.bankSortCode ?? "",
          accountNumber: ts.user.bankAccountNumber ?? "",
          accountName: ts.user.bankAccountName ?? "",
          reference: ts.user.bankReference ?? ts.user.payId ?? "",
          regularHours: ts.totalRegularHours,
          overtimeHours: ts.totalOvertimeHours,
          totalPayPence: Math.round(totalPay * 100),
          totalPay: totalPay.toFixed(2),
        };
      });

      return { rows, weekStart: input.weekStart };
    }),
});
