import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import { taskSchema, type TaskUpdate, type TaskCreation } from "@/lib/task-schema";
import { appRouter } from "./tasks-router";
import { createTaskStore } from "./tasks-store";

function createCaller() {
  return appRouter.createCaller({ tasks: createTaskStore() });
}

describe("task creation through the router", () => {
  it("returns a normalized task with a server-generated UUID and timestamp", async () => {
    const caller = createCaller();
    const start = Date.now();
    const task = await caller.tasks.create({
      titulo: "  Review tasks  ",
      descricao: "Check the fields.",
    });
    const end = Date.now();

    assert.deepEqual(taskSchema.parse(task), task);
    assert.equal(task.titulo, "Review tasks");
    assert.equal(task.descricao, "Check the fields.");
    assert.ok(Date.parse(task.dataCriacao) >= start);
    assert.ok(Date.parse(task.dataCriacao) <= end);
  });

  it("creates tasks with distinct IDs and no description", async () => {
    const caller = createCaller();
    const first = await caller.tasks.create({ titulo: "Review tasks" });
    const second = await caller.tasks.create({ titulo: "Review tasks" });

    assert.notEqual(first.id, second.id);
    assert.equal(first.descricao, undefined);
    assert.equal(second.descricao, undefined);
  });

  it("rejects invalid input with BAD_REQUEST", async () => {
    const caller = createCaller();

    for (const input of [
      {},
      { titulo: "  " },
      { titulo: "a".repeat(121) },
      { titulo: "Review tasks", descricao: "a".repeat(2_001) },
      { titulo: "Review tasks", id: "550e8400-e29b-41d4-a716-446655440000" },
      { titulo: "Review tasks", dataCriacao: "2026-11-04T21:00:00Z" },
    ]) {
      await assert.rejects(
        caller.tasks.create(input as TaskCreation),
        (error) => error instanceof TRPCError && error.code === "BAD_REQUEST",
      );
    }
  });
});

describe("task reads through the router", () => {
  it("returns an empty list when no tasks exist", async () => {
    assert.deepEqual(await createCaller().tasks.list(), []);
  });

  it("lists tasks with the data recorded at creation", async () => {
    const caller = createCaller();
    const created = await caller.tasks.create({
      titulo: "Review documentation",
      descricao: "Check the commands.",
    });

    assert.deepEqual(await caller.tasks.list(), [created]);
    assert.deepEqual(await caller.tasks.findById({ id: created.id }), created);
  });

  it("lists the most recent tasks first", async (context) => {
    context.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-04T21:00:00Z") });
    const caller = createCaller();
    const older = await caller.tasks.create({ titulo: "Older task" });
    context.mock.timers.tick(1_000);
    const newer = await caller.tasks.create({ titulo: "Newer task" });

    assert.deepEqual(await caller.tasks.list(), [newer, older]);
  });

  it("sorts by ID when creation dates match", async (context) => {
    context.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-04T21:00:00Z") });
    const caller = createCaller();
    const tasks = [];

    for (let index = 0; index < 5; index += 1) {
      tasks.push(await caller.tasks.create({ titulo: `Task ${index}` }));
    }

    const expectedIds = tasks.map((task) => task.id).sort();
    const taskList = await caller.tasks.list();

    assert.equal(new Set(tasks.map((task) => task.dataCriacao)).size, 1);
    assert.deepEqual(taskList.map((task) => task.id), expectedIds);
  });

  it("returns NOT_FOUND when no task has the supplied UUID", async () => {
    const caller = createCaller();

    await assert.rejects(
      caller.tasks.findById({ id: "550e8400-e29b-41d4-a716-446655440000" }),
      (error) => error instanceof TRPCError && error.code === "NOT_FOUND",
    );
  });

  it("validates the ID before looking up a task", async () => {
    const caller = createCaller();

    await assert.rejects(
      caller.tasks.findById({ id: "invalid" }),
      (error) => error instanceof TRPCError && error.code === "BAD_REQUEST",
    );
  });

  it("keeps test stores independent", async () => {
    const firstCaller = createCaller();
    const secondCaller = createCaller();
    const task = await firstCaller.tasks.create({ titulo: "Isolated task" });

    assert.deepEqual(await firstCaller.tasks.list(), [task]);
    assert.deepEqual(await secondCaller.tasks.list(), []);
  });

  it("preserves stored data when a returned object is changed", async () => {
    const store = createTaskStore();
    const created = store.create({ titulo: "Original title" });
    created.titulo = "Changed creation result";
    const taskList = store.list();
    taskList[0].titulo = "Changed list item";
    const found = store.findById(created.id);
    assert.ok(found);
    found.titulo = "Changed lookup result";

    assert.equal(store.findById(created.id)?.titulo, "Original title");
  });
});

