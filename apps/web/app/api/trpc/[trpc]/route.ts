import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "@ivaleter/api";
import { getSession } from "@/lib/auth/session";

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
    },
  });
};

export { handler as GET, handler as POST };
