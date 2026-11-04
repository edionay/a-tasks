import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { schemaTarefa } from "@/lib/tarefa-schema";
import { appRouter } from "@/server/tarefas-router";
import { criarArmazenamentoTarefas } from "@/server/tarefas-store";
import { GET, POST } from "./route";

function criarRequisicao(entrada: unknown) {
  return new Request("http://localhost/api/trpc/tarefas.criar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entrada),
  });
}

describe("endpoint HTTP de criação", () => {
  it("cria uma tarefa por POST e retorna o contrato sem cache", async () => {
    const resposta = await POST(criarRequisicao({ titulo: "  Revisar contrato  " }));
    const corpo = await resposta.json();
    const tarefa = schemaTarefa.parse(corpo.result.data);

    assert.equal(resposta.status, 200);
    assert.equal(resposta.headers.get("cache-control"), "no-store");
    assert.equal(tarefa.titulo, "Revisar contrato");
  });

  it("retorna mensagem e erro de campo em português sem stack trace", async () => {
    const resposta = await POST(criarRequisicao({ titulo: "  " }));
    const corpo = await resposta.json();

    assert.equal(resposta.status, 400);
    assert.equal(corpo.error.data.code, "BAD_REQUEST");
    assert.equal(corpo.error.message, "Informe um título.");
    assert.deepEqual(corpo.error.data.errosCampos.titulo, ["Informe um título."]);
    assert.equal("stack" in corpo.error.data, false);
  });

  it("rejeita JSON malformado com mensagem compreensível", async () => {
    const resposta = await POST(
      new Request("http://localhost/api/trpc/tarefas.criar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    const corpo = await resposta.json();

    assert.equal(resposta.status, 400);
    assert.equal(corpo.error.message, "Requisição inválida.");
    assert.equal("stack" in corpo.error.data, false);
  });

  it("não permite criar tarefa por GET", async () => {
    const resposta = await GET(new Request("http://localhost/api/trpc/tarefas.criar"));

    assert.equal(resposta.status, 405);
  });

  it("oculta detalhes internos quando o armazenamento falha", async () => {
    const resposta = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: criarRequisicao({ titulo: "Revisar contrato" }),
      router: appRouter,
      createContext: () => ({
        tarefas: {
          ...criarArmazenamentoTarefas(),
          criar() {
            throw new Error("Detalhe interno do armazenamento.");
          },
        },
      }),
    });
    const texto = await resposta.text();
    const corpo = JSON.parse(texto);

    assert.equal(resposta.status, 500);
    assert.equal(corpo.error.message, "Não foi possível processar a solicitação.");
    assert.equal(texto.includes("Detalhe interno"), false);
    assert.equal("stack" in corpo.error.data, false);
  });
});

describe("endpoints HTTP de leitura", () => {
  it("lista e consulta tarefas criadas por outra requisição", async () => {
    const criacao = await POST(criarRequisicao({ titulo: "Conferir leitura" }));
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

  it("retorna HTTP 404 para UUID não cadastrado", async () => {
    const parametros = new URLSearchParams({
      input: JSON.stringify({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const resposta = await GET(
      new Request(`http://localhost/api/trpc/tarefas.buscarPorId?${parametros}`),
    );
    const corpo = await resposta.json();

    assert.equal(resposta.status, 404);
    assert.equal(corpo.error.data.code, "NOT_FOUND");
    assert.equal(corpo.error.message, "Tarefa não encontrada.");
    assert.equal("stack" in corpo.error.data, false);
  });

  it("retorna HTTP 400 para identificador inválido", async () => {
    const parametros = new URLSearchParams({ input: JSON.stringify({ id: "invalido" }) });
    const resposta = await GET(
      new Request(`http://localhost/api/trpc/tarefas.buscarPorId?${parametros}`),
    );
    const corpo = await resposta.json();

    assert.equal(resposta.status, 400);
    assert.equal(corpo.error.data.code, "BAD_REQUEST");
    assert.equal(corpo.error.message, "Informe um identificador de tarefa válido.");
    assert.equal("stack" in corpo.error.data, false);
  });
});
