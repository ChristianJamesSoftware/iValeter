import { z } from "zod";
import type { Prisma } from "@ivaleter/db";
import { router, orgAdminProcedure } from "../trpc";

export const timesheetsRouter = router({
  list: orgAdminProcedure
    .input(
      z.object({
        weekStart: z.string().optional(),
        siteId: z.string().optional(),
        departmentId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TimesheetWhereInput = {
        user: { organisationId: ctx.session.organisationId },
      };
      if (input.weekStart) where.weekStarting = new Date(input.weekStart);
      if (input.siteId) where.siteId = input.siteId;

      return ctx.prisma.timesheet.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              payId: true,
              dailyRate: true,
              site: { select: { name: true } },
            },
          },
          site: { select: { name: true } },
          lines: true,
        },
        orderBy: { weekStarting: "desc" },
      });
    }),
});
