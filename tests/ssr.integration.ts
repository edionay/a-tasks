import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { it } from "node:test";
import { schemaTarefa } from "../src/lib/tarefa-schema";

let enderecoServidor = "http://127.0.0.1:3000";

if (process.env.TAREFAS_TEST_URL) {
  enderecoServidor = process.env.TAREFAS_TEST_URL;
}

async function enviarMutacao(operacao: string, entrada: unknown) {
  return fetch(`${enderecoServidor}/api/trpc/${operacao}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entrada),
  });
}

async function carregarConteudoPrincipal() {
  const resposta = await fetch(enderecoServidor);
  assert.equal(resposta.status, 200);
  const html = await resposta.text();
  const conteudo = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);
  assert.ok(conteudo, "Expected the page content in the initial HTML.");
  return conteudo[1];
}

it("renders HTTP mutations in the initial page HTML", async (contexto) => {
  const titulo = `SSR task ${randomUUID()}`;
  const descricao = "Visible before browser scripts run.";
  const criacao = await enviarMutacao("tarefas.criar", { titulo, descricao });
  assert.equal(criacao.status, 200);
  const corpoCriacao = await criacao.json();
  const tarefa = schemaTarefa.parse(corpoCriacao.result.data);

  contexto.after(async () => {
    const resposta = await enviarMutacao("tarefas.excluir", { id: tarefa.id });
    assert.ok(resposta.status === 200 || resposta.status === 404);
  });

  const inicial = await carregarConteudoPrincipal();
  assert.match(inicial, new RegExp(`<h2[^>]*>${titulo}</h2>`));
  assert.ok(inicial.includes(descricao));
  assert.ok(inicial.includes(tarefa.dataCriacao));
  assert.ok(inicial.includes("UTC"));

  const novoTitulo = `Updated ${titulo}`;
  const atualizacao = await enviarMutacao("tarefas.atualizar", {
    id: tarefa.id,
    titulo: novoTitulo,
    descricao,
  });
  assert.equal(atualizacao.status, 200);
  const atualizada = await carregarConteudoPrincipal();
  assert.match(atualizada, new RegExp(`<h2[^>]*>${novoTitulo}</h2>`));
  assert.doesNotMatch(atualizada, new RegExp(`<h2[^>]*>${titulo}</h2>`));

  const exclusao = await enviarMutacao("tarefas.excluir", { id: tarefa.id });
  assert.equal(exclusao.status, 200);
  const final = await carregarConteudoPrincipal();
  assert.ok(!final.includes(tarefa.id));
});
