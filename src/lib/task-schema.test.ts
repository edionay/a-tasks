import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  taskUpdateSchema,
  taskCreationSchema,
  taskIdSchema,
  taskSchema,
} from "./task-schema";

const id = "550e8400-e29b-41d4-a716-446655440000";
const creationDate = "2026-11-04T21:00:00.000Z";

describe("task creation", () => {
  it("trims the title without changing its content", () => {
    const task = taskCreationSchema.parse({
      titulo: "  Review  documentation  ",
      descricao: "Check the run commands.\nPreserve line breaks.",
    });

    assert.deepEqual(task, {
      titulo: "Review  documentation",
      descricao: "Check the run commands.\nPreserve line breaks.",
    });
  });

  it("accepts a missing or empty description", () => {
    assert.deepEqual(taskCreationSchema.parse({ titulo: "Review tasks" }), {
      titulo: "Review tasks",
    });
    assert.deepEqual(
      taskCreationSchema.parse({ titulo: "Review tasks", descricao: "" }),
      { titulo: "Review tasks", descricao: "" },
    );
  });

  for (const title of [undefined, "", " \t\n ", null, 123]) {
    it(`rejects an invalid title: ${JSON.stringify(title)}`, () => {
      const result = taskCreationSchema.safeParse({ titulo: title });

      assert.ok(!result.success);
      assert.deepEqual(result.error.issues[0].path, ["titulo"]);
      assert.equal(result.error.issues[0].message, "Enter a title.");
    });
  }

  it("accepts title and description at their length limits", () => {
    const input = { titulo: "a".repeat(120), descricao: "b".repeat(2_000) };

    assert.deepEqual(taskCreationSchema.parse(input), input);
  });

  it("checks title length after trimming", () => {
    const title = "a".repeat(120);

    assert.equal(taskCreationSchema.parse({ titulo: ` ${title} ` }).titulo, title);
  });

  it("returns a field error when the title exceeds its limit", () => {
    const result = taskCreationSchema.safeParse({ titulo: "a".repeat(121) });

    assert.ok(!result.success);
    assert.deepEqual(result.error.issues[0].path, ["titulo"]);
    assert.equal(
      result.error.issues[0].message,
      "Title must be at most 120 characters.",
    );
  });

  it("returns a field error when the description exceeds its limit", () => {
    const result = taskCreationSchema.safeParse({
      titulo: "Review tasks",
      descricao: "a".repeat(2_001),
    });

    assert.ok(!result.success);
    assert.deepEqual(result.error.issues[0].path, ["descricao"]);
    assert.equal(
      result.error.issues[0].message,
      "Description must be at most 2000 characters.",
    );
  });

  it("rejects a non-string description", () => {
    const result = taskCreationSchema.safeParse({
      titulo: "Review tasks",
      descricao: 123,
    });

    assert.ok(!result.success);
    assert.equal(result.error.issues[0].message, "Description must be text.");
  });

  for (const field of [{ id }, { dataCriacao: creationDate }, { completed: true }]) {
    it(`rejects the unexpected field ${Object.keys(field)[0]}`, () => {
      const result = taskCreationSchema.safeParse({
        titulo: "Review tasks",
        ...field,
      });

      assert.ok(!result.success);
      assert.equal(result.error.issues[0].code, "unrecognized_keys");
    });
  }

  it("rejects missing data and non-object input", () => {
    for (const input of [undefined, null, "task", []]) {
      assert.equal(taskCreationSchema.safeParse(input).success, false);
    }
  });
});

describe("task identification", () => {
  it("accepts a valid UUID", () => {
    assert.deepEqual(taskIdSchema.parse({ id }), { id });
  });

  it("rejects a missing, empty or malformed UUID", () => {
    for (const input of [{}, { id: "" }, { id: "missing" }]) {
      const result = taskIdSchema.safeParse(input);

      assert.ok(!result.success);
      assert.deepEqual(result.error.issues[0].path, ["id"]);
    }
  });

  it("rejects extra fields in an identification request", () => {
    assert.equal(
      taskIdSchema.safeParse({ id, titulo: "Review tasks" }).success,
      false,
    );
  });
});

describe("task update", () => {
  it("requires an ID and title with an optional description", () => {
    assert.deepEqual(
      taskUpdateSchema.parse({ id, titulo: "  Review the contract  " }),
      { id, titulo: "Review the contract" },
    );
  });

  it("validates fields when updating a task", () => {
    for (const input of [
      { titulo: "Review the contract" },
      { id },
      { id: "invalid", titulo: "Review the contract" },
      { id, titulo: "   " },
      { id, titulo: "a".repeat(121) },
      { id, titulo: "Review the contract", descricao: "a".repeat(2_001) },
    ]) {
      assert.equal(taskUpdateSchema.safeParse(input).success, false);
    }
  });

  it("rejects a creation date supplied for an update", () => {
    const result = taskUpdateSchema.safeParse({
      id,
      titulo: "Review the contract",
      dataCriacao: creationDate,
    });

    assert.ok(!result.success);
    assert.equal(result.error.issues[0].code, "unrecognized_keys");
  });
});

describe("complete task", () => {
  it("includes an ID and UTC creation date", () => {
    const task = { id, titulo: "Review the contract", dataCriacao: creationDate };

    assert.deepEqual(taskSchema.parse(task), task);
  });

  it("rejects a task without its required metadata", () => {
    assert.equal(taskSchema.safeParse({ titulo: "Review the contract" }).success, false);
  });

  it("rejects an invalid date or a date without UTC notation", () => {
    for (const data of [
      "invalid",
      "2026-02-30T21:00:00Z",
      "2026-11-04T21:00:00",
      "2026-11-04T18:00:00-03:00",
    ]) {
      assert.equal(
        taskSchema.safeParse({ id, titulo: "Review the contract", dataCriacao: data })
          .success,
        false,
      );
    }
  });
});
