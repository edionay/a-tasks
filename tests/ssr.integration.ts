import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { it } from "node:test";
import { createTRPCClient, httpLink, TRPCClientError } from "@trpc/client";
import { taskSchema, type Task } from "../src/lib/task-schema";
import type { AppRouter } from "../src/server/tasks-router";

let serverUrl = "http://127.0.0.1:3000";

if (process.env.TASKS_TEST_URL) {
  serverUrl = process.env.TASKS_TEST_URL;
}

async function sendMutation(operation: string, input: unknown) {
  return fetch(`${serverUrl}/api/trpc/${operation}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

async function loadMainContent() {
  const response = await fetch(serverUrl);
  assert.equal(response.status, 200);
  const html = await response.text();
  const content = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);
  assert.ok(content, "Expected the page content in the initial HTML.");
  return content[1];
}

it("creates tasks through the typed HTTP client and returns validation errors", async (context) => {
  const client = createTRPCClient<AppRouter>({
    links: [httpLink({ url: `${serverUrl}/api/trpc` })],
  });
  const title = `Client task ${randomUUID()}`;
  const task = await client.tasks.create.mutate({ titulo: `  ${title}  ` });
  context.after(async () => {
    await client.tasks.delete.mutate({ id: task.id });
  });

  assert.equal(task.titulo, title);
  taskSchema.parse(task);
  assert.match(await loadMainContent(), new RegExp(`<h2[^>]*>${title}</h2>`));
  await assert.rejects(client.tasks.create.mutate({ titulo: "   " }), (error: unknown) => {
    assert.ok(error instanceof TRPCClientError);
    assert.equal(error.message, "Enter a title.");
    assert.equal(error.data.code, "BAD_REQUEST");
    return true;
  });
});

it("renders HTTP mutations in the initial page HTML", async (context) => {
  const title = `SSR task ${randomUUID()}`;
  const description = "Visible before browser scripts run.";
  const creation = await sendMutation("tasks.create", { titulo: title, descricao: description });
  assert.equal(creation.status, 200);
  const creationBody = await creation.json();
  const task = taskSchema.parse(creationBody.result.data);

  context.after(async () => {
    const response = await sendMutation("tasks.delete", { id: task.id });
    assert.ok(response.status === 200 || response.status === 404);
  });

  const initial = await loadMainContent();
  assert.match(initial, new RegExp(`<h2[^>]*>${title}</h2>`));
  assert.ok(initial.includes(description));
  assert.ok(initial.includes(task.dataCriacao));
  assert.ok(initial.includes("UTC"));
  assert.ok(initial.includes(`aria-label="Delete ${title}"`));

  const newTitle = `Updated ${title}`;
  const updateResult = await sendMutation("tasks.update", {
    id: task.id,
    titulo: newTitle,
    descricao: description,
  });
  assert.equal(updateResult.status, 200);
  const updated = await loadMainContent();
  assert.match(updated, new RegExp(`<h2[^>]*>${newTitle}</h2>`));
  assert.doesNotMatch(updated, new RegExp(`<h2[^>]*>${title}</h2>`));

  const deletion = await sendMutation("tasks.delete", { id: task.id });
  assert.equal(deletion.status, 200);
  const final = await loadMainContent();
  assert.ok(!final.includes(task.id));
});

it("loads the edit form on the server and returns 404 for missing tasks", async (context) => {
  const client = createTRPCClient<AppRouter>({
    links: [httpLink({ url: `${serverUrl}/api/trpc` })],
  });
  const title = `Editable task ${randomUUID()}`;
  const task = await client.tasks.create.mutate({
    titulo: title,
    descricao: "Existing description.",
  });
  context.after(async () => {
    const response = await sendMutation("tasks.delete", { id: task.id });
    assert.ok(response.status === 200 || response.status === 404);
  });

  const editUrl = `${serverUrl}/tasks/${task.id}/edit`;
  const initial = await fetch(editUrl);
  assert.equal(initial.status, 200);
  const initialHtml = await initial.text();
  assert.ok(initialHtml.includes(`value="${title}"`));
  assert.match(initialHtml, /<textarea[^>]*>Existing description\.<\/textarea>/);
  assert.ok((await loadMainContent()).includes(`href="/tasks/${task.id}/edit"`));

  const updated = await client.tasks.update.mutate({ id: task.id, titulo: "Updated task" });
  assert.equal(updated.dataCriacao, task.dataCriacao);
  const refreshedHtml = await (await fetch(editUrl)).text();
  assert.ok(refreshedHtml.includes('value="Updated task"'));
  assert.match(refreshedHtml, /<textarea[^>]*><\/textarea>/);

  await client.tasks.delete.mutate({ id: task.id });
  for (const url of [editUrl, `${serverUrl}/tasks/invalid/edit`]) {
    const missing = await fetch(url);
    assert.equal(missing.status, 404);
    const html = await missing.text();
    assert.ok(html.includes("Task not found"));
    assert.ok(html.includes("Back to tasks"));
  }
});

it("renders only the first ten tasks and serves the remaining pages over HTTP", async (context) => {
  const client = createTRPCClient<AppRouter>({
    links: [httpLink({ url: `${serverUrl}/api/trpc` })],
  });
  const created: Task[] = [];
  context.after(async () => {
    for (const task of created) {
      const response = await sendMutation("tasks.delete", { id: task.id });
      assert.ok(response.status === 200 || response.status === 404);
    }
  });
  for (let index = 0; index < 25; index += 1) {
    created.push(await client.tasks.create.mutate({ titulo: `Paged task ${randomUUID()}` }));
  }
  const first = await client.tasks.listPage.query({});
  assert.equal(first.items.length, 10);
  assert.ok(first.nextCursor);
  const html = await loadMainContent();
  assert.equal((html.match(/<h2\b/g) ?? []).length, 10);
  for (const task of first.items) assert.ok(html.includes(task.titulo));

  const second = await client.tasks.listPage.query({ cursor: first.nextCursor });
  assert.equal(second.items.length, 10);
  assert.ok(second.nextCursor);
  const firstIds = new Set(first.items.map((task) => task.id));
  for (const task of second.items) {
    assert.equal(firstIds.has(task.id), false);
    assert.equal(html.includes(task.titulo), false);
  }
  const third = await client.tasks.listPage.query({ cursor: second.nextCursor });
  assert.ok(third.items.length >= 5);
  const loadedIds = new Set([...first.items, ...second.items, ...third.items].map((task) => task.id));
  for (const task of created) assert.ok(loadedIds.has(task.id));
});