describe("task updates through the router", () => {
  it("updates editable fields while preserving identity, creation date and list order", async (context) => {
    context.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-04T21:00:00Z") });
    const caller = createCaller();
    const original = await caller.tasks.create({
      titulo: "Original title",
      descricao: "Original description",
    });
    context.mock.timers.tick(1_000);
    const other = await caller.tasks.create({ titulo: "Another task" });
    context.mock.timers.tick(1_000);

    const updated = await caller.tasks.update({
      id: original.id,
      titulo: "  Updated title  ",
      descricao: "Updated description",
    });

    assert.deepEqual(updated, {
      ...original,
      titulo: "Updated title",
      descricao: "Updated description",
    });
    assert.deepEqual(await caller.tasks.findById({ id: original.id }), updated);
    assert.deepEqual(await caller.tasks.list(), [other, updated]);
  });

  it("clears the previous description when it is omitted", async () => {
    const caller = createCaller();
    const original = await caller.tasks.create({
      titulo: "Original title",
      descricao: "Original description",
    });

    const updated = await caller.tasks.update({
      id: original.id,
      titulo: "Updated title",
    });
    const found = await caller.tasks.findById({ id: original.id });

    assert.equal(updated.descricao, undefined);
    assert.equal(found.descricao, undefined);
  });

  it("accepts an empty description", async () => {
    const caller = createCaller();
    const original = await caller.tasks.create({ titulo: "Original title" });
    const updated = await caller.tasks.update({
      id: original.id,
      titulo: "Updated title",
      descricao: "",
    });

    assert.equal(updated.descricao, "");
  });

  it("leaves stored data unchanged when validation fails", async () => {
    const caller = createCaller();
    const original = await caller.tasks.create({
      titulo: "Original title",
      descricao: "Original description",
    });

    for (const input of [
      { id: original.id, titulo: "  " },
      { id: original.id, titulo: "a".repeat(121) },
      { id: original.id, titulo: "Updated title", descricao: "a".repeat(2_001) },
      { id: original.id, titulo: "Updated title", dataCriacao: "2026-11-04T22:00:00Z" },
    ]) {
      await assert.rejects(
        caller.tasks.update(input as TaskUpdate),
        (error) => error instanceof TRPCError && error.code === "BAD_REQUEST",
      );
    }

    assert.deepEqual(await caller.tasks.findById({ id: original.id }), original);
  });

  it("returns NOT_FOUND without inserting a task when it does not exist", async () => {
    const caller = createCaller();

    await assert.rejects(
      caller.tasks.update({
        id: "550e8400-e29b-41d4-a716-446655440000",
        titulo: "Updated title",
      }),
      (error) => error instanceof TRPCError && error.code === "NOT_FOUND",
    );
    assert.deepEqual(await caller.tasks.list(), []);
  });

  it("returns a copy of the updated task", () => {
    const store = createTaskStore();
    const original = store.create({ titulo: "Original title" });
    const updated = store.update({ id: original.id, titulo: "Updated title" });
    assert.ok(updated);
    updated.titulo = "Changed return value";

    assert.equal(store.findById(original.id)?.titulo, "Updated title");
  });
});

describe("task deletion through the router", () => {
  it("deletes only the selected task and returns its ID", async () => {
    const caller = createCaller();
    const selected = await caller.tasks.create({ titulo: "Task to delete" });
    const other = await caller.tasks.create({ titulo: "Task to keep" });

    assert.deepEqual(await caller.tasks.delete({ id: selected.id }), {
      id: selected.id,
    });
    assert.deepEqual(await caller.tasks.list(), [other]);
    await assert.rejects(
      caller.tasks.findById({ id: selected.id }),
      (error) => error instanceof TRPCError && error.code === "NOT_FOUND",
    );
  });

  it("returns NOT_FOUND without changing other tasks when the task does not exist", async () => {
    const caller = createCaller();
    const existing = await caller.tasks.create({ titulo: "Existing task" });

    await assert.rejects(
      caller.tasks.delete({ id: "550e8400-e29b-41d4-a716-446655440000" }),
      (error) => error instanceof TRPCError && error.code === "NOT_FOUND",
    );
    assert.deepEqual(await caller.tasks.list(), [existing]);
  });

  it("rejects an invalid ID without changing stored tasks", async () => {
    const caller = createCaller();
    const existing = await caller.tasks.create({ titulo: "Existing task" });

    await assert.rejects(
      caller.tasks.delete({ id: "invalid" }),
      (error) => error instanceof TRPCError && error.code === "BAD_REQUEST",
    );
    assert.deepEqual(await caller.tasks.list(), [existing]);
  });

  it("returns NOT_FOUND when the same task is deleted twice", async () => {
    const caller = createCaller();
    const task = await caller.tasks.create({ titulo: "Task to delete" });
    await caller.tasks.delete({ id: task.id });

    await assert.rejects(
      caller.tasks.delete({ id: task.id }),
      (error) => error instanceof TRPCError && error.code === "NOT_FOUND",
    );
    assert.deepEqual(await caller.tasks.list(), []);
  });
});
