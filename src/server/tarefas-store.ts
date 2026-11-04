import { randomUUID } from "node:crypto";
import type { CriacaoTarefa, Tarefa } from "@/lib/tarefa-schema";

export function criarArmazenamentoTarefas() {
  const tarefas = new Map<string, Tarefa>();

  return {
    criar(entrada: CriacaoTarefa): Tarefa {
      const tarefa: Tarefa = {
        ...entrada,
        id: randomUUID(),
        dataCriacao: new Date().toISOString(),
      };

      tarefas.set(tarefa.id, tarefa);
      return { ...tarefa };
    },
  };
}

export type ArmazenamentoTarefas = ReturnType<typeof criarArmazenamentoTarefas>;

const estadoGlobal = globalThis as typeof globalThis & {
  armazenamentoTarefas?: ArmazenamentoTarefas;
};

if (
  estadoGlobal.armazenamentoTarefas === undefined ||
  estadoGlobal.armazenamentoTarefas === null
) {
  estadoGlobal.armazenamentoTarefas = criarArmazenamentoTarefas();
}

export const armazenamentoTarefas = estadoGlobal.armazenamentoTarefas;
