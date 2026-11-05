import { TRPCError } from "@trpc/server";
import {
  taskUpdateSchema,
  taskCreationSchema,
  taskIdSchema,
  taskSchema,
  taskPageInputSchema,
  taskPageSchema,
} from "@/lib/task-schema";
import { createRouter, procedure } from "./trpc";

const tasksRouter = createRouter({
  create: procedure
    .input(taskCreationSchema)
    .output(taskSchema)
    .mutation(({ ctx: context, input: input }) => context.tasks.create(input)),

  update: procedure
    .input(taskUpdateSchema)
    .output(taskSchema)
    .mutation(({ ctx: context, input: input }) => {
      const task = context.tasks.update(input);

      if (task === undefined) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      return task;
    }),

  delete: procedure
    .input(taskIdSchema)
    .output(taskIdSchema)
    .mutation(({ ctx: context, input: input }) => {
      const deleted = context.tasks.delete(input.id);

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      return { id: input.id };
    }),

  list: procedure
    .output(taskSchema.array())
    .query(({ ctx: context }) => context.tasks.list()),

  listPage: procedure
    .input(taskPageInputSchema)
    .output(taskPageSchema)
    .query(({ ctx: context, input }) => context.tasks.listPage(input.cursor)),

  findById: procedure
    .input(taskIdSchema)
    .output(taskSchema)
    .query(({ ctx: context, input: input }) => {
      const task = context.tasks.findById(input.id);

      if (task === undefined) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      return task;
    }),
});

export const appRouter = createRouter({ tasks: tasksRouter });
export type AppRouter = typeof appRouter;
