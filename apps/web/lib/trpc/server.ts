import "server-only";
import { cache } from "react";
import {
  appRouter,
  createCallerFactory,
  createContext,
} from "@ivaleter/api";
import { getSession } from "@/lib/auth/session";

/**
 * Server-side tRPC caller for React Server Components.
 * Reads the verified session from the cookie on each request.
 */
export const getServerApi = cache(async () => {
  const session = await getSession();
  const createCaller = createCallerFactory(appRouter);
  return createCaller(createContext(session));
});
