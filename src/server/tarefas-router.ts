import { schemaCriacaoTarefa, schemaTarefa } from "@/lib/tarefa-schema";
import { criarRouter, procedimento } from "./trpc";

const routerTarefas = criarRouter({
  criar: procedimento
    .input(schemaCriacaoTarefa)
    .output(schemaTarefa)
    .mutation(({ ctx, input }) => ctx.tarefas.criar(input)),
});

export const appRouter = criarRouter({ tarefas: routerTarefas });
export type AppRouter = typeof appRouter;
