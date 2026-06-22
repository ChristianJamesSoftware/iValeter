import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "@ivaleter/db";
import type { Role } from "@ivaleter/db";
import type { SessionPayload } from "./auth";

export interface Context {
  session: SessionPayload | null;
  prisma: typeof prisma;
}

/**
 * Build a tRPC context from an already-verified session.
 * The web layer is responsible for reading the cookie and verifying the JWT.
 */
export function createContext(session: SessionPayload | null): Context {
  return { session, prisma };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

/** Restrict a procedure to one or more roles. */
export function roleProcedure(...roles: Role[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!roles.includes(ctx.session.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action",
      });
    }
    return next({ ctx });
  });
}

export const superAdminProcedure = roleProcedure("super_admin");
export const orgAdminProcedure = roleProcedure("super_admin", "org_admin");
export const dealershipProcedure = roleProcedure(
  "super_admin",
  "org_admin",
  "dealership_user",
);
export const valeterProcedure = roleProcedure("valeter");
