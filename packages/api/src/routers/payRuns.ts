/**
 * Pay Runs Router
 *
 * Covers the Mon–Wed–Fri weekly pay cycle:
 *   DRAFT → APPROVED → EXPORTED (Bankline CSV) → PAID
 *
 * Key features:
 *   - generate: creates a PayRun + PayRunLines from eligible approved timesheets
 *   - approve: head office signs off the pay run
 *   - exportBankline: generates the NatWest Bankline .txt CSV content
 *   - markPaid: confirms payment landed on Friday
 *   - contractorRates CRUD: manage hourly/overtime rates per valeter
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PayRunStatus, TimesheetStatus } from "@ivaleter/db";
import { router, orgAdminProcedure } from "../trpc";

// ─── Bankline CSV Helpers ─────────────────────────────────────────────────────

/**
 * Convert a JS Date to Julian date format YYDDD required by NatWest Bankline.
 * YYDDD = last 2 digits of year + day of year (zero-padded to 3 digits).
 * e.g. 2026-06-27 → "26178"
 */
function toJulianDate(date: Date): string {
  const year = date.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 0));
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const yy = String(year).slice(-2);
  const ddd = String(dayOfYear).padStart(3, "0");
  return `${yy}${ddd}`;
}

/**
 * Build a single Bankline CSV row.
 * Format: BeneficiaryRef,DebitSortCode,DebitAccountNo,Amount,CreditDate,CreditSortCode,CreditAccountNo,BeneficiaryName,BeneficiaryRef2
 *
 * NatWest Bankline bulk payment file spec:
 * Col 1: Your reference (debit-side narrative, max 18 chars)
 * Col 2: Debit sort code (6 digits)
 * Col 3: Debit account number (8 digits)
 * Col 4: Amount in pence (integer, no decimal point)
 * Col 5: Julian date YYDDD
 * Col 6: Transaction code = 99 (BACS credit)
 * Col 7: Credit sort code (beneficiary, 6 digits)
 * Col 8: Credit account number (8 digits)
 * Col 9: Beneficiary account name (max 18 chars)
 * Col 10: Beneficiary reference (appears on their statement, max 18 chars)
 *
 * NOTE: The debit sort code / account are the paying company's details,
 * stored in Organisation or provided by the user at export time.
 */
