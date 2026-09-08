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
        // Accept email OR pay reference (payId) in the same field
        email: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<SessionPayload> => {
      const identifier = input.email.toLowerCase().trim();

      // Try email first, then fall back to payId (pay reference)
      const user =
        (await ctx.prisma.user.findUnique({ where: { email: identifier } })) ??
        (await ctx.prisma.user.findFirst({ where: { payId: identifier } }));

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
   * Request a password reset — generates a token and emails a secure link.
   */
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { randomBytes } = await import("crypto");
      const nodemailer = await import("nodemailer");

      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase().trim() },
        select: { id: true, email: true, firstName: true },
      });
      // Always return success to avoid user enumeration
      if (!user) return { ok: true };

      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpiresAt: expiry },
      });

      // Send reset email via SMTP
      const smtpUser = process.env.SMTP_USER ?? "";
      const smtpPass = process.env.SMTP_PASS ?? "";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ivaleter.co.uk";
      const resetLink = `${appUrl}/reset-password?token=${token}`;

      if (smtpUser && smtpPass) {
        try {
          const transporter = nodemailer.default.createTransport({
            host: process.env.SMTP_HOST ?? "smtp.office365.com",
            port: parseInt(process.env.SMTP_PORT ?? "587", 10),
            secure: false,
            auth: { type: "login", user: smtpUser, pass: smtpPass },
            tls: { rejectUnauthorized: false },
          });

          await transporter.sendMail({
            from: `"iValeter" <${smtpUser}>`,
            to: user.email,
            subject: "Reset your iValeter password",
            text: [
              `Hi ${user.firstName},`,
              "",
              "We received a request to reset your iValeter password.",
              "",
              "Click the link below to set a new password:",
              resetLink,
              "",
              "This link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
              "",
              "iValeter Team",
            ].join("\n"),
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 560px; color: #1C1A16;">
                <div style="background: #E8650A; padding: 20px 24px; border-radius: 8px 8px 0 0;">
                  <h2 style="margin: 0; color: white; font-size: 20px;">Reset your password</h2>
                </div>
                <div style="background: #F5F0E8; padding: 28px 24px; border-radius: 0 0 8px 8px; border: 1px solid #D4D1CA; border-top: none;">
                  <p style="margin: 0 0 16px; font-size: 15px;">Hi ${user.firstName},</p>
                  <p style="margin: 0 0 16px; font-size: 15px;">We received a request to reset your <strong>iValeter</strong> password.</p>
                  <p style="margin: 0 0 24px; font-size: 15px;">Click the button below to set a new password:</p>
                  <a href="${resetLink}" style="display: inline-block; background: #E8650A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">Reset my password &rarr;</a>
                  <p style="margin: 24px 0 8px; font-size: 12px; color: #7A7974;">This link expires in 1 hour.</p>
                  <p style="margin: 0; font-size: 12px; color: #7A7974;">If you didn't request a password reset, you can safely ignore this email.</p>
                </div>
              </div>
            `,
          });
        } catch (err) {
          // Log but don't expose — user still sees success message
          console.error("[forgotPassword] Failed to send reset email:", err);
        }
      }

      return { ok: true };
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
