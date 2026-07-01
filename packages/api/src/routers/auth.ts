import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { verifyPassword, hashPassword, type SessionPayload } from "../auth";

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

      // Stamp last login time — used by inactive user reports
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

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

  /**
   * Request a password reset — generates a token and returns it.
   * In production this token would be emailed; for now it's returned directly
   * so the web layer can redirect to /reset-password?token=XXX
   */
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { randomBytes } = await import("crypto");
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase().trim() },
      });
      // Always return success to avoid user enumeration
      if (!user) return { ok: true };

      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpiresAt: expiry },
      });

      // TODO: send email via Resend/Nodemailer with reset link
      // For now: return token so web layer can redirect immediately (dev/staging only)
      return { ok: true, resetToken: token };
    }),

  /**
   * Consume a password reset token and set a new password.
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findFirst({
        where: {
          passwordResetToken: input.token,
          passwordResetExpiresAt: { gt: new Date() },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This reset link has expired or is invalid.",
        });
      }

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashPassword(input.newPassword),
          passwordResetToken: null,
          passwordResetExpiresAt: null,
          isActive: true, // activate invite-created accounts on first password set
        },
      });

      return { ok: true };
    }),
});
