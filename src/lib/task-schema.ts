import { z } from "zod";

export const TITLE_LIMIT = 120;
export const DESCRIPTION_LIMIT = 2_000;

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
