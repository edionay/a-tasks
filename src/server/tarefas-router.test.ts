import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import { schemaTarefa, type AtualizacaoTarefa, type CriacaoTarefa } from "@/lib/tarefa-schema";
import { appRouter } from "./tarefas-router";
import { criarArmazenamentoTarefas } from "./tarefas-store";

function criarCaller() {
  return appRouter.createCaller({ tarefas: criarArmazenamentoTarefas() });
}

describe("task creation through the router", () => {
  it("returns a normalized task with a server-generated UUID and timestamp", async () => {
    const caller = criarCaller();
    const inicio = Date.now();
    const tarefa = await caller.tarefas.criar({
      titulo: "  Review tasks  ",
      descricao: "Check the fields.",
    });
    const fim = Date.now();

    assert.deepEqual(schemaTarefa.parse(tarefa), tarefa);
    assert.equal(tarefa.titulo, "Review tasks");
    assert.equal(tarefa.descricao, "Check the fields.");
    assert.ok(Date.parse(tarefa.dataCriacao) >= inicio);
    assert.ok(Date.parse(tarefa.dataCriacao) <= fim);
  });

  it("creates tasks with distinct IDs and no description", async () => {
    const caller = criarCaller();
    const primeira = await caller.tarefas.criar({ titulo: "Review tasks" });
    const segunda = await caller.tarefas.criar({ titulo: "Review tasks" });

    assert.notEqual(primeira.id, segunda.id);
    assert.equal(primeira.descricao, undefined);
    assert.equal(segunda.descricao, undefined);
  });

  it("rejects invalid input with BAD_REQUEST", async () => {
    const caller = criarCaller();

    for (const entrada of [
      {},
      { titulo: "  " },
      { titulo: "a".repeat(121) },
      { titulo: "Review tasks", descricao: "a".repeat(2_001) },
      { titulo: "Review tasks", id: "550e8400-e29b-41d4-a716-446655440000" },
      { titulo: "Review tasks", dataCriacao: "2026-11-04T21:00:00Z" },
    ]) {
      await assert.rejects(
        caller.tarefas.criar(entrada as CriacaoTarefa),
        (erro) => erro instanceof TRPCError && erro.code === "BAD_REQUEST",
      );
    }
  });
});

describe("task reads through the router", () => {
  it("returns an empty list when no tasks exist", async () => {
    assert.deepEqual(await criarCaller().tarefas.listar(), []);
  });

  it("lists tasks with the data recorded at creation", async () => {
    const caller = criarCaller();
    const criada = await caller.tarefas.criar({
      titulo: "Review documentation",
      descricao: "Check the commands.",
    });

    assert.deepEqual(await caller.tarefas.listar(), [criada]);
    assert.deepEqual(await caller.tarefas.buscarPorId({ id: criada.id }), criada);
  });

  it("lists the most recent tasks first", async (contexto) => {
    contexto.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-04T21:00:00Z") });
    const caller = criarCaller();
    const antiga = await caller.tarefas.criar({ titulo: "Older task" });
    contexto.mock.timers.tick(1_000);
    const recente = await caller.tarefas.criar({ titulo: "Newer task" });

    assert.deepEqual(await caller.tarefas.listar(), [recente, antiga]);
  });

  it("sorts by ID when creation dates match", async (contexto) => {
    contexto.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-04T21:00:00Z") });
    const caller = criarCaller();
    const tarefas = [];

    for (let indice = 0; indice < 5; indice += 1) {
      tarefas.push(await caller.tarefas.criar({ titulo: `Task ${indice}` }));
    }

    const idsEsperados = tarefas.map((tarefa) => tarefa.id).sort();
    const listagem = await caller.tarefas.listar();

    assert.equal(new Set(tarefas.map((tarefa) => tarefa.dataCriacao)).size, 1);
    assert.deepEqual(listagem.map((tarefa) => tarefa.id), idsEsperados);
  });

  it("returns NOT_FOUND when no task has the supplied UUID", async () => {
    const caller = criarCaller();

    await assert.rejects(
      caller.tarefas.buscarPorId({ id: "550e8400-e29b-41d4-a716-446655440000" }),
      (erro) => erro instanceof TRPCError && erro.code === "NOT_FOUND",
    );
  });

  it("validates the ID before looking up a task", async () => {
    const caller = criarCaller();

    await assert.rejects(
      caller.tarefas.buscarPorId({ id: "invalid" }),
      (erro) => erro instanceof TRPCError && erro.code === "BAD_REQUEST",
    );
  });

  it("keeps test stores independent", async () => {
    const primeiro = criarCaller();
    const segundo = criarCaller();
    const tarefa = await primeiro.tarefas.criar({ titulo: "Isolated task" });

    assert.deepEqual(await primeiro.tarefas.listar(), [tarefa]);
    assert.deepEqual(await segundo.tarefas.listar(), []);
  });

  it("preserves stored data when a returned object is changed", async () => {
    const armazenamento = criarArmazenamentoTarefas();
    const criada = armazenamento.criar({ titulo: "Original title" });
    criada.titulo = "Changed creation result";
    const listagem = armazenamento.listar();
    listagem[0].titulo = "Changed list item";
    const consultada = armazenamento.buscarPorId(criada.id);
    assert.ok(consultada);
    consultada.titulo = "Changed lookup result";

    assert.equal(armazenamento.buscarPorId(criada.id)?.titulo, "Original title");
  });
});

