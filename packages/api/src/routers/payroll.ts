/**
 * Payroll router — NatWest Bankline ad-hoc bulk payment export
 *
 * File format (pipe-delimited .txt):
 *   Row 08 — header: payment type, your reference, debit account, currency, amount, date, ...
 *   Row 09 — payee:  payment type, blank, blank, GBP, amount, blank, sort code, account, blank, payee name, blank x3, payee reference
 *
 * NatWest Bankline field rules:
 *   - Sort code:      6 digits, no dashes (e.g. 309609)
 *   - Account number: 8 digits
 *   - Payee name:     max 18 chars
 *   - Payee ref:      max 8 chars (the valeter's bankReference e.g. ABBIWD)
 *   - Your reference: max 18 chars (e.g. TVLTWAGESJUL26)
 *   - Payment date:   DDMMYYYY
 *   - Amount:         pence as integer string (e.g. 12800 for £128.00)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, superAdminProcedure, orgAdminProcedure } from "../trpc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSortCode(raw: string): string {
  // Strip dashes and spaces, return 6 digits
  return raw.replace(/[^0-9]/g, "").substring(0, 6);
}

function formatDate(date: Date): string {
  // DDMMYYYY
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear().toString();
  return `${d}${m}${y}`;
}

function amountToPence(amount: number): string {
  // NatWest expects pence as integer (no decimal point)
  return Math.round(amount * 100).toString();
}

function buildYourReference(weekEnding: Date): string {
  // e.g. TVLTWAGESJUL26 — max 18 chars
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const mon = months[weekEnding.getMonth()];
  const yr = weekEnding.getFullYear().toString().substring(2);
  return `TVLTWAGES${mon}${yr}`.substring(0, 18);
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const payrollRouter = router({

  /**
   * List all pay runs for the org (most recent first).
   */
  listPayRuns: orgAdminProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.payRun.findMany({
        where: { organisationId: ctx.session.organisationId },
        include: {
          lines: {
            select: {
              id: true,
              userId: true,
              totalAmount: true,
              bankSortCode: true,
              bankAccountNumber: true,
              bankReference: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { weekStarting: "desc" },
        take: input?.limit ?? 20,
      });
    }),

  /**
   * Generate a NatWest Bankline ad-hoc bulk payment .txt file for a pay run.
   * Returns the file content as a string — the frontend can trigger a download.
   *
   * Required inputs:
   *   - payRunId: the pay run to export
   *   - debitAccount: your NatWest account number (sort code + account, e.g. "50000087654321")
   *   - paymentDate: date payments should be made (ISO string, e.g. "2026-07-11")
   */
  exportNatWest: superAdminProcedure
    .input(
      z.object({
        payRunId: z.string(),
        debitAccount: z.string().min(1, "Debit account required"),
        paymentDate: z.string().min(1, "Payment date required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const payRun = await ctx.prisma.payRun.findUnique({
        where: { id: input.payRunId },
        include: {
          lines: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  bankSortCode: true,
                  bankAccountNumber: true,
                  bankAccountName: true,
                  bankReference: true,
                },
              },
            },
          },
        },
      });

      if (!payRun) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pay run not found" });
      }
      if (payRun.organisationId !== ctx.session.organisationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (payRun.lines.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pay run has no lines" });
      }

      const paymentDate = new Date(input.paymentDate);
      const yourRef = buildYourReference(payRun.weekEnding);
      const totalAmount = payRun.lines.reduce((sum, l) => sum + l.totalAmount, 0);

      // Validation — flag lines missing bank details
      const missing: string[] = [];
      for (const line of payRun.lines) {
        const sc = line.bankSortCode ?? line.user.bankSortCode;
        const an = line.bankAccountNumber ?? line.user.bankAccountNumber;
        if (!sc || !an) {
          missing.push(`${line.user.firstName} ${line.user.lastName}`);
        }
      }
      if (missing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Missing bank details for: ${missing.join(", ")}. Add sort code and account number to their profiles before exporting.`,
        });
      }

      // ── Build file rows ──────────────────────────────────────────────────
      const rows: string[] = [];

      // Row 08 — header
      // Columns: payment type | your reference | debit account | currency | total amount | payment date | (10 blank cols)
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

      // Row 09 — one per payee
      for (const line of payRun.lines) {
        const sortCode = formatSortCode(
          (line.bankSortCode ?? line.user.bankSortCode) as string,
        );
        const accountNumber = (
          line.bankAccountNumber ?? line.user.bankAccountNumber
        ) as string;
        const payeeName = (
          line.bankAccountName ??
          line.user.bankAccountName ??
          `${line.user.firstName} ${line.user.lastName}`
        )
          .toUpperCase()
          .substring(0, 18);
        const payeeRef = (
          line.bankReference ?? line.user.bankReference ?? ""
        )
          .toUpperCase()
          .substring(0, 8);
        const amount = amountToPence(line.totalAmount);

        // Columns: payment type | blank | blank | GBP | amount | blank | sort code | account | blank | payee name | blank x3 | payee ref
        rows.push(
          [
            "09",
            "",
            "",
            "GBP",
            amount,
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

      const fileContent = rows.join("\n");

      // Mark the pay run as exported
      await ctx.prisma.payRun.update({
        where: { id: input.payRunId },
        data: { status: "EXPORTED", exportedAt: new Date() },
      });

      return {
        fileContent,
        filename: `natwest-payroll-${yourRef.toLowerCase()}.txt`,
        lineCount: payRun.lines.length,
        totalAmount,
        yourReference: yourRef,
        paymentDate: formatDate(paymentDate),
      };
    }),

  /**
   * Preview the NatWest export — same as exportNatWest but does NOT mark as exported.
   * Use this to let admins review before committing.
   */
  previewNatWest: superAdminProcedure
    .input(
      z.object({
        payRunId: z.string(),
        debitAccount: z.string().min(1),
        paymentDate: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const payRun = await ctx.prisma.payRun.findUnique({
        where: { id: input.payRunId },
        include: {
          lines: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  bankSortCode: true,
                  bankAccountNumber: true,
                  bankAccountName: true,
                  bankReference: true,
                },
              },
            },
          },
        },
      });

      if (!payRun) throw new TRPCError({ code: "NOT_FOUND" });
      if (payRun.organisationId !== ctx.session.organisationId) throw new TRPCError({ code: "FORBIDDEN" });

      const paymentDate = new Date(input.paymentDate);
      const yourRef = buildYourReference(payRun.weekEnding);

      // Return a preview table — each line with name, sort code, account, amount, ref, and a flag if missing
      return {
        yourReference: yourRef,
        paymentDate: formatDate(paymentDate),
        debitAccount: input.debitAccount,
        weekStarting: payRun.weekStarting,
        weekEnding: payRun.weekEnding,
        totalAmount: payRun.lines.reduce((s, l) => s + l.totalAmount, 0),
        lines: payRun.lines.map((line) => {
          const sortCode = line.bankSortCode ?? line.user.bankSortCode ?? null;
          const accountNumber = line.bankAccountNumber ?? line.user.bankAccountNumber ?? null;
          const payeeRef = line.bankReference ?? line.user.bankReference ?? null;
          const payeeName = (
            line.bankAccountName ??
            line.user.bankAccountName ??
            `${line.user.firstName} ${line.user.lastName}`
          ).toUpperCase();

          return {
            name: `${line.user.firstName} ${line.user.lastName}`,
            payeeName: payeeName.substring(0, 18),
            sortCode: sortCode ? formatSortCode(sortCode) : null,
            accountNumber,
            bankReference: payeeRef,
            amount: line.totalAmount,
            missingBankDetails: !sortCode || !accountNumber,
            missingReference: !payeeRef,
          };
        }),
      };
    }),
});
