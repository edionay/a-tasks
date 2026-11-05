import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/tasks-router";
import { createContext } from "@/server/trpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleRequest(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createContext,
    responseMeta: () => ({ headers: { "cache-control": "no-store" } }),
  });
}

export { handleRequest as GET, handleRequest as POST };
