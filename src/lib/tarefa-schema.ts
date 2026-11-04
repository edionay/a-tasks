import { z } from "zod";

export const LIMITE_TITULO = 120;
export const LIMITE_DESCRICAO = 2_000;

const titulo = z
  .string({ error: "Enter a title." })
  .trim()
  .min(1, { error: "Enter a title." })
  .max(LIMITE_TITULO, {
    error: `Title must be at most ${LIMITE_TITULO} characters.`,
  });

const descricao = z
  .string({ error: "Description must be text." })
  .max(LIMITE_DESCRICAO, {
    error: `Description must be at most ${LIMITE_DESCRICAO} characters.`,
  })
  .optional();

const id = z.uuid({ error: "Enter a valid task ID." });

export const schemaCriacaoTarefa = z.strictObject(
  { titulo, descricao },
  { error: "Invalid task data or unexpected fields." },
);

export const schemaIdentificacaoTarefa = z.strictObject(
  { id },
  { error: "Invalid task data or unexpected fields." },
);

export const schemaAtualizacaoTarefa = schemaCriacaoTarefa.extend({ id });

export const schemaTarefa = schemaCriacaoTarefa.extend({
  id,
  dataCriacao: z.iso.datetime({
    error: "Enter a valid creation date in UTC.",
  }),
});

export type Tarefa = z.infer<typeof schemaTarefa>;
export type CriacaoTarefa = z.infer<typeof schemaCriacaoTarefa>;
export type AtualizacaoTarefa = z.infer<typeof schemaAtualizacaoTarefa>;
