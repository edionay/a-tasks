import { initTRPC } from "@trpc/server";
import { flattenError, ZodError } from "zod";
import { armazenamentoTarefas } from "./tarefas-store";

export function criarContexto() {
  return { tarefas: armazenamentoTarefas };
}

type Contexto = ReturnType<typeof criarContexto>;

const trpc = initTRPC.context<Contexto>().create({
  errorFormatter({ shape, error }) {
    const erroValidacao =
      error.code === "BAD_REQUEST" && error.cause instanceof ZodError
        ? error.cause
        : null;
    let mensagem = shape.message;

    if (erroValidacao) {
      mensagem = erroValidacao.issues[0].message;
    } else if (error.code === "INTERNAL_SERVER_ERROR") {
      mensagem = "Não foi possível processar a solicitação.";
    } else if (error.code === "BAD_REQUEST") {
      mensagem = "Requisição inválida.";
    }

    return {
      ...shape,
      message: mensagem,
      data: {
        ...shape.data,
        stack: undefined,
        errosCampos: erroValidacao ? flattenError(erroValidacao).fieldErrors : null,
      },
    };
  },
});

export const criarRouter = trpc.router;
export const procedimento = trpc.procedure;
