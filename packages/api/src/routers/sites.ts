import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, orgAdminProcedure } from "../trpc";

export const sitesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.site.findMany({
      where: { organisationId: ctx.session.organisationId, isActive: true },
      include: {
        departments: {
          include: { serviceTypes: { where: { isActive: true } } },
        },
        _count: { select: { bookings: true, users: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const site = await ctx.prisma.site.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
        include: {
          departments: {
            include: { serviceTypes: { where: { isActive: true } } },
          },
        },
      });
      if (!site) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
      }
      return site;
    }),

  create: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        dealershipId: z.string().optional(),
        departments: z.array(z.string()).default(["New Car Sales", "Used Car Sales", "Service"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.site.create({
        data: {
          organisationId: ctx.session.organisationId,
          name: input.name.trim(),
          address: input.address,
          dealershipId: input.dealershipId ?? null,
          departments: {
            create: input.departments.map((name) => ({ name })),
          },
        },
        include: { departments: true },
      });
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.prisma.site.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!site) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
      }
      return ctx.prisma.site.update({
        where: { id: site.id },
        data: {
          name: input.name?.trim() ?? site.name,
          address: input.address ?? site.address,
        },
      });
    }),

  setActive: orgAdminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.prisma.site.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!site) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
      }
      return ctx.prisma.site.update({
        where: { id: site.id },
        data: { isActive: input.isActive },
      });
    }),

  addDepartment: orgAdminProcedure
    .input(z.object({ siteId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.prisma.site.findFirst({
        where: { id: input.siteId, organisationId: ctx.session.organisationId },
      });
      if (!site) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
      }
      return ctx.prisma.department.create({
        data: { siteId: input.siteId, name: input.name.trim() },
      });
    }),

  deleteDepartment: orgAdminProcedure
    .input(z.object({ departmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the department belongs to this org
      const dept = await ctx.prisma.department.findFirst({
        where: { id: input.departmentId, site: { organisationId: ctx.session.organisationId } },
        include: { _count: { select: { bookings: true } } },
      });
      if (!dept) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });
      }
      if (dept._count.bookings > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete a department that has bookings" });
      }
      return ctx.prisma.department.delete({ where: { id: input.departmentId } });
    }),

  renameDepartment: orgAdminProcedure
    .input(z.object({ departmentId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const dept = await ctx.prisma.department.findFirst({
        where: { id: input.departmentId, site: { organisationId: ctx.session.organisationId } },
      });
      if (!dept) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });
      }
      return ctx.prisma.department.update({
        where: { id: input.departmentId },
        data: { name: input.name.trim() },
      });
    }),

  /**
   * Toggle a service type on/off for a specific department.
   * If the service type row doesn't exist yet (never synced), creates it first.
   * Used by the department tag UI — blue = active, grey = excluded.
   */
  toggleServiceType: orgAdminProcedure
    .input(
      z.object({
        departmentId:   z.string(),
        serviceTypeId:  z.string().optional(), // existing row
        templateName:   z.string(),            // valet type name (for upsert)
        templateId:     z.string(),            // ValetTypeTemplate id
        isActive:       z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify department belongs to this org
      const dept = await ctx.prisma.department.findFirst({
        where: { id: input.departmentId, site: { organisationId: ctx.session.organisationId } },
      });
      if (!dept) throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });

      if (input.serviceTypeId) {
        // Row already exists — just toggle isActive
        return ctx.prisma.serviceType.update({
          where: { id: input.serviceTypeId },
          data: { isActive: input.isActive },
        });
      }

      // Row doesn\'t exist yet — fetch the template and create it (active or inactive)
      const tmpl = await ctx.prisma.valetTypeTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!tmpl) throw new TRPCError({ code: "NOT_FOUND", message: "Valet type template not found" });

      return ctx.prisma.serviceType.create({
        data: {
          departmentId: dept.id,
          name:         tmpl.name,
          description:  tmpl.description ?? undefined,
          category:     tmpl.category,
          durationMins: tmpl.defaultDurationMins,
          nominalCode:  tmpl.nominalCode ?? undefined,
          isActive:     input.isActive,
        },
      });
    }),
});
