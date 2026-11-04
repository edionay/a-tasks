import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/tarefas-router";
import { criarContexto } from "@/server/trpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function atenderRequisicao(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: criarContexto,
    responseMeta: () => ({ headers: { "cache-control": "no-store" } }),
  });
}

export { atenderRequisicao as GET, atenderRequisicao as POST };
