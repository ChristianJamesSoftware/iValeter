import { z } from "zod";
import { router, orgAdminProcedure, dealershipProcedure } from "../trpc";

/**
 * Org-level vehicle size configuration.
 *
 * LARGE is the baseline — it stores basePricePence and baseAllocMins.
 * All other sizes store deltaPricePence and deltaMins relative to LARGE.
 *
 * Defaults (applied when no config exists for a size):
 *   SMALL:  deltaMins = -10, deltaPricePence = -1000  (i.e. -£10, -10 mins from LARGE)
 *   MEDIUM: deltaMins =  -5, deltaPricePence =  -500  (i.e. -£5,  -5 mins from LARGE)
 *   LARGE:  deltaMins =   0, deltaPricePence =     0  (baseline)
 *   XL:     deltaMins =  +5, deltaPricePence =   +500 (i.e. +£5, +5 mins from LARGE)
 *   VAN:    deltaMins = +10, deltaPricePence =  +1000 (i.e. +£10, +10 mins from LARGE)
 *
 * Per the user spec:
 *   - LARGE is base
 *   - MEDIUM = LARGE -5 mins, -£5
 *   - SMALL  = MEDIUM -5 mins, -£5 → so LARGE -10 mins, -£10
 *   - XL     = LARGE +5 mins, +£5
 *   - VAN    = LARGE +5 mins, +£5
 */

export const DEFAULT_SIZE_CONFIGS: Record<
  "SMALL" | "MEDIUM" | "LARGE" | "XL" | "VAN",
  { deltaMins: number; deltaPricePence: number; label: string }
> = {
  SMALL:  { deltaMins: -10, deltaPricePence: -1000, label: "Small" },
  MEDIUM: { deltaMins:  -5, deltaPricePence:  -500, label: "Medium" },
  LARGE:  { deltaMins:   0, deltaPricePence:     0, label: "Large" },
  XL:     { deltaMins:   5, deltaPricePence:   500, label: "XL" },
  VAN:    { deltaMins:   5, deltaPricePence:   500, label: "Van" },
};

const SIZE_ORDER: Array<"SMALL" | "MEDIUM" | "LARGE" | "XL" | "VAN"> = [
  "SMALL", "MEDIUM", "LARGE", "XL", "VAN",
];

