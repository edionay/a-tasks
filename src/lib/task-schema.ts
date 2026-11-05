import { z } from "zod";

export const TITLE_LIMIT = 120;
export const DESCRIPTION_LIMIT = 2_000;
export const TASK_PAGE_SIZE = 10;

const title = z
  .string({ error: "Enter a title." })
  .trim()
  .min(1, { error: "Enter a title." })
  .max(TITLE_LIMIT, {
    error: `Title must be at most ${TITLE_LIMIT} characters.`,
  });

const description = z
  .string({ error: "Description must be text." })
  .max(DESCRIPTION_LIMIT, {
    error: `Description must be at most ${DESCRIPTION_LIMIT} characters.`,
  })
  .optional();

const id = z.uuid({ error: "Enter a valid task ID." });

export const taskCreationSchema = z.strictObject(
  { titulo: title, descricao: description },
  { error: "Invalid task data or unexpected fields." },
);

export const taskIdSchema = z.strictObject(
  { id },
  { error: "Invalid task data or unexpected fields." },
);

export const taskUpdateSchema = taskCreationSchema.extend({ id });

export const taskSchema = taskCreationSchema.extend({
  id,
  dataCriacao: z.iso.datetime({
    error: "Enter a valid creation date in UTC.",
  }),
});

export type Task = z.infer<typeof taskSchema>;
export type TaskCreation = z.infer<typeof taskCreationSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;

export const taskCursorSchema = taskSchema.pick({ id: true, dataCriacao: true });
export const taskPageInputSchema = z.strictObject({
  cursor: taskCursorSchema.optional(),
});
export const taskPageSchema = z.strictObject({
  items: taskSchema.array().max(TASK_PAGE_SIZE),
  nextCursor: taskCursorSchema.optional(),
});

export type TaskCursor = z.infer<typeof taskCursorSchema>;
export type TaskPage = z.infer<typeof taskPageSchema>;
