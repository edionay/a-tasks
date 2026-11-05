import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { taskSchema } from "@/lib/task-schema";
import { appRouter } from "@/server/tasks-router";
import { createTaskStore } from "@/server/tasks-store";
import { GET, POST } from "./route";

function createRequest(input: unknown, operation = "tasks.create") {
  return new Request(`http://localhost/api/trpc/${operation}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

describe("task creation over HTTP", () => {
  it("creates a task through POST and disables response caching", async () => {
    const response = await POST(createRequest({ titulo: "  Review the contract  " }));
    const body = await response.json();
    const task = taskSchema.parse(body.result.data);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(task.titulo, "Review the contract");
  });

  it("returns an English message and field error without a stack trace", async () => {
    const response = await POST(createRequest({ titulo: "  " }));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.data.code, "BAD_REQUEST");
    assert.equal(body.error.message, "Enter a title.");
    assert.deepEqual(body.error.data.fieldErrors.titulo, ["Enter a title."]);
    assert.equal("stack" in body.error.data, false);
  });

  it("rejects malformed JSON with a readable message", async () => {
    const response = await POST(
      new Request("http://localhost/api/trpc/tasks.create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.message, "Invalid request.");
    assert.equal("stack" in body.error.data, false);
  });

  it("does not allow task creation through GET", async () => {
    const response = await GET(new Request("http://localhost/api/trpc/tasks.create"));

    assert.equal(response.status, 405);
  });

  it("hides internal details when the store fails", async () => {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: createRequest({ titulo: "Review the contract" }),
      router: appRouter,
      createContext: () => ({
        tasks: {
          ...createTaskStore(),
          create() {
            throw new Error("Internal store details.");
          },
        },
      }),
    });
    const text = await response.text();
    const body = JSON.parse(text);

    assert.equal(response.status, 500);
    assert.equal(body.error.message, "Unable to process the request.");
    assert.equal(text.includes("Internal store"), false);
    assert.equal("stack" in body.error.data, false);
  });
});

describe("task reads over HTTP", () => {
  it("lists and retrieves tasks created by another request", async () => {
    const creation = await POST(createRequest({ titulo: "Check task reads" }));
    const creationBody = await creation.json();
    const task = taskSchema.parse(creationBody.result.data);

    const taskList = await GET(new Request("http://localhost/api/trpc/tasks.list"));
    const listBody = await taskList.json();
    const tasks = taskSchema.array().parse(listBody.result.data);

    assert.equal(taskList.status, 200);
    assert.equal(taskList.headers.get("cache-control"), "no-store");
    assert.deepEqual(tasks.find((item) => item.id === task.id), task);

    const parameters = new URLSearchParams({ input: JSON.stringify({ id: task.id }) });
    const lookup = await GET(
      new Request(`http://localhost/api/trpc/tasks.findById?${parameters}`),
    );
    const lookupBody = await lookup.json();

    assert.equal(lookup.status, 200);
    assert.deepEqual(lookupBody.result.data, task);
  });

  it("returns HTTP 404 for a UUID with no task", async () => {
    const parameters = new URLSearchParams({
      input: JSON.stringify({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const response = await GET(
      new Request(`http://localhost/api/trpc/tasks.findById?${parameters}`),
    );
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error.data.code, "NOT_FOUND");
    assert.equal(body.error.message, "Task not found.");
    assert.equal("stack" in body.error.data, false);
  });

  it("returns HTTP 400 for an invalid ID", async () => {
    const parameters = new URLSearchParams({ input: JSON.stringify({ id: "invalid" }) });
    const response = await GET(
      new Request(`http://localhost/api/trpc/tasks.findById?${parameters}`),
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.data.code, "BAD_REQUEST");
    assert.equal(body.error.message, "Enter a valid task ID.");
    assert.equal("stack" in body.error.data, false);
  });
});

describe("task updates over HTTP", () => {
  it("updates an existing task and persists the result across requests", async () => {
    const creation = await POST(createRequest({ titulo: "Original title" }));
    const creationBody = await creation.json();
    const original = taskSchema.parse(creationBody.result.data);

    const response = await POST(createRequest({
      id: original.id,
      titulo: "  Updated title  ",
      descricao: "Updated description",
    }, "tasks.update"));
    const body = await response.json();
    const updated = taskSchema.parse(body.result.data);

    assert.equal(response.status, 200);
    assert.deepEqual(updated, {
      ...original,
      titulo: "Updated title",
      descricao: "Updated description",
    });

    const parameters = new URLSearchParams({ input: JSON.stringify({ id: original.id }) });
    const lookup = await GET(
      new Request(`http://localhost/api/trpc/tasks.findById?${parameters}`),
    );
    const lookupBody = await lookup.json();
    assert.deepEqual(lookupBody.result.data, updated);
  });

  it("returns HTTP 404 when updating a missing task", async () => {
    const response = await POST(createRequest({
      id: "550e8400-e29b-41d4-a716-446655440000",
      titulo: "Updated title",
    }, "tasks.update"));
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error.message, "Task not found.");
    assert.equal(body.error.data.code, "NOT_FOUND");
    assert.equal("stack" in body.error.data, false);
  });

  it("returns HTTP 400 with a field error for invalid update input", async () => {
    const response = await POST(createRequest({
      id: "550e8400-e29b-41d4-a716-446655440000",
      titulo: "  ",
    }, "tasks.update"));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.data.code, "BAD_REQUEST");
    assert.deepEqual(body.error.data.fieldErrors.titulo, ["Enter a title."]);
    assert.equal("stack" in body.error.data, false);
  });

  it("does not allow task updates through GET", async () => {
    const response = await GET(new Request("http://localhost/api/trpc/tasks.update"));

    assert.equal(response.status, 405);
  });
});

describe("task deletion over HTTP", () => {
  it("deletes a task through POST and removes it from subsequent reads", async () => {
    const creation = await POST(createRequest({ titulo: "Task to delete" }));
    const creationBody = await creation.json();
    const task = taskSchema.parse(creationBody.result.data);

    const response = await POST(createRequest({ id: task.id }, "tasks.delete"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.result.data, { id: task.id });

    const taskList = await GET(new Request("http://localhost/api/trpc/tasks.list"));
    const listBody = await taskList.json();
    const tasks = taskSchema.array().parse(listBody.result.data);
    assert.equal(tasks.some((item) => item.id === task.id), false);

    const parameters = new URLSearchParams({ input: JSON.stringify({ id: task.id }) });
    const lookup = await GET(
      new Request(`http://localhost/api/trpc/tasks.findById?${parameters}`),
    );
    assert.equal(lookup.status, 404);
  });

  it("returns HTTP 404 when deleting a missing task", async () => {
    const response = await POST(createRequest({
      id: "550e8400-e29b-41d4-a716-446655440000",
    }, "tasks.delete"));
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error.data.code, "NOT_FOUND");
    assert.equal(body.error.message, "Task not found.");
    assert.equal("stack" in body.error.data, false);
  });

  it("returns HTTP 400 for an invalid deletion ID", async () => {
    const response = await POST(createRequest({ id: "invalid" }, "tasks.delete"));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.data.code, "BAD_REQUEST");
    assert.deepEqual(body.error.data.fieldErrors.id, ["Enter a valid task ID."]);
    assert.equal("stack" in body.error.data, false);
  });

  it("does not allow task deletion through GET", async () => {
    const response = await GET(new Request("http://localhost/api/trpc/tasks.delete"));

    assert.equal(response.status, 405);
  });
});
