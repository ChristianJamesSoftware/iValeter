/**
 * Payroll router — NatWest Bankline ad-hoc bulk payment export
 *
 * File format (comma-delimited .txt):
 *   Row 08 — header: payment type, your reference, debit account, currency, amount, date, ...
 *   Row 09 — payee:  payment type, blank, blank, GBP, amount (pence), blank, sort code, account, blank, payee name, blank x3, payee reference
 *
 * NatWest Bankline field rules:
 *   - Sort code:      6 digits, no dashes (e.g. 309609)
 *   - Account number: 8 digits
 *   - Payee name:     max 18 chars, uppercase
 *   - Payee ref:      max 8 chars (valeter's bankReference e.g. ABBIWD)
 *   - Your reference: max 18 chars (e.g. TVLTWAGESJUL26)
 *   - Payment date:   DDMMYYYY
 *   - Amount:         pence as integer string (e.g. 12800 for £128.00)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, superAdminProcedure } from "../trpc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSortCode(raw: string): string {
  return raw.replace(/[^0-9]/g, "").substring(0, 6);
}

function formatDate(date: Date): string {
  const d = date.getUTCDate().toString().padStart(2, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const y = date.getUTCFullYear().toString();
  return `${d}${m}${y}`;
}

function amountToPence(amount: number): string {
  return Math.round(amount * 100).toString();
}

function buildYourReference(weekEnding: Date): string {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const mon = months[weekEnding.getUTCMonth()];
  const yr = weekEnding.getUTCFullYear().toString().substring(2);
  return `TVLTWAGES${mon}${yr}`.substring(0, 18);
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const payrollRouter = router({

  /**
   * Preview the NatWest export for a payroll week.
   * Returns a table of valeters with bank details, amounts, and any flags.
   * Does NOT generate the file or mark anything as exported.
   */
  previewNatWest: superAdminProcedure
    .input(
      z.object({
        weekStart: z.string(),      // ISO date e.g. "2026-07-06"
        paymentDate: z.string(),    // ISO date e.g. "2026-07-11"
        debitAccount: z.string(),   // NatWest debit account e.g. "50000087654321"
      }),
    )
    .query(async ({ ctx, input }) => {
      const weekStartDate = new Date(input.weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      weekEndDate.setHours(23, 59, 59, 999);

      const timesheets = await ctx.prisma.timesheet.findMany({
        where: {
          user: { organisationId: ctx.session.organisationId },
          weekStarting: weekStartDate,
          status: { in: ["APPROVED", "LOCKED"] },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              dailyRate: true,
              bankSortCode: true,
              bankAccountNumber: true,
              bankAccountName: true,
              bankReference: true,
            },
          },
        },
        orderBy: { weekStarting: "desc" },
      });

      const paymentDate = new Date(input.paymentDate);
      const yourRef = buildYourReference(weekEndDate);

      const lines = timesheets.map((ts) => {
        const dailyRate = ts.user.dailyRate ?? 0;
        const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0;
        const totalAmount =
          ts.totalRegularHours * hourlyRate +
          ts.totalOvertimeHours * hourlyRate * 1.5;

        const sortCode = ts.user.bankSortCode ?? null;
        const accountNumber = ts.user.bankAccountNumber ?? null;
        const bankRef = ts.user.bankReference ?? null;
        const payeeName = (
          ts.user.bankAccountName ??
          `${ts.user.firstName} ${ts.user.lastName}`
        ).toUpperCase();

        return {
          name: `${ts.user.firstName} ${ts.user.lastName}`,
          payeeName: payeeName.substring(0, 18),
          sortCode: sortCode ? formatSortCode(sortCode) : null,
          accountNumber,
          bankReference: bankRef,
          amount: totalAmount,
          missingBankDetails: !sortCode || !accountNumber,
          missingReference: !bankRef,
        };
      });

      return {
        yourReference: yourRef,
        paymentDate: formatDate(paymentDate),
        debitAccount: input.debitAccount,
        weekStart: input.weekStart,
        weekEnd: weekEndDate.toISOString().slice(0, 10),
        totalAmount: lines.reduce((s, l) => s + l.amount, 0),
        lineCount: lines.length,
        lines,
      };
    }),

  /**
   * Generate and return the NatWest Bankline .txt file content.
   * Only includes APPROVED or LOCKED timesheets.
   * Returns fileContent as a string — frontend triggers the download.
   */
  exportNatWest: superAdminProcedure
    .input(
      z.object({
        weekStart: z.string(),
        paymentDate: z.string(),
        debitAccount: z.string().min(1, "Debit account required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const weekStartDate = new Date(input.weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      weekEndDate.setHours(23, 59, 59, 999);

      const timesheets = await ctx.prisma.timesheet.findMany({
        where: {
          user: { organisationId: ctx.session.organisationId },
          weekStarting: weekStartDate,
          status: { in: ["APPROVED", "LOCKED"] },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              dailyRate: true,
              bankSortCode: true,
              bankAccountNumber: true,
              bankAccountName: true,
              bankReference: true,
            },
          },
        },
        orderBy: { weekStarting: "desc" },
      });

      if (timesheets.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No approved timesheets found for this week. Approve timesheets before exporting.",
        });
      }

      // Validate bank details
      const missing: string[] = [];
      for (const ts of timesheets) {
        if (!ts.user.bankSortCode || !ts.user.bankAccountNumber) {
          missing.push(`${ts.user.firstName} ${ts.user.lastName}`);
        }
      }
      if (missing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Missing bank details for: ${missing.join(", ")}. Add sort code and account number to their profiles before exporting.`,
        });
      }

      const paymentDate = new Date(input.paymentDate);
      const yourRef = buildYourReference(weekEndDate);
      const totalAmount = timesheets.reduce((sum, ts) => {
        const dailyRate = ts.user.dailyRate ?? 0;
        const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0;
        return sum + ts.totalRegularHours * hourlyRate + ts.totalOvertimeHours * hourlyRate * 1.5;
      }, 0);

      // ── Build file ───────────────────────────────────────────────────────
      const rows: string[] = [];

      // Row 08 — header
      rows.push(
        [
          "08",
          yourRef,
          input.debitAccount,
          "",
          "",
          formatDate(paymentDate),
          "", "", "", "", "", "", "", "", "",
        ].join(","),
      );

      // Row 09 — one per valeter
      for (const ts of timesheets) {
        const dailyRate = ts.user.dailyRate ?? 0;
        const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0;
        const amount =
          ts.totalRegularHours * hourlyRate +
          ts.totalOvertimeHours * hourlyRate * 1.5;

        const sortCode = formatSortCode(ts.user.bankSortCode!);
        const accountNumber = ts.user.bankAccountNumber!;
        const payeeName = (
          ts.user.bankAccountName ??
          `${ts.user.firstName} ${ts.user.lastName}`
        ).toUpperCase().substring(0, 18);
        const payeeRef = (ts.user.bankReference ?? "").toUpperCase().substring(0, 8);

        rows.push(
          [
            "09",
            "",
            "",
            "GBP",
            amountToPence(amount),
            "",
            sortCode,
            accountNumber,
            "",
            payeeName,
            "",
            "",
            "",
            payeeRef,
          ].join(","),
        );
      }

      const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      const mon = months[weekEndDate.getUTCMonth()] ?? "PAY";
      const yr = weekEndDate.getUTCFullYear().toString().substring(2);

      return {
        fileContent: rows.join("\n"),
        filename: `natwest-payroll-${mon.toLowerCase()}${yr}.txt`,
        lineCount: timesheets.length,
        totalAmount,
        yourReference: yourRef,
        paymentDate: formatDate(paymentDate),
      };
    }),
});
