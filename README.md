# Tasks

Task manager built with Next.js 15, React, TypeScript and Tailwind CSS.

## Requirements

- Node.js 24.13.1, as specified in `.nvmrc`.
- npm 11.

## Local development

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

## Checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

To run the production build:

```sh
npm start
```

## Tests

`npm test` runs the native Node.js test runner with TypeScript support from
`tsx`. Test files use the `.test.ts` suffix and sit next to their modules in `src/`.

Tests use `node:test` and assertions from `node:assert/strict`.

## Task data

Schemas and input rules live in `src/lib/tarefa-schema.ts`.
TypeScript types are inferred from the Zod schemas.

Field names follow the challenge statement: `id`, `titulo`, optional `descricao`
and `dataCriacao`. The ID is a UUID, and the creation date is an ISO 8601 timestamp
in UTC. Domain identifiers and procedure names remain in Portuguese.

The title is trimmed and must contain 1 to 120 characters after trimming.
The description accepts up to 2,000 characters and preserves whitespace and line
breaks. Creation accepts only a title and description. Updates also
require the task ID and reject a replacement creation date. Extra fields are
rejected.

## Task API

The API uses tRPC at `/api/trpc` and validates input on the server.

### Create a task

`tarefas.criar` accepts `titulo` and an optional `descricao`. It returns the task
with an ID and creation date assigned by the server.

```sh
curl http://localhost:3000/api/trpc/tarefas.criar \
  -H 'Content-Type: application/json' \
  --data '{"titulo":"Review documentation","descricao":"Check the run commands."}'
```

The task is returned in `result.data`. Invalid input returns HTTP 400 with the
`BAD_REQUEST` code, an English message and field errors in `error.data.errosCampos`.
Internal errors return a generic message without server details or stack traces.

### List tasks

`tarefas.listar` returns the most recent tasks first. Tasks with the same creation
date are sorted by ID in ascending order.

```sh
curl http://localhost:3000/api/trpc/tarefas.listar
```

The list is returned in `result.data`. An empty store returns `[]`.

### Find a task by ID

`tarefas.buscarPorId` accepts an ID and returns the task in `result.data`.
Replace the sample UUID below with the ID returned when creating a task:

```sh
curl --get http://localhost:3000/api/trpc/tarefas.buscarPorId \
  --data-urlencode 'input={"id":"550e8400-e29b-41d4-a716-446655440000"}'
```

An invalid UUID returns HTTP 400 (`BAD_REQUEST`). A valid UUID with no matching
task returns HTTP 404 (`NOT_FOUND`) with the message "Task not found."

### Update a task

`tarefas.atualizar` accepts `id`, `titulo` and an optional `descricao`.
It replaces the title and description while keeping the ID and creation date.
Omitting `descricao` clears the previous description; an empty string is also accepted.

```sh
curl http://localhost:3000/api/trpc/tarefas.atualizar \
  -H 'Content-Type: application/json' \
  --data '{"id":"550e8400-e29b-41d4-a716-446655440000","titulo":"Updated title","descricao":"Updated description"}'
```

Use the ID of an existing task. The response contains the updated task in
`result.data`. A missing task returns HTTP 404 (`NOT_FOUND`). Invalid input
returns HTTP 400 (`BAD_REQUEST`) and leaves the stored task unchanged.

### Delete a task

`tarefas.excluir` accepts an `id` and returns `{ id }` after removing the task.
Use the ID of an existing task:

```sh
curl http://localhost:3000/api/trpc/tarefas.excluir \
  -H 'Content-Type: application/json' \
  --data '{"id":"550e8400-e29b-41d4-a716-446655440000"}'
```

A missing or already deleted task returns HTTP 404 (`NOT_FOUND`). An invalid UUID
returns HTTP 400 (`BAD_REQUEST`). Other tasks remain unchanged.

### Storage

Tasks exist only in the memory of the Node.js process. No database, files or
browser storage are used. The store starts empty and is shared by everyone who
accesses the same instance. Restarting the process clears the tasks. Separate
processes or instances do not share data.

## Dependencies

The `overrides` entries pin PostCSS and minimatch to patched versions.
The TypeScript ESLint parser and plugin use the same version, compatible with
ESLint 9.
