import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, orgAdminProcedure, superAdminProcedure } from "../trpc";

export const dealershipRequestsRouter = router({
  /** List all requests for this org (manager + ops admin) */
  list: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.dealershipRequest.findMany({
      where: { organisationId: ctx.session.organisationId },
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy:  { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }),

  /** List all PENDING requests across all orgs — for super_admin ops review */
  listAllPending: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.dealershipRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        organisation: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }),

  /** Manager submits a new customer request */
  submit: orgAdminProcedure
    .input(
      z.object({
        name:         z.string().min(1),
        address:      z.string().optional(),
        contactName:  z.string().optional(),
        contactEmail: z.string().email().optional().or(z.literal("")),
        contactPhone: z.string().optional(),
        notes:        z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dealershipRequest.create({
        data: {
          organisationId: ctx.session.organisationId,
          name:           input.name.trim(),
          address:        input.address || undefined,
          contactName:    input.contactName || undefined,
          contactEmail:   input.contactEmail || undefined,
          contactPhone:   input.contactPhone || undefined,
          notes:          input.notes || undefined,
          requestedById:  ctx.session.userId,
        },
      });
    }),

  /** Ops: approve — creates the live Dealership and links it back */
  approve: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.dealershipRequest.findUnique({
        where: { id: input.id },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (req.status !== "PENDING")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Request already reviewed" });

      const dealership = await ctx.prisma.dealership.create({
        data: {
          organisationId: req.organisationId,
          name:           req.name,
          address:        req.address ?? undefined,
          contactName:    req.contactName ?? undefined,
          contactEmail:   req.contactEmail ?? undefined,
          contactPhone:   req.contactPhone ?? undefined,
        },
      });

      return ctx.prisma.dealershipRequest.update({
        where: { id: input.id },
        data: {
          status:       "APPROVED",
          dealershipId: dealership.id,
          reviewedById: ctx.session.userId,
        },
      });
    }),

  /** Ops: reject with an optional note */
  reject: superAdminProcedure
    .input(z.object({ id: z.string(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.dealershipRequest.findUnique({
        where: { id: input.id },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (req.status !== "PENDING")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Request already reviewed" });

      return ctx.prisma.dealershipRequest.update({
        where: { id: input.id },
        data: {
          status:        "REJECTED",
          rejectionNote: input.note || undefined,
          reviewedById:  ctx.session.userId,
        },
      });
    }),
});
