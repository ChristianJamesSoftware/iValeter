import { z } from "zod";
import { router, orgAdminProcedure, superAdminProcedure } from "../trpc";

/**
 * Bank Details Change Request router
 *
 * - Account managers / org admins raise a change request on behalf of a valeter
 * - £25 admin fee is recorded immediately; payroll picks it up that week
 * - Photo evidence URL stored (uploaded separately via file upload)
 * - Super admin / org admin can approve (applies new details) or reject
 */
export const bankChangesRouter = router({

  /** List all bank change requests for a valeter (valeter card view) */
  listForValeter: superAdminProcedure
    .input(z.object({ valeterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.bankChangeRequest.findMany({
        where: { valeterId: input.valeterId },
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

  /** Reject: record rejection, bank details unchanged, fee still applies */
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
        data: { status: "REJECTED", notes: input.notes ?? null },
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
