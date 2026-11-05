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

## Architecture

Frontend and backend run in one Next.js application on Node.js. Next.js serves
the pages and the tRPC HTTP endpoint.

- `src/app/`: routes, server-rendered pages and the HTTP handler at `/api/trpc`.
- `src/components/`: task list, shared creation/edit form and delete button.
- `src/lib/task-schema.ts`: Zod schemas and inferred types shared by client and server.
- `src/lib/trpc-client.ts`: typed HTTP client for browser queries and mutations.
- `src/server/tasks-router.ts`: tRPC procedures and expected API errors.
- `src/server/tasks-store.ts`: task operations and the shared in-memory store.
- `src/server/trpc.ts`: server context and error formatting.

Page requests load tasks through a server-side tRPC caller. Browser mutations
use the HTTP endpoint and then refresh the server-rendered list. Both paths use
the same store in the Node.js process. Task data is not cached in browser storage.
Additional task pages are fetched through the HTTP client as the user scrolls.

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

### SSR integration test

Build the app and start the production server:

```sh
npm run build
npm start
```

In another terminal, run:

```sh
npm run test:integration
```

The test creates a temporary task through HTTP, checks its title, description
and date in the initial page HTML, then updates and deletes it. It removes the
task after the test. To use another server address, set `TASKS_TEST_URL`.
It also checks creation and validation errors through the typed tRPC HTTP client.
The edit-page test checks server-rendered field values, refreshed data after an
update and HTTP 404 responses for invalid or deleted task IDs.
Pagination tests cover ten-item pages, ordering, deleted cursors and continuation
without gaps or duplicates. The integration test also checks that only the first
ten tasks are in the initial HTML and that subsequent pages are available over HTTP.

### Browser checks

1. Open the empty list and select "New task". Submit a blank title and check
   the field error and focus.
2. Create a task, reload the list and check that its data remains visible.
3. Edit its title, clear its description and save. Check that the creation date
   remains unchanged.
4. Cancel a deletion, then confirm it. Check the success message and empty list.
5. Repeat navigation and form submission using the keyboard, and check the
   pages at a narrow screen width.
6. Create more than ten tasks, reload the list and scroll down. Check that more
   tasks load and that each task appears once. The "Load more" button also works
   with the keyboard. After the final page, the button disappears.

To check a network failure, load a form or task list, stop the server and submit
an action. The form should retain its values; a failed deletion should retain
the visible item. Both should show an error and re-enable the action. Restarting
the server clears all tasks, as described under Storage.

## Task list

The home page loads tasks on the server through a tRPC caller. Each request
reads the same in-memory store used by the HTTP API. Titles, optional descriptions
and creation dates for the first ten tasks are included in the initial HTML.
Dates are displayed in UTC.

Scrolling near the end loads the next ten tasks. A "Load more" button supports
keyboard use and browsers without IntersectionObserver. Loading is announced,
and failed requests preserve the loaded tasks and show a "Try again" button.
Creating, editing or deleting a task refreshes the first page and resets the
pagination. Scrolling can then load further pages again. Tasks added by another
browser appear after refreshing the list.

## Create tasks

Select "New task" on the home page. The form validates the title and description
with the same schemas used by the server. Saving sends a tRPC HTTP mutation,
disables the form while the request is pending and returns to the updated list
with a confirmation message. If saving fails, the entered values remain available
for another attempt. "Cancel" returns to the list without saving.

## Edit tasks

Select "Edit" on a task to open its form at `/tasks/<id>/edit`. The server loads
the current title and description before rendering the page. Saving replaces the
editable fields, keeps the ID and creation date and returns to the updated list
with a confirmation message. Clearing the description removes its text.

Editing uses the same validation and submission handling as creation. A failed
save preserves the entered values. An invalid or missing task ID shows a
"Task not found" page with a link back to the list. If a task is deleted while
its form is open, saving displays the API error without discarding the input.

## Delete tasks

