import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { schemaTarefa } from "@/lib/tarefa-schema";
import { appRouter } from "@/server/tarefas-router";
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
