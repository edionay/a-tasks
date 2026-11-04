import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import { schemaTarefa, type CriacaoTarefa } from "@/lib/tarefa-schema";
import { appRouter } from "./tarefas-router";
import { criarArmazenamentoTarefas } from "./tarefas-store";

function criarCaller() {
  return appRouter.createCaller({ tarefas: criarArmazenamentoTarefas() });
}

describe("criação de tarefas pelo router", () => {
  it("retorna tarefa normalizada com UUID e timestamp gerados no servidor", async () => {
    const caller = criarCaller();
    const inicio = Date.now();
    const tarefa = await caller.tarefas.criar({
      titulo: "  Revisar tarefas  ",
      descricao: "Conferir os campos.",
    });
    const fim = Date.now();

    assert.deepEqual(schemaTarefa.parse(tarefa), tarefa);
    assert.equal(tarefa.titulo, "Revisar tarefas");
    assert.equal(tarefa.descricao, "Conferir os campos.");
    assert.ok(Date.parse(tarefa.dataCriacao) >= inicio);
    assert.ok(Date.parse(tarefa.dataCriacao) <= fim);
  });

  it("cria tarefas sem descrição e com identificadores distintos", async () => {
    const caller = criarCaller();
    const primeira = await caller.tarefas.criar({ titulo: "Revisar tarefas" });
    const segunda = await caller.tarefas.criar({ titulo: "Revisar tarefas" });

    assert.notEqual(primeira.id, segunda.id);
    assert.equal(primeira.descricao, undefined);
    assert.equal(segunda.descricao, undefined);
  });

  it("rejeita entradas inválidas com BAD_REQUEST", async () => {
    const caller = criarCaller();

    for (const entrada of [
      {},
      { titulo: "  " },
      { titulo: "a".repeat(121) },
      { titulo: "Revisar tarefas", descricao: "a".repeat(2_001) },
      { titulo: "Revisar tarefas", id: "550e8400-e29b-41d4-a716-446655440000" },
      { titulo: "Revisar tarefas", dataCriacao: "2026-11-04T21:00:00Z" },
    ]) {
      await assert.rejects(
        caller.tarefas.criar(entrada as CriacaoTarefa),
        (erro) => erro instanceof TRPCError && erro.code === "BAD_REQUEST",
      );
    }
  });
});
