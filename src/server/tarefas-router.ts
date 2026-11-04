import { TRPCError } from "@trpc/server";
import {
  schemaCriacaoTarefa,
  schemaIdentificacaoTarefa,
  schemaTarefa,
} from "@/lib/tarefa-schema";
import { criarRouter, procedimento } from "./trpc";

const routerTarefas = criarRouter({
  criar: procedimento
    .input(schemaCriacaoTarefa)
    .output(schemaTarefa)
    .mutation(({ ctx: contexto, input: entrada }) => contexto.tarefas.criar(entrada)),

  listar: procedimento
    .output(schemaTarefa.array())
    .query(({ ctx: contexto }) => contexto.tarefas.listar()),

  buscarPorId: procedimento
    .input(schemaIdentificacaoTarefa)
    .output(schemaTarefa)
    .query(({ ctx: contexto, input: entrada }) => {
      const tarefa = contexto.tarefas.buscarPorId(entrada.id);

      if (tarefa === undefined) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      return tarefa;
    }),
});

export const appRouter = criarRouter({ tarefas: routerTarefas });
export type AppRouter = typeof appRouter;
