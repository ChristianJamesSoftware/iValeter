import { z } from "zod";
import { router, superAdminProcedure } from "../trpc";

interface ConfigEntry {
  key: string;
  value: string;
  isSecret: boolean;
  isSet: boolean;
}

export const platformRouter = router({
  /** All platform config. Secret values are masked — only `isSet` is exposed. */
  get: superAdminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.platformConfig.findMany({
      orderBy: { key: "asc" },
    });
    const entries: ConfigEntry[] = rows.map((r) => ({
      key: r.key,
      value: r.isSecret ? "" : r.value,
      isSecret: r.isSecret,
      isSet: r.value.length > 0,
    }));
    return entries;
  }),

  /**
   * Update one or more config values. For secret keys an empty string means
   * "leave unchanged" so the masked UI never wipes a stored credential.
   */
  update: superAdminProcedure
    .input(
      z.object({
        values: z.array(
          z.object({ key: z.string().min(1), value: z.string() }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      for (const { key, value } of input.values) {
        const existing = await ctx.prisma.platformConfig.findUnique({
          where: { key },
        });
        if (existing?.isSecret && value === "") continue;
        await ctx.prisma.platformConfig.upsert({
          where: { key },
          update: { value, updatedBy: ctx.session.email },
          create: { key, value, updatedBy: ctx.session.email },
        });
      }
      return { ok: true };
    }),
});
