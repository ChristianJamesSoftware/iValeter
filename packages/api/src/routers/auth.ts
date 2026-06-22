import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { verifyPassword, type SessionPayload } from "../auth";

export const authRouter = router({
  /**
   * Validate credentials and return the session payload.
   * The web layer signs the JWT and sets the httpOnly cookie.
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<SessionPayload> => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase().trim() },
      });

      if (!user || !user.isActive) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      if (!verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      return {
        userId: user.id,
        organisationId: user.organisationId,
        siteId: user.siteId,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    }),

  /** Return the current user's full profile. */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findFirst({
      where: {
        id: ctx.session.userId,
        organisationId: ctx.session.organisationId,
      },
      include: { site: true, organisation: true },
    });
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      siteId: user.siteId,
      siteName: user.site?.name ?? null,
      organisationId: user.organisationId,
      organisationName: user.organisation.name,
    };
  }),

  /** Confirms the current session is valid. */
  session: protectedProcedure.query(({ ctx }) => ctx.session),
});
