import { z } from "zod";

export const LIMITE_TITULO = 120;
export const LIMITE_DESCRICAO = 2_000;

const titulo = z
  .string({ error: "Informe um título." })
  .trim()
  .min(1, { error: "Informe um título." })
  .max(LIMITE_TITULO, {
    error: `O título deve ter no máximo ${LIMITE_TITULO} caracteres.`,
  });

const descricao = z
  .string({ error: "A descrição deve ser um texto." })
  .max(LIMITE_DESCRICAO, {
    error: `A descrição deve ter no máximo ${LIMITE_DESCRICAO} caracteres.`,
  })
  .optional();

const id = z.uuid({ error: "Informe um identificador de tarefa válido." });

export const schemaCriacaoTarefa = z.strictObject(
  { titulo, descricao },
  { error: "Dados da tarefa inválidos ou com campos não permitidos." },
);

export const schemaIdentificacaoTarefa = z.strictObject(
  { id },
  { error: "Dados da tarefa inválidos ou com campos não permitidos." },
);

export const schemaAtualizacaoTarefa = schemaCriacaoTarefa.extend({ id });

export const schemaTarefa = schemaCriacaoTarefa.extend({
  id,
  dataCriacao: z.iso.datetime({
    error: "Informe uma data de criação válida em UTC.",
  }),
});

export type Tarefa = z.infer<typeof schemaTarefa>;
export type CriacaoTarefa = z.infer<typeof schemaCriacaoTarefa>;
export type AtualizacaoTarefa = z.infer<typeof schemaAtualizacaoTarefa>;