describe("task updates through the router", () => {
  it("updates editable fields while preserving identity, creation date and list order", async (contexto) => {
    contexto.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-04T21:00:00Z") });
    const caller = criarCaller();
    const original = await caller.tarefas.criar({
      titulo: "Original title",
      descricao: "Original description",
    });
    contexto.mock.timers.tick(1_000);
    const outra = await caller.tarefas.criar({ titulo: "Another task" });
    contexto.mock.timers.tick(1_000);

    const atualizada = await caller.tarefas.atualizar({
      id: original.id,
      titulo: "  Updated title  ",
      descricao: "Updated description",
    });

    assert.deepEqual(atualizada, {
      ...original,
      titulo: "Updated title",
      descricao: "Updated description",
    });
    assert.deepEqual(await caller.tarefas.buscarPorId({ id: original.id }), atualizada);
    assert.deepEqual(await caller.tarefas.listar(), [outra, atualizada]);
  });

  it("clears the previous description when it is omitted", async () => {
    const caller = criarCaller();
    const original = await caller.tarefas.criar({
      titulo: "Original title",
      descricao: "Original description",
    });

    const atualizada = await caller.tarefas.atualizar({
      id: original.id,
      titulo: "Updated title",
    });
    const consultada = await caller.tarefas.buscarPorId({ id: original.id });

    assert.equal(atualizada.descricao, undefined);
    assert.equal(consultada.descricao, undefined);
  });

  it("accepts an empty description", async () => {
    const caller = criarCaller();
    const original = await caller.tarefas.criar({ titulo: "Original title" });
    const atualizada = await caller.tarefas.atualizar({
      id: original.id,
      titulo: "Updated title",
      descricao: "",
    });

    assert.equal(atualizada.descricao, "");
  });

  it("leaves stored data unchanged when validation fails", async () => {
    const caller = criarCaller();
    const original = await caller.tarefas.criar({
      titulo: "Original title",
      descricao: "Original description",
    });

    for (const entrada of [
      { id: original.id, titulo: "  " },
      { id: original.id, titulo: "a".repeat(121) },
      { id: original.id, titulo: "Updated title", descricao: "a".repeat(2_001) },
      { id: original.id, titulo: "Updated title", dataCriacao: "2026-11-04T22:00:00Z" },
    ]) {
      await assert.rejects(
        caller.tarefas.atualizar(entrada as AtualizacaoTarefa),
        (erro) => erro instanceof TRPCError && erro.code === "BAD_REQUEST",
      );
    }

    assert.deepEqual(await caller.tarefas.buscarPorId({ id: original.id }), original);
  });

  it("returns NOT_FOUND without inserting a task when it does not exist", async () => {
    const caller = criarCaller();

    await assert.rejects(
      caller.tarefas.atualizar({
        id: "550e8400-e29b-41d4-a716-446655440000",
        titulo: "Updated title",
      }),
      (erro) => erro instanceof TRPCError && erro.code === "NOT_FOUND",
    );
    assert.deepEqual(await caller.tarefas.listar(), []);
  });

  it("returns a copy of the updated task", () => {
    const armazenamento = criarArmazenamentoTarefas();
    const original = armazenamento.criar({ titulo: "Original title" });
    const atualizada = armazenamento.atualizar({ id: original.id, titulo: "Updated title" });
    assert.ok(atualizada);
    atualizada.titulo = "Changed return value";

    assert.equal(armazenamento.buscarPorId(original.id)?.titulo, "Updated title");
  });
});