function buildBanklineRow(params: {
  yourRef: string;
  debitSortCode: string;
  debitAccountNo: string;
  amountPence: number;
  paymentDate: Date;
  creditSortCode: string;
  creditAccountNo: string;
  beneficiaryName: string;
  beneficiaryRef: string;
}): string {
  const truncate = (s: string, max: number) =>
    s.replace(/[^A-Z0-9 /-]/gi, "").toUpperCase().slice(0, max);

  const fields = [
    truncate(params.yourRef, 18),
    params.debitSortCode.replace(/\D/g, "").padStart(6, "0"),
    params.debitAccountNo.replace(/\D/g, "").padStart(8, "0"),
    String(params.amountPence),
    toJulianDate(params.paymentDate),
    "99", // BACS credit transaction code
    params.creditSortCode.replace(/\D/g, "").padStart(6, "0"),
    params.creditAccountNo.replace(/\D/g, "").padStart(8, "0"),
    truncate(params.beneficiaryName, 18),
    truncate(params.beneficiaryRef, 18),
  ];

  return fields.join(",");
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const payRunsRouter = router({
  // ── LIST ──────────────────────────────────────────────────────────────────

  list: orgAdminProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(PayRunStatus).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.payRun.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          status: input?.status,
        },
        include: {
          _count: { select: { lines: true } },
          lines: {
            select: {
              totalAmount: true,
              regularHours: true,
              overtimeHours: true,
            },
          },
        },
        orderBy: { weekStarting: "desc" },
      });
    }),

  // ── GET BY ID ─────────────────────────────────────────────────────────────

  getById: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.prisma.payRun.findFirst({
        where: {
          id: input.id,
          organisationId: ctx.session.organisationId,
        },
        include: {
          lines: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              timesheet: {
                select: {
                  weekStarting: true,
                  totalRegularHours: true,
                  totalOvertimeHours: true,
                  site: { select: { name: true } },
                },
              },
            },
            orderBy: { user: { lastName: "asc" } },
          },
        },
      });

      if (!run) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pay run not found",
        });
      }

      // Compute summary totals
      const summary = {
        totalValeters: run.lines.length,
        totalRegularHours: run.lines.reduce((s, l) => s + l.regularHours, 0),
        totalOvertimeHours: run.lines.reduce(
          (s, l) => s + l.overtimeHours,
          0,
        ),
        totalAmount: run.lines.reduce((s, l) => s + l.totalAmount, 0),
      };

      return { ...run, summary };
    }),

  // ── GENERATE ──────────────────────────────────────────────────────────────

  /**
   * Generates a new pay run for a given week from all approved+accepted
   * timesheets that aren't yet in a pay run.
   *
   * Snapshots each valeter's current contractor rate into the PayRunLine so
   * the record is immutable even if rates change later.
   */
  generate: orgAdminProcedure
    .input(
      z.object({
        weekStarting: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check for existing pay run this week
      const existing = await ctx.prisma.payRun.findFirst({
        where: {
          organisationId: ctx.session.organisationId,
          weekStarting: input.weekStarting,
        },
      });

      if (existing && existing.status !== PayRunStatus.DRAFT) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A pay run for this week already exists with status ${existing.status}`,
        });
      }

      // Find eligible timesheets
      const timesheets = await ctx.prisma.timesheet.findMany({
        where: {
          site: { organisationId: ctx.session.organisationId },
          weekStarting: input.weekStarting,
          status: TimesheetStatus.APPROVED,
          customerAccepted: true,
          payRunLine: null,
        },
        include: {
          user: {
            include: {
              contractorRates: {
                orderBy: { effectiveFrom: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      if (timesheets.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No eligible timesheets found for this week. Timesheets must be APPROVED and customer-accepted.",
        });
      }

      // Calculate week ending
      const weekEnding = new Date(input.weekStarting);
      weekEnding.setUTCDate(weekEnding.getUTCDate() + 6);
      weekEnding.setUTCHours(23, 59, 59, 999);

      // Build or refresh the DRAFT pay run
      const payRun = existing
        ? await ctx.prisma.payRun.update({
            where: { id: existing.id },
            data: { weekEnding, updatedAt: new Date() },
          })
        : await ctx.prisma.payRun.create({
            data: {
              organisationId: ctx.session.organisationId,
              weekStarting: input.weekStarting,
              weekEnding,
              status: PayRunStatus.DRAFT,
            },
          });

      // Delete any previous DRAFT lines
      await ctx.prisma.payRunLine.deleteMany({
        where: { payRunId: payRun.id },
      });

      // Create lines, lock timesheets
      const lineData = timesheets.map((ts) => {
        const rate = ts.user.contractorRates[0];
        const hourlyRate = rate?.hourlyRate ?? 0;
        const overtimeRate = rate?.overtimeRate ?? 0;
        const totalAmount =
          ts.totalRegularHours * hourlyRate +
          ts.totalOvertimeHours * overtimeRate;

        return {
          payRunId: payRun.id,
          userId: ts.userId,
          timesheetId: ts.id,
          regularHours: ts.totalRegularHours,
          overtimeHours: ts.totalOvertimeHours,
          hourlyRate,
          overtimeRate,
          totalAmount: Math.round(totalAmount * 100) / 100,
          // Snapshot Bankline fields at generation time
          bankSortCode: ts.user.bankSortCode,
          bankAccountNumber: ts.user.bankAccountNumber,
          bankAccountName: ts.user.bankAccountName,
          bankReference: ts.user.bankReference,
        };
      });

      await ctx.prisma.payRunLine.createMany({ data: lineData });

      // Lock the timesheets so they can't be edited
      await ctx.prisma.timesheet.updateMany({
        where: { id: { in: timesheets.map((t) => t.id) } },
        data: { status: TimesheetStatus.LOCKED },
      });

      return ctx.prisma.payRun.findUnique({
        where: { id: payRun.id },
        include: {
          lines: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });
    }),

  // ── APPROVE ───────────────────────────────────────────────────────────────

  /** Head office signs off the pay run — advances to APPROVED. */
  approve: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.prisma.payRun.findFirst({
        where: {
          id: input.id,
          organisationId: ctx.session.organisationId,
          status: PayRunStatus.DRAFT,
        },
        include: { lines: true },
      });

      if (!run) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pay run not found or not in DRAFT state",
        });
      }

      if (run.lines.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot approve an empty pay run",
        });
      }

      return ctx.prisma.payRun.update({
        where: { id: run.id },
        data: { status: PayRunStatus.APPROVED },
      });
    }),

  // ── EXPORT BANKLINE ───────────────────────────────────────────────────────

  /**
   * Generates the NatWest Bankline .txt CSV content for the approved pay run.
   *
   * Returns the CSV string — the web layer handles the file download response.
   * Also records exportedAt and advances status → EXPORTED.
   *
   * The caller must supply the company's own debit sort code and account number
   * (the paying account). These are not stored per-org in MVP but should be
   * added to Organisation settings in a future iteration.
   */
  exportBankline: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        /** Company's paying account sort code (6 digits) */
        debitSortCode: z.string().regex(/^\d{6}$/, "Must be 6 digits"),
        /** Company's paying account number (8 digits) */
        debitAccountNo: z.string().regex(/^\d{8}$/, "Must be 8 digits"),
        /**
         * Payment date — normally the Friday of the pay week.
         * Used to generate the Julian date in the Bankline file.
         */
        paymentDate: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.prisma.payRun.findFirst({
        where: {
          id: input.id,
          organisationId: ctx.session.organisationId,
          status: { in: [PayRunStatus.APPROVED, PayRunStatus.EXPORTED] },
        },
        include: {
          lines: {
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      });

      if (!run) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pay run not found or not yet approved",
        });
      }

      // Validate all lines have bank details
      const missing = run.lines.filter(
        (l) => !l.bankSortCode || !l.bankAccountNumber || !l.bankAccountName,
      );

      if (missing.length > 0) {
        const names = missing
          .map((l) => `${l.user.firstName} ${l.user.lastName}`)
          .join(", ");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Missing bank details for: ${names}. Update their profiles before exporting.`,
        });
      }

      // Generate the Bankline file content
      const weekRef = run.weekStarting
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, ""); // e.g. "20260623"

      const rows = run.lines.map((line) =>
        buildBanklineRow({
          yourRef: `WAGES ${weekRef}`,
          debitSortCode: input.debitSortCode,
          debitAccountNo: input.debitAccountNo,
          amountPence: Math.round(line.totalAmount * 100),
          paymentDate: input.paymentDate,
          creditSortCode: line.bankSortCode!,
          creditAccountNo: line.bankAccountNumber!,
          beneficiaryName: line.bankAccountName!,
          beneficiaryRef: line.bankReference ?? `TOTALVAL WAGES`,
        }),
      );

      const csvContent = rows.join("\r\n");

      // Mark as exported
      await ctx.prisma.payRun.update({
        where: { id: run.id },
        data: {
          status: PayRunStatus.EXPORTED,
          exportedAt: new Date(),
        },
      });

      return {
        csvContent,
        filename: `bankline-payrun-${weekRef}.txt`,
        lineCount: rows.length,
        totalAmount: run.lines.reduce((s, l) => s + l.totalAmount, 0),
      };
    }),

  // ── MARK PAID ─────────────────────────────────────────────────────────────

  /** Confirms that Friday's payment went through. Records paidAt timestamp. */
  markPaid: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.prisma.payRun.findFirst({
        where: {
          id: input.id,
          organisationId: ctx.session.organisationId,
          status: PayRunStatus.EXPORTED,
        },
      });

      if (!run) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pay run not found or not yet exported",
        });
      }

      return ctx.prisma.payRun.update({
        where: { id: run.id },
        data: { status: PayRunStatus.PAID, paidAt: new Date() },
      });
    }),

  // ── CONTRACTOR RATES ──────────────────────────────────────────────────────

  /** List contractor rates for a given valeter. */
  getRates: orgAdminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Ensure the valeter belongs to this org
      const user = await ctx.prisma.user.findFirst({
        where: {
          id: input.userId,
          organisationId: ctx.session.organisationId,
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return ctx.prisma.contractorRate.findMany({
        where: { userId: input.userId },
        orderBy: { effectiveFrom: "desc" },
      });
    }),

  /** Set a new contractor rate (effective from a given date). */
  setRate: orgAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        hourlyRate: z.number().positive(),
        overtimeRate: z.number().positive(),
        effectiveFrom: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findFirst({
        where: {
          id: input.userId,
          organisationId: ctx.session.organisationId,
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return ctx.prisma.contractorRate.create({
        data: {
          userId: input.userId,
          hourlyRate: input.hourlyRate,
          overtimeRate: input.overtimeRate,
          effectiveFrom: input.effectiveFrom,
        },
      });
    }),

  /** Update a valeter's Bankline bank details. */
  updateBankDetails: orgAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        bankSortCode: z.string().regex(/^\d{6}$/, "Must be 6 digits"),
        bankAccountNumber: z.string().regex(/^\d{8}$/, "Must be 8 digits"),
        bankAccountName: z.string().min(1).max(18),
        bankReference: z.string().min(1).max(18).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findFirst({
        where: {
          id: input.userId,
          organisationId: ctx.session.organisationId,
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          bankSortCode: input.bankSortCode,
          bankAccountNumber: input.bankAccountNumber,
          bankAccountName: input.bankAccountName,
          bankReference: input.bankReference ?? `TOTALVAL WAGES`,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          bankSortCode: true,
          bankAccountNumber: true,
          bankAccountName: true,
          bankReference: true,
        },
      });
    }),
});
