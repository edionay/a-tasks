import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { schemaTarefa } from "@/lib/tarefa-schema";
import { appRouter } from "@/server/tarefas-router";
import { criarArmazenamentoTarefas } from "@/server/tarefas-store";
import { GET, POST } from "./route";

function criarRequisicao(entrada: unknown, operacao = "tarefas.criar") {
  return new Request(`http://localhost/api/trpc/${operacao}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entrada),
  });
}

describe("task creation over HTTP", () => {
  it("creates a task through POST and disables response caching", async () => {
    const resposta = await POST(criarRequisicao({ titulo: "  Review the contract  " }));
    const corpo = await resposta.json();
    const tarefa = schemaTarefa.parse(corpo.result.data);

    assert.equal(resposta.status, 200);
    assert.equal(resposta.headers.get("cache-control"), "no-store");
    assert.equal(tarefa.titulo, "Review the contract");
  });

  it("returns an English message and field error without a stack trace", async () => {
    const resposta = await POST(criarRequisicao({ titulo: "  " }));
    const corpo = await resposta.json();

    assert.equal(resposta.status, 400);
    assert.equal(corpo.error.data.code, "BAD_REQUEST");
    assert.equal(corpo.error.message, "Enter a title.");
    assert.deepEqual(corpo.error.data.errosCampos.titulo, ["Enter a title."]);
    assert.equal("stack" in corpo.error.data, false);
  });

  it("rejects malformed JSON with a readable message", async () => {
    const resposta = await POST(
      new Request("http://localhost/api/trpc/tarefas.criar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    const corpo = await resposta.json();

    assert.equal(resposta.status, 400);
    assert.equal(corpo.error.message, "Invalid request.");
    assert.equal("stack" in corpo.error.data, false);
  });

  it("does not allow task creation through GET", async () => {
    const resposta = await GET(new Request("http://localhost/api/trpc/tarefas.criar"));

    assert.equal(resposta.status, 405);
  });

  it("hides internal details when the store fails", async () => {
    const resposta = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: criarRequisicao({ titulo: "Review the contract" }),
      router: appRouter,
      createContext: () => ({
        tarefas: {
          ...criarArmazenamentoTarefas(),
          criar() {
            throw new Error("Internal store details.");
          },
        },
      }),
    });
    const texto = await resposta.text();
    const corpo = JSON.parse(texto);

    assert.equal(resposta.status, 500);
    assert.equal(corpo.error.message, "Unable to process the request.");
    assert.equal(texto.includes("Internal store"), false);
    assert.equal("stack" in corpo.error.data, false);
  });
});

describe("task reads over HTTP", () => {
  it("lists and retrieves tasks created by another request", async () => {
    const criacao = await POST(criarRequisicao({ titulo: "Check task reads" }));
    const corpoCriacao = await criacao.json();
    const tarefa = schemaTarefa.parse(corpoCriacao.result.data);

    const listagem = await GET(new Request("http://localhost/api/trpc/tarefas.listar"));
    const corpoListagem = await listagem.json();
    const tarefas = schemaTarefa.array().parse(corpoListagem.result.data);

    assert.equal(listagem.status, 200);
    assert.equal(listagem.headers.get("cache-control"), "no-store");
    assert.deepEqual(tarefas.find((item) => item.id === tarefa.id), tarefa);

    const parametros = new URLSearchParams({ input: JSON.stringify({ id: tarefa.id }) });
    const consulta = await GET(
      new Request(`http://localhost/api/trpc/tarefas.buscarPorId?${parametros}`),
    );
    const corpoConsulta = await consulta.json();

    assert.equal(consulta.status, 200);
    assert.deepEqual(corpoConsulta.result.data, tarefa);
  });

  it("returns HTTP 404 for a UUID with no task", async () => {
    const parametros = new URLSearchParams({
      input: JSON.stringify({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const resposta = await GET(
      new Request(`http://localhost/api/trpc/tarefas.buscarPorId?${parametros}`),
    );
    const corpo = await resposta.json();

    assert.equal(resposta.status, 404);
    assert.equal(corpo.error.data.code, "NOT_FOUND");
    assert.equal(corpo.error.message, "Task not found.");
    assert.equal("stack" in corpo.error.data, false);
  });

  it("returns HTTP 400 for an invalid ID", async () => {
    const parametros = new URLSearchParams({ input: JSON.stringify({ id: "invalid" }) });
    const resposta = await GET(
      new Request(`http://localhost/api/trpc/tarefas.buscarPorId?${parametros}`),
    );
    const corpo = await resposta.json();

    assert.equal(resposta.status, 400);
    assert.equal(corpo.error.data.code, "BAD_REQUEST");
    assert.equal(corpo.error.message, "Enter a valid task ID.");
    assert.equal("stack" in corpo.error.data, false);
  });
});

describe("task updates over HTTP", () => {
  it("updates an existing task and persists the result across requests", async () => {
    const criacao = await POST(criarRequisicao({ titulo: "Original title" }));
    const corpoCriacao = await criacao.json();
    const original = schemaTarefa.parse(corpoCriacao.result.data);

    const resposta = await POST(criarRequisicao({
      id: original.id,
      titulo: "  Updated title  ",
      descricao: "Updated description",
    }, "tarefas.atualizar"));
    const corpo = await resposta.json();
    const atualizada = schemaTarefa.parse(corpo.result.data);

    assert.equal(resposta.status, 200);
    assert.deepEqual(atualizada, {
      ...original,
      titulo: "Updated title",
      descricao: "Updated description",
    });

    const parametros = new URLSearchParams({ input: JSON.stringify({ id: original.id }) });
    const consulta = await GET(
      new Request(`http://localhost/api/trpc/tarefas.buscarPorId?${parametros}`),
    );
    const corpoConsulta = await consulta.json();
    assert.deepEqual(corpoConsulta.result.data, atualizada);
  });

  it("returns HTTP 404 when updating a missing task", async () => {
    const resposta = await POST(criarRequisicao({
      id: "550e8400-e29b-41d4-a716-446655440000",
      titulo: "Updated title",
    }, "tarefas.atualizar"));
    const corpo = await resposta.json();

    assert.equal(resposta.status, 404);
    assert.equal(corpo.error.message, "Task not found.");
    assert.equal(corpo.error.data.code, "NOT_FOUND");
    assert.equal("stack" in corpo.error.data, false);
  });

  it("returns HTTP 400 with a field error for invalid update input", async () => {
    const resposta = await POST(criarRequisicao({
      id: "550e8400-e29b-41d4-a716-446655440000",
      titulo: "  ",
    }, "tarefas.atualizar"));
    const corpo = await resposta.json();

    assert.equal(resposta.status, 400);
    assert.equal(corpo.error.data.code, "BAD_REQUEST");
    assert.deepEqual(corpo.error.data.errosCampos.titulo, ["Enter a title."]);
    assert.equal("stack" in corpo.error.data, false);
  });

  it("does not allow task updates through GET", async () => {
    const resposta = await GET(new Request("http://localhost/api/trpc/tarefas.atualizar"));

    assert.equal(resposta.status, 405);
  });
});
