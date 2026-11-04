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

describe("task creation", () => {
  it("trims the title without changing its content", () => {
    const tarefa = schemaCriacaoTarefa.parse({
      titulo: "  Review  documentation  ",
      descricao: "Check the run commands.\nPreserve line breaks.",
    });

    assert.deepEqual(tarefa, {
      titulo: "Review  documentation",
      descricao: "Check the run commands.\nPreserve line breaks.",
    });
  });

  it("accepts a missing or empty description", () => {
    assert.deepEqual(schemaCriacaoTarefa.parse({ titulo: "Review tasks" }), {
      titulo: "Review tasks",
    });
    assert.deepEqual(
      schemaCriacaoTarefa.parse({ titulo: "Review tasks", descricao: "" }),
      { titulo: "Review tasks", descricao: "" },
    );
  });

  for (const titulo of [undefined, "", " \t\n ", null, 123]) {
    it(`rejects an invalid title: ${JSON.stringify(titulo)}`, () => {
      const resultado = schemaCriacaoTarefa.safeParse({ titulo });

      assert.ok(!resultado.success);
      assert.deepEqual(resultado.error.issues[0].path, ["titulo"]);
      assert.equal(resultado.error.issues[0].message, "Enter a title.");
    });
  }

  it("accepts title and description at their length limits", () => {
    const entrada = { titulo: "a".repeat(120), descricao: "b".repeat(2_000) };

    assert.deepEqual(schemaCriacaoTarefa.parse(entrada), entrada);
  });

  it("checks title length after trimming", () => {
    const titulo = "a".repeat(120);

    assert.equal(schemaCriacaoTarefa.parse({ titulo: ` ${titulo} ` }).titulo, titulo);
  });

  it("returns a field error when the title exceeds its limit", () => {
    const resultado = schemaCriacaoTarefa.safeParse({ titulo: "a".repeat(121) });

    assert.ok(!resultado.success);
    assert.deepEqual(resultado.error.issues[0].path, ["titulo"]);
    assert.equal(
      resultado.error.issues[0].message,
      "Title must be at most 120 characters.",
    );
  });

  it("returns a field error when the description exceeds its limit", () => {
    const resultado = schemaCriacaoTarefa.safeParse({
      titulo: "Review tasks",
      descricao: "a".repeat(2_001),
    });

    assert.ok(!resultado.success);
    assert.deepEqual(resultado.error.issues[0].path, ["descricao"]);
    assert.equal(
      resultado.error.issues[0].message,
      "Description must be at most 2000 characters.",
    );
  });

  it("rejects a non-string description", () => {
    const resultado = schemaCriacaoTarefa.safeParse({
      titulo: "Review tasks",
      descricao: 123,
    });

    assert.ok(!resultado.success);
    assert.equal(resultado.error.issues[0].message, "Description must be text.");
  });

  for (const campo of [{ id }, { dataCriacao }, { concluida: true }]) {
    it(`rejects the unexpected field ${Object.keys(campo)[0]}`, () => {
      const resultado = schemaCriacaoTarefa.safeParse({
        titulo: "Review tasks",
        ...campo,
      });

      assert.ok(!resultado.success);
      assert.equal(resultado.error.issues[0].code, "unrecognized_keys");
    });
  }

  it("rejects missing data and non-object input", () => {
    for (const entrada of [undefined, null, "task", []]) {
      assert.equal(schemaCriacaoTarefa.safeParse(entrada).success, false);
    }
  });
});

describe("task identification", () => {
  it("accepts a valid UUID", () => {
    assert.deepEqual(schemaIdentificacaoTarefa.parse({ id }), { id });
  });

  it("rejects a missing, empty or malformed UUID", () => {
    for (const entrada of [{}, { id: "" }, { id: "missing" }]) {
      const resultado = schemaIdentificacaoTarefa.safeParse(entrada);

      assert.ok(!resultado.success);
      assert.deepEqual(resultado.error.issues[0].path, ["id"]);
    }
  });

  it("rejects extra fields in an identification request", () => {
    assert.equal(
      schemaIdentificacaoTarefa.safeParse({ id, titulo: "Review tasks" }).success,
      false,
    );
  });
});

describe("task update", () => {
  it("requires an ID and title with an optional description", () => {
    assert.deepEqual(
      schemaAtualizacaoTarefa.parse({ id, titulo: "  Review the contract  " }),
      { id, titulo: "Review the contract" },
    );
  });

  it("validates fields when updating a task", () => {
    for (const entrada of [
      { titulo: "Review the contract" },
      { id },
      { id: "invalid", titulo: "Review the contract" },
      { id, titulo: "   " },
      { id, titulo: "a".repeat(121) },
      { id, titulo: "Review the contract", descricao: "a".repeat(2_001) },
    ]) {
      assert.equal(schemaAtualizacaoTarefa.safeParse(entrada).success, false);
    }
  });

  it("rejects a creation date supplied for an update", () => {
    const resultado = schemaAtualizacaoTarefa.safeParse({
      id,
      titulo: "Review the contract",
      dataCriacao,
    });

    assert.ok(!resultado.success);
    assert.equal(resultado.error.issues[0].code, "unrecognized_keys");
  });
});

describe("complete task", () => {
  it("includes an ID and UTC creation date", () => {
    const tarefa = { id, titulo: "Review the contract", dataCriacao };

    assert.deepEqual(schemaTarefa.parse(tarefa), tarefa);
  });

  it("rejects a task without its required metadata", () => {
    assert.equal(schemaTarefa.safeParse({ titulo: "Review the contract" }).success, false);
  });

  it("rejects an invalid date or a date without UTC notation", () => {
    for (const data of [
      "invalid",
      "2026-02-30T21:00:00Z",
      "2026-11-04T21:00:00",
      "2026-11-04T18:00:00-03:00",
    ]) {
      assert.equal(
        schemaTarefa.safeParse({ id, titulo: "Review the contract", dataCriacao: data })
          .success,
        false,
      );
    }
  });
});
