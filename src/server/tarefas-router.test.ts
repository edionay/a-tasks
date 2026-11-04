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

describe("leitura de tarefas pelo router", () => {
  it("retorna lista vazia quando nenhuma tarefa foi criada", async () => {
    assert.deepEqual(await criarCaller().tarefas.listar(), []);
  });

  it("lista as tarefas com os dados registrados na criação", async () => {
    const caller = criarCaller();
    const criada = await caller.tarefas.criar({
      titulo: "Revisar documentação",
      descricao: "Conferir os comandos.",
    });

    assert.deepEqual(await caller.tarefas.listar(), [criada]);
    assert.deepEqual(await caller.tarefas.buscarPorId({ id: criada.id }), criada);
  });

  it("lista as tarefas mais recentes primeiro", async (contexto) => {
    contexto.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-04T21:00:00Z") });
    const caller = criarCaller();
    const antiga = await caller.tarefas.criar({ titulo: "Tarefa antiga" });
    contexto.mock.timers.tick(1_000);
    const recente = await caller.tarefas.criar({ titulo: "Tarefa recente" });

    assert.deepEqual(await caller.tarefas.listar(), [recente, antiga]);
  });

  it("ordena por id quando as datas de criação são iguais", async (contexto) => {
    contexto.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-04T21:00:00Z") });
    const caller = criarCaller();
    const tarefas = [];

    for (let indice = 0; indice < 5; indice += 1) {
      tarefas.push(await caller.tarefas.criar({ titulo: `Tarefa ${indice}` }));
    }

    const idsEsperados = tarefas.map((tarefa) => tarefa.id).sort();
    const listagem = await caller.tarefas.listar();

    assert.equal(new Set(tarefas.map((tarefa) => tarefa.dataCriacao)).size, 1);
    assert.deepEqual(listagem.map((tarefa) => tarefa.id), idsEsperados);
  });

  it("retorna NOT_FOUND quando o UUID não pertence a uma tarefa", async () => {
    const caller = criarCaller();

    await assert.rejects(
      caller.tarefas.buscarPorId({ id: "550e8400-e29b-41d4-a716-446655440000" }),
      (erro) => erro instanceof TRPCError && erro.code === "NOT_FOUND",
    );
  });

  it("valida o identificador antes da consulta", async () => {
    const caller = criarCaller();

    await assert.rejects(
      caller.tarefas.buscarPorId({ id: "invalido" }),
      (erro) => erro instanceof TRPCError && erro.code === "BAD_REQUEST",
    );
  });

  it("mantém armazenamentos de teste independentes", async () => {
    const primeiro = criarCaller();
    const segundo = criarCaller();
    const tarefa = await primeiro.tarefas.criar({ titulo: "Tarefa isolada" });

    assert.deepEqual(await primeiro.tarefas.listar(), [tarefa]);
    assert.deepEqual(await segundo.tarefas.listar(), []);
  });

  it("preserva os dados armazenados quando um resultado é alterado", async () => {
    const armazenamento = criarArmazenamentoTarefas();
    const criada = armazenamento.criar({ titulo: "Título original" });
    criada.titulo = "Alteração no resultado da criação";
    const listagem = armazenamento.listar();
    listagem[0].titulo = "Alteração na lista";
    const consultada = armazenamento.buscarPorId(criada.id);
    assert.ok(consultada);
    consultada.titulo = "Alteração no resultado da consulta";

    assert.equal(armazenamento.buscarPorId(criada.id)?.titulo, "Título original");
  });
});
