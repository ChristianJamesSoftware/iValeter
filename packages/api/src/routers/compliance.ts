import { z } from "zod";
import { router, orgAdminProcedure } from "../trpc";

export const complianceRouter = router({
  /**
   * List all valeters in the org with their compliance documents.
   */
  list: orgAdminProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      where: {
        organisationId: ctx.session.organisationId,
        role: "valeter",
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        complianceDocuments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    return users;
  }),

  /**
   * Upsert a compliance document for a valeter.
   * If docId is provided → update, otherwise → create.
   */
  upsert: orgAdminProcedure
    .input(
      z.object({
        docId: z.string().optional(),
        userId: z.string(),
        type: z.enum(["DBS", "RTW", "DRIVING_LICENCE", "CONTRACT"]),
        status: z.enum(["PENDING", "VALID", "EXPIRED", "FLAGGED"]).optional(),
        reference: z.string().optional(),
        issuedAt: z.string().optional(), // ISO date string
        expiresAt: z.string().optional(), // ISO date string
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user belongs to this org
      const user = await ctx.prisma.user.findFirst({
        where: {
          id: input.userId,
          organisationId: ctx.session.organisationId,
        },
        select: { id: true },
      });
      if (!user) throw new Error("Valeter not found in your organisation");

      const data = {
        userId: input.userId,
        type: input.type,
        status: input.status ?? "PENDING",
        reference: input.reference ?? null,
        issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      };

      if (input.docId) {
        // Verify document belongs to a valeter in this org
        const existing = await ctx.prisma.complianceDocument.findFirst({
          where: {
            id: input.docId,
            user: { organisationId: ctx.session.organisationId },
          },
          select: { id: true },
        });
        if (!existing) throw new Error("Document not found");
        return ctx.prisma.complianceDocument.update({
          where: { id: input.docId },
          data,
        });
      }

      return ctx.prisma.complianceDocument.create({ data });
    }),

  /**
   * Delete a compliance document (hard delete).
   */
  delete: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.prisma.complianceDocument.findFirst({
        where: {
          id: input.id,
          user: { organisationId: ctx.session.organisationId },
        },
        select: { id: true },
      });
      if (!doc) throw new Error("Document not found");
      return ctx.prisma.complianceDocument.delete({ where: { id: input.id } });
    }),
});