export const vehicleSizeConfigRouter = router({
  /**
   * Get all 5 size configs for the session's org.
   * Returns defaults for any sizes not yet configured.
   */
  getAll: dealershipProcedure.query(async ({ ctx }) => {
    const existing = await ctx.prisma.orgVehicleSizeConfig.findMany({
      where: { organisationId: ctx.session.organisationId },
      orderBy: { size: "asc" },
    });

    const bySize = Object.fromEntries(existing.map((r) => [r.size, r]));

    // Find the LARGE config to get the base values
    const largeConfig = bySize["LARGE"];
    const basePricePence = largeConfig?.basePricePence ?? null;
    const baseAllocMins  = largeConfig?.baseAllocMins  ?? null;

    return SIZE_ORDER.map((size) => {
      const cfg = bySize[size];
      const defaults = DEFAULT_SIZE_CONFIGS[size];
      return {
        size,
        label:           cfg?.label           ?? defaults.label,
        isActive:        cfg?.isActive        ?? true,
        basePricePence:  size === "LARGE" ? basePricePence : null,
        baseAllocMins:   size === "LARGE" ? baseAllocMins  : null,
        deltaPricePence: cfg?.deltaPricePence ?? defaults.deltaPricePence,
        deltaMins:       cfg?.deltaMins       ?? defaults.deltaMins,
        // Computed effective values (for display)
        effectivePricePence: basePricePence != null
          ? (size === "LARGE" ? basePricePence : basePricePence + (cfg?.deltaPricePence ?? defaults.deltaPricePence))
          : null,
        effectiveDurationMins: baseAllocMins != null
          ? (size === "LARGE" ? baseAllocMins : baseAllocMins + (cfg?.deltaMins ?? defaults.deltaMins))
          : null,
        id: cfg?.id ?? null,
      };
    });
  }),

  /**
   * Upsert config for a single size. Org admin only.
   */
  upsertSize: orgAdminProcedure
    .input(
      z.object({
        size: z.enum(["SMALL", "MEDIUM", "LARGE", "XL", "VAN"]),
        basePricePence:  z.number().int().min(0).nullable().optional(), // LARGE only
        baseAllocMins:   z.number().int().min(1).nullable().optional(), // LARGE only
        deltaPricePence: z.number().int().min(-99999).max(99999),
        deltaMins:       z.number().int().min(-999).max(999),
        label:           z.string().min(1).max(50).optional(),
        isActive:        z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { size, ...data } = input;
      return ctx.prisma.orgVehicleSizeConfig.upsert({
        where: {
          organisationId_size: {
            organisationId: ctx.session.organisationId,
            size,
          },
        },
        create: {
          organisationId: ctx.session.organisationId,
          size,
          ...data,
        },
        update: data,
      });
    }),

  /**
   * Bulk save all 5 sizes at once. Org admin only.
   */
  saveAll: orgAdminProcedure
    .input(
      z.array(
        z.object({
          size: z.enum(["SMALL", "MEDIUM", "LARGE", "XL", "VAN"]),
          basePricePence:  z.number().int().min(0).nullable().optional(),
          baseAllocMins:   z.number().int().min(1).nullable().optional(),
          deltaPricePence: z.number().int().min(-99999).max(99999),
          deltaMins:       z.number().int().min(-999).max(999),
          label:           z.string().min(1).max(50).optional(),
          isActive:        z.boolean().default(true),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(
        input.map(({ size, ...data }) =>
          ctx.prisma.orgVehicleSizeConfig.upsert({
            where: {
              organisationId_size: {
                organisationId: ctx.session.organisationId,
                size,
              },
            },
            create: { organisationId: ctx.session.organisationId, size, ...data },
            update: data,
          }),
        ),
      );
    }),
});

/**
 * Helper: resolve the effective price (pence) and duration (mins) for a booking.
 * Pass in the org's size configs (from vehicleSizeConfigRouter.getAll),
 * the service type's default durationMins and chargeRate,
 * and the booking's vehicleSize (defaults to LARGE if null).
 */
export function resolveVehicleSizeValues(
  configs: Array<{
    size: string;
    basePricePence: number | null;
    baseAllocMins: number | null;
    deltaPricePence: number;
    deltaMins: number;
    isActive: boolean;
  }>,
  serviceTypeDurationMins: number,
  serviceTypeChargeRate: number | null | undefined,
  vehicleSize: "SMALL" | "MEDIUM" | "LARGE" | "XL" | "VAN" | null | undefined,
): { resolvedDurationMins: number; resolvedPricePence: number | null } {
  const effectiveSize = vehicleSize ?? "LARGE";

  const largeConfig = configs.find((c) => c.size === "LARGE");
  const sizeConfig  = configs.find((c) => c.size === effectiveSize);

  const defaults = DEFAULT_SIZE_CONFIGS[effectiveSize as keyof typeof DEFAULT_SIZE_CONFIGS];
  const deltaMins = sizeConfig?.deltaMins ?? defaults.deltaMins;
  const deltaPricePence = sizeConfig?.deltaPricePence ?? defaults.deltaPricePence;

  // Duration: use baseAllocMins from LARGE config if set, else service type default
  const baseDurationMins =
    (largeConfig?.baseAllocMins ?? serviceTypeDurationMins);
  const resolvedDurationMins = Math.max(1, baseDurationMins + deltaMins);

  // Price: only resolve if LARGE has a basePricePence set
  const basePricePence = largeConfig?.basePricePence ?? null;
  const resolvedPricePence =
    basePricePence != null
      ? Math.max(0, basePricePence + deltaPricePence)
      : serviceTypeChargeRate != null
        ? Math.max(0, Math.round(serviceTypeChargeRate * 100) + deltaPricePence)
        : null;

  return { resolvedDurationMins, resolvedPricePence };
}
