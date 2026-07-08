import { z } from "zod";
import { router, orgAdminProcedure, superAdminProcedure, valeterProcedure, protectedProcedure } from "../trpc";

/**
 * Bank Details Change Request router
 *
 * - Account managers / org admins raise a change request on behalf of a valeter
 * - £25 admin fee is recorded immediately; payroll picks it up that week
 * - Photo evidence URL stored (uploaded separately via file upload)
 * - Super admin / org admin can approve (applies new details) or reject
 */
export const bankChangesRouter = router({

  /** List all bank change requests for a valeter (valeter card view — org admin) */
  listForValeter: orgAdminProcedure
    .input(z.object({ valeterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.bankChangeRequest.findMany({
        where: {
          valeterId: input.valeterId,
          valeter: { organisationId: ctx.session.organisationId },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** Org admin: list all pending requests across their org (for ops overview) */
  listPendingForOrg: orgAdminProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.bankChangeRequest.findMany({
        where: {
          status: "PENDING",
          valeter: { organisationId: ctx.session.organisationId },
        },
        include: {
          valeter: {
            select: { id: true, firstName: true, lastName: true, payId: true, site: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  /**
   * Raise a new bank change request.
   * Called by account manager / ops admin.
   * Creates the request + immediately records the £25 fee (feeDeducted = false
   * so payroll can pick it up for the current/next week).
   */
  create: orgAdminProcedure
    .input(z.object({
      valeterId:         z.string(),
      newSortCode:       z.string().min(1),
      newAccountNumber:  z.string().min(1),
      newAccountName:    z.string().min(1),
      newBankReference:  z.string().optional(),
      evidenceUrl:       z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify valeter belongs to this org
      const valeter = await ctx.prisma.user.findFirst({
        where: { id: input.valeterId, organisationId: ctx.session.organisationId },
        select: { id: true },
      });
      if (!valeter) throw new Error("Valeter not found in your organisation");

      return ctx.prisma.bankChangeRequest.create({
        data: {
          valeterId:        input.valeterId,
          newSortCode:      input.newSortCode.replace(/\D/g, "").replace(/(\d{2})(\d{2})(\d{2})/, "$1-$2-$3"),
          newAccountNumber: input.newAccountNumber.trim(),
          newAccountName:   input.newAccountName.trim(),
          newBankReference: input.newBankReference?.trim() ?? null,
          evidenceUrl:      input.evidenceUrl ?? null,
          feeAmount:        25,
          feeDeducted:      false,
          status:           "PENDING",
        },
      });
    }),

  /** Approve: apply new details to the User record, mark request approved */
  approve: orgAdminProcedure
    .input(z.object({
      id:    z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.bankChangeRequest.findFirst({
        where: { id: input.id, valeter: { organisationId: ctx.session.organisationId } },
      });
      if (!req) throw new Error("Request not found");

      // Apply new bank details to the User record
      await ctx.prisma.user.update({
        where: { id: req.valeterId },
        data: {
          bankSortCode:      req.newSortCode,
          bankAccountNumber: req.newAccountNumber,
          bankAccountName:   req.newAccountName,
          bankReference:     req.newBankReference ?? null,
        },
      });

      return ctx.prisma.bankChangeRequest.update({
        where: { id: input.id },
        data: { status: "APPROVED", notes: input.notes ?? null },
      });
    }),

  /** Reject: record rejection, bank details unchanged */
  reject: orgAdminProcedure
    .input(z.object({
      id:    z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.bankChangeRequest.findFirst({
        where: { id: input.id, valeter: { organisationId: ctx.session.organisationId } },
      });
      if (!req) throw new Error("Request not found");

      return ctx.prisma.bankChangeRequest.update({
        where: { id: input.id },
        data: {
          status:     "REJECTED",
          notes:      input.notes ?? null,
          reviewedBy: ctx.session.userId,
          reviewedAt: new Date(),
        },
      });
    }),

  /**
   * Valeter self-service: submit a bank change request from the valeter app.
   * Creates a VALETER_REQUESTED record — account manager must review before ops apply.
   * £25 fee is NOT applied until account manager approves.
   */
  valeterRequest: valeterProcedure
    .input(z.object({
      newSortCode:      z.string().min(6),
      newAccountNumber: z.string().min(8),
      newAccountName:   z.string().min(1),
      newBankReference: z.string().optional(),
      evidenceUrl:      z.string().optional(), // photo of bank statement
    }))
    .mutation(async ({ ctx, input }) => {
      // Check no open request already
      const existing = await ctx.prisma.bankChangeRequest.findFirst({
        where: {
          valeterId: ctx.session.userId,
          status: { in: ["VALETER_REQUESTED", "PENDING"] },
        },
        select: { id: true },
      });
      if (existing) throw new Error("You already have a bank change request in progress. Please wait for it to be reviewed.");

      return ctx.prisma.bankChangeRequest.create({
        data: {
          valeterId:        ctx.session.userId,
          newSortCode:      input.newSortCode.replace(/\D/g, "").replace(/(\d{2})(\d{2})(\d{2})/, "$1-$2-$3"),
          newAccountNumber: input.newAccountNumber.trim(),
          newAccountName:   input.newAccountName.trim(),
          newBankReference: input.newBankReference?.trim() ?? null,
          evidenceUrl:      input.evidenceUrl ?? null,
          feeAmount:        25,
          feeDeducted:      false,
          status:           "VALETER_REQUESTED",
        },
      });
    }),

  /** Valeter: view their own bank change requests */
  myRequests: valeterProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.bankChangeRequest.findMany({
        where: { valeterId: ctx.session.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true, status: true, createdAt: true, notes: true,
          newAccountName: true, newSortCode: true, newAccountNumber: true,
          feeAmount: true, feeDeducted: true,
        },
      });
    }),

  /** Account manager: list VALETER_REQUESTED items for review */
  listValeterRequested: orgAdminProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.bankChangeRequest.findMany({
        where: {
          status: "VALETER_REQUESTED",
          valeter: { organisationId: ctx.session.organisationId },
        },
        include: {
          valeter: {
            select: {
              id: true, firstName: true, lastName: true, payId: true,
              bankSortCode: true, bankAccountNumber: true, bankAccountName: true,
              site: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  /** Account manager + ops: list ALL requests (any status) for the history view */
  listAllForOrg: orgAdminProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.bankChangeRequest.findMany({
        where: { valeter: { organisationId: ctx.session.organisationId } },
        include: {
          valeter: {
            select: { id: true, firstName: true, lastName: true, payId: true, site: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }),

  /**
   * Account manager: mark verbal confirmation ("I have called and confirmed").
   * Must be done before approve is possible.
   */
  markVerbalConfirmation: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.bankChangeRequest.findFirst({
        where: { id: input.id, valeter: { organisationId: ctx.session.organisationId } },
        select: { id: true, status: true },
      });
      if (!req) throw new Error("Request not found");
      if (req.status !== "VALETER_REQUESTED") throw new Error("Request is not awaiting manager review");

      return ctx.prisma.bankChangeRequest.update({
        where: { id: input.id },
        data: {
          verballyConfirmedAt: new Date(),
          verballyConfirmedBy: ctx.session.userId,
        },
      });
    }),

  /**
   * Account manager approves the valeter's request:
   * moves VALETER_REQUESTED → PENDING (now visible to ops for final application).
   * REQUIRES verbal confirmation to have been recorded first.
   * This is when the £25 fee is formally triggered.
   */
  managerApprove: orgAdminProcedure
    .input(z.object({ id: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.bankChangeRequest.findFirst({
        where: { id: input.id, valeter: { organisationId: ctx.session.organisationId } },
      });
      if (!req) throw new Error("Request not found");
      if (req.status !== "VALETER_REQUESTED") throw new Error("Request is not in VALETER_REQUESTED state");
      if (!req.verballyConfirmedAt)
        throw new Error("You must confirm you have called and verbally verified the bank details before approving.");

      return ctx.prisma.bankChangeRequest.update({
        where: { id: input.id },
        data: {
          status:     "PENDING",
          notes:      input.notes ?? null,
          reviewedBy: ctx.session.userId,
          reviewedAt: new Date(),
        },
      });
    }),

  /** Mark the £25 fee as deducted (called by payroll when it processes the week) */
  markFeeDeducted: orgAdminProcedure
    .input(z.object({
      id:          z.string(),
      weekStart:   z.string(), // ISO date e.g. "2026-07-07"
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.bankChangeRequest.update({
        where: { id: input.id },
        data: { feeDeducted: true, weekDeducted: input.weekStart },
      });
    }),
});
