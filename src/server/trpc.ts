import { initTRPC } from "@trpc/server";
import { flattenError, ZodError } from "zod";
import { taskStore } from "./tasks-store";

export function createContext() {
  return { tasks: taskStore };
}

type Context = ReturnType<typeof createContext>;

const trpc = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const validationError =
      error.code === "BAD_REQUEST" && error.cause instanceof ZodError
        ? error.cause
        : null;
    let message = shape.message;

    if (validationError) {
      message = validationError.issues[0].message;
    } else if (error.code === "INTERNAL_SERVER_ERROR") {
      message = "Unable to process the request.";
    } else if (error.code === "BAD_REQUEST") {
      message = "Invalid request.";
    }

    return {
      ...shape,
      message,
      data: {
        ...shape.data,
        stack: undefined,
        fieldErrors: validationError ? flattenError(validationError).fieldErrors : null,
      },
    };
  },
});

export const createRouter = trpc.router;
export const procedure = trpc.procedure;