Select "Delete" on a task and confirm in the browser dialog. Canceling leaves
the task unchanged. The button is disabled while the request is pending.
After deletion, the list refreshes and shows a confirmation message. A failed
request leaves the task visible, displays an error and allows another attempt.

## Task data

Schemas and input rules live in `src/lib/task-schema.ts`.
TypeScript types are inferred from the Zod schemas.

Field names follow the challenge statement: `id`, `titulo`, optional `descricao`
and `dataCriacao`. The ID is a UUID, and the creation date is an ISO 8601 timestamp
in UTC. Code identifiers, routes and procedure names use English. Only the data fields
`titulo`, `descricao` and `dataCriacao` retain the names from the challenge statement.

The title is trimmed and must contain 1 to 120 characters after trimming.
The description accepts up to 2,000 characters and preserves whitespace and line
breaks. Creation accepts only a title and description. Updates also
require the task ID and reject a replacement creation date. Extra fields are
rejected.

## Task API

The API uses tRPC at `/api/trpc` and validates input on the server.

### Create a task

`tasks.create` accepts `titulo` and an optional `descricao`. It returns the task
with an ID and creation date assigned by the server.

```sh
curl http://localhost:3000/api/trpc/tasks.create \
  -H 'Content-Type: application/json' \
  --data '{"titulo":"Review documentation","descricao":"Check the run commands."}'
```

The task is returned in `result.data`. Invalid input returns HTTP 400 with the
`BAD_REQUEST` code, an English message and field errors in `error.data.fieldErrors`.
Internal errors return a generic message without server details or stack traces.

### List tasks

`tasks.list` returns the most recent tasks first. Tasks with the same creation
date are sorted by ID in ascending order.

```sh
curl http://localhost:3000/api/trpc/tasks.list
```

The list is returned in `result.data`. An empty store returns `[]`.

### Read a task page

`tasks.listPage` is the query used by the interface. It accepts an empty object
for the first page and returns `{ items, nextCursor? }` in `result.data`.
Each page contains at most ten tasks in the same order as `tasks.list`.

```sh
curl --get http://localhost:3000/api/trpc/tasks.listPage \
  --data-urlencode 'input={}'
```

For the next page, send `{ cursor: nextCursor }` using the cursor from the
previous response. The cursor contains `id` and `dataCriacao`. If `nextCursor`
is absent, the end of the list has been reached. Invalid cursors and unexpected
input fields return HTTP 400 (`BAD_REQUEST`).

The cursor records the position in the creation-date and ID ordering rather
than an array offset. Deleting its task does not prevent continuation. Tasks
inserted before that position are included when the first page is refreshed.

### Find a task by ID

`tasks.findById` accepts an ID and returns the task in `result.data`.
Replace the sample UUID below with the ID returned when creating a task:

```sh
curl --get http://localhost:3000/api/trpc/tasks.findById \
  --data-urlencode 'input={"id":"550e8400-e29b-41d4-a716-446655440000"}'
```

An invalid UUID returns HTTP 400 (`BAD_REQUEST`). A valid UUID with no matching
task returns HTTP 404 (`NOT_FOUND`) with the message "Task not found."

### Update a task

`tasks.update` accepts `id`, `titulo` and an optional `descricao`.
It replaces the title and description while keeping the ID and creation date.
Omitting `descricao` clears the previous description; an empty string is also accepted.

```sh
curl http://localhost:3000/api/trpc/tasks.update \
  -H 'Content-Type: application/json' \
  --data '{"id":"550e8400-e29b-41d4-a716-446655440000","titulo":"Updated title","descricao":"Updated description"}'
```

Use the ID of an existing task. The response contains the updated task in
`result.data`. A missing task returns HTTP 404 (`NOT_FOUND`). Invalid input
returns HTTP 400 (`BAD_REQUEST`) and leaves the stored task unchanged.

### Delete a task

`tasks.delete` accepts an `id` and returns `{ id }` after removing the task.
Use the ID of an existing task:

```sh
curl http://localhost:3000/api/trpc/tasks.delete \
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
