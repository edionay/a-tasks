import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  schemaAtualizacaoTarefa,
  schemaCriacaoTarefa,
  schemaIdentificacaoTarefa,
  schemaTarefa,
} from "./tarefa-schema";

const id = "550e8400-e29b-41d4-a716-446655440000";
const dataCriacao = "2026-11-04T21:00:00.000Z";

describe("criação de tarefa", () => {
  it("remove espaços das extremidades do título e preserva seu conteúdo", () => {
    const tarefa = schemaCriacaoTarefa.parse({
      titulo: "  Revisar  documentação  ",
      descricao: "Conferir os comandos de execução.\nPreservar as quebras de linha.",
    });

    assert.deepEqual(tarefa, {
      titulo: "Revisar  documentação",
      descricao: "Conferir os comandos de execução.\nPreservar as quebras de linha.",
    });
  });

  it("aceita descrição ausente ou vazia", () => {
    assert.deepEqual(schemaCriacaoTarefa.parse({ titulo: "Revisar tarefas" }), {
      titulo: "Revisar tarefas",
    });
    assert.deepEqual(
      schemaCriacaoTarefa.parse({ titulo: "Revisar tarefas", descricao: "" }),
      { titulo: "Revisar tarefas", descricao: "" },
    );
  });

  for (const titulo of [undefined, "", " \t\n ", null, 123]) {
    it(`rejeita título inválido: ${JSON.stringify(titulo)}`, () => {
      const resultado = schemaCriacaoTarefa.safeParse({ titulo });

      assert.ok(!resultado.success);
      assert.deepEqual(resultado.error.issues[0].path, ["titulo"]);
      assert.equal(resultado.error.issues[0].message, "Informe um título.");
    });
  }

  it("aceita os limites exatos de título e descrição", () => {
    const entrada = { titulo: "a".repeat(120), descricao: "b".repeat(2_000) };

    assert.deepEqual(schemaCriacaoTarefa.parse(entrada), entrada);
  });

  it("aplica o limite do título depois de remover espaços das extremidades", () => {
    const titulo = "a".repeat(120);

    assert.equal(schemaCriacaoTarefa.parse({ titulo: ` ${titulo} ` }).titulo, titulo);
  });

  it("rejeita título acima do limite com erro associado ao campo", () => {
    const resultado = schemaCriacaoTarefa.safeParse({ titulo: "a".repeat(121) });

    assert.ok(!resultado.success);
    assert.deepEqual(resultado.error.issues[0].path, ["titulo"]);
    assert.equal(
      resultado.error.issues[0].message,
      "O título deve ter no máximo 120 caracteres.",
    );
  });

  it("rejeita descrição acima do limite com erro associado ao campo", () => {
    const resultado = schemaCriacaoTarefa.safeParse({
      titulo: "Revisar tarefas",
      descricao: "a".repeat(2_001),
    });

    assert.ok(!resultado.success);
    assert.deepEqual(resultado.error.issues[0].path, ["descricao"]);
    assert.equal(
      resultado.error.issues[0].message,
      "A descrição deve ter no máximo 2000 caracteres.",
    );
  });

  it("rejeita descrição que não seja texto", () => {
    const resultado = schemaCriacaoTarefa.safeParse({
      titulo: "Revisar tarefas",
      descricao: 123,
    });

    assert.ok(!resultado.success);
    assert.equal(resultado.error.issues[0].message, "A descrição deve ser um texto.");
  });

  for (const campo of [{ id }, { dataCriacao }, { concluida: true }]) {
    it(`rejeita o campo não permitido ${Object.keys(campo)[0]}`, () => {
      const resultado = schemaCriacaoTarefa.safeParse({
        titulo: "Revisar tarefas",
        ...campo,
      });

      assert.ok(!resultado.success);
      assert.equal(resultado.error.issues[0].code, "unrecognized_keys");
    });
  }

  it("rejeita dados ausentes ou em formato diferente de objeto", () => {
    for (const entrada of [undefined, null, "tarefa", []]) {
      assert.equal(schemaCriacaoTarefa.safeParse(entrada).success, false);
    }
  });
});

describe("identificação de tarefa", () => {
  it("aceita UUID válido", () => {
    assert.deepEqual(schemaIdentificacaoTarefa.parse({ id }), { id });
  });

  it("rejeita identificador ausente, vazio ou fora do formato UUID", () => {
    for (const entrada of [{}, { id: "" }, { id: "inexistente" }]) {
      const resultado = schemaIdentificacaoTarefa.safeParse(entrada);

      assert.ok(!resultado.success);
      assert.deepEqual(resultado.error.issues[0].path, ["id"]);
    }
  });

  it("rejeita campos adicionais na identificação", () => {
    assert.equal(
      schemaIdentificacaoTarefa.safeParse({ id, titulo: "Revisar tarefas" }).success,
      false,
    );
  });
});

describe("atualização de tarefa", () => {
  it("exige id e título, com descrição opcional", () => {
    assert.deepEqual(
      schemaAtualizacaoTarefa.parse({ id, titulo: "  Revisar contrato  " }),
      { id, titulo: "Revisar contrato" },
    );
  });

  it("reutiliza a validação dos campos na atualização", () => {
    for (const entrada of [
      { titulo: "Revisar contrato" },
      { id },
      { id: "invalido", titulo: "Revisar contrato" },
      { id, titulo: "   " },
      { id, titulo: "a".repeat(121) },
      { id, titulo: "Revisar contrato", descricao: "a".repeat(2_001) },
    ]) {
      assert.equal(schemaAtualizacaoTarefa.safeParse(entrada).success, false);
    }
  });

  it("impede o envio de uma nova data de criação", () => {
    const resultado = schemaAtualizacaoTarefa.safeParse({
      id,
      titulo: "Revisar contrato",
      dataCriacao,
    });

    assert.ok(!resultado.success);
    assert.equal(resultado.error.issues[0].code, "unrecognized_keys");
  });
});

describe("tarefa completa", () => {
  it("inclui identificador e data UTC no contrato", () => {
    const tarefa = { id, titulo: "Revisar contrato", dataCriacao };

    assert.deepEqual(schemaTarefa.parse(tarefa), tarefa);
  });

  it("rejeita tarefa sem os metadados obrigatórios", () => {
    assert.equal(schemaTarefa.safeParse({ titulo: "Revisar contrato" }).success, false);
  });

  it("rejeita data inválida ou sem indicação de UTC", () => {
    for (const data of [
      "invalida",
      "2026-02-30T21:00:00Z",
      "2026-11-04T21:00:00",
      "2026-11-04T18:00:00-03:00",
    ]) {
      assert.equal(
        schemaTarefa.safeParse({ id, titulo: "Revisar contrato", dataCriacao: data })
          .success,
        false,
      );
    }
  });
});
