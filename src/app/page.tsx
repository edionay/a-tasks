import { ListaTarefas } from "@/components/lista-tarefas";
import { appRouter } from "@/server/tarefas-router";
import { criarContexto } from "@/server/trpc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const apiServidor = appRouter.createCaller(criarContexto());
  const tarefas = await apiServidor.tarefas.listar();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
      <ListaTarefas tarefas={tarefas} />
    </main>
  );
}
