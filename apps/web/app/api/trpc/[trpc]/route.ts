import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "@ivaleter/api";
import { getSession } from "@/lib/auth/session";
import * as Sentry from "@sentry/nextjs";

const handler = async (req: Request) => {
  const session = await getSession();
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(session),
    onError({ error, path }) {
      if (process.env.NODE_ENV === "development") {
        console.error(`tRPC error on ${path ?? "<no-path>"}:`, error.message);
      }
      // Report unexpected server errors to Sentry (not client validation/auth errors)
      if (error.code === "INTERNAL_SERVER_ERROR") {
        Sentry.captureException(error, {
          tags: { trpc_path: path ?? "unknown" },
        });
      }
    },
  });
};

export { handler as GET, handler as POST };

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
