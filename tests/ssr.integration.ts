import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { it } from "node:test";
import { createTRPCClient, httpLink, TRPCClientError } from "@trpc/client";
import { taskSchema } from "../src/lib/task-schema";
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
