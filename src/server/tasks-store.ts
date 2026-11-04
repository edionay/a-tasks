import { randomUUID } from "node:crypto";
import type { TaskUpdate, TaskCreation, Task } from "@/lib/task-schema";

export function createTaskStore() {
  const tasks = new Map<string, Task>();

  return {
    create(input: TaskCreation): Task {
      const task: Task = {
        ...input,
        id: randomUUID(),
        dataCriacao: new Date().toISOString(),
      };

      tasks.set(task.id, task);
      return { ...task };
    },

    list(): Task[] {
      return Array.from(tasks.values())
        .sort((first, second) => {
          const dateDifference =
            Date.parse(second.dataCriacao) - Date.parse(first.dataCriacao);

          if (dateDifference !== 0) {
            return dateDifference;
          }

          return first.id.localeCompare(second.id);
        })
        .map((task) => ({ ...task }));
    },

    update(input: TaskUpdate): Task | undefined {
      const task = tasks.get(input.id);

      if (task === undefined) {
        return undefined;
      }

      const updated: Task = {
        id: task.id,
        titulo: input.titulo,
        descricao: input.descricao,
        dataCriacao: task.dataCriacao,
      };

      tasks.set(task.id, updated);
      return { ...updated };
    },

    delete(id: string): boolean {
      return tasks.delete(id);
    },

    findById(id: string): Task | undefined {
      const task = tasks.get(id);

      if (task === undefined) {
        return undefined;
      }

      return { ...task };
    },
  };
}

export type TaskStore = ReturnType<typeof createTaskStore>;

const globalState = globalThis as typeof globalThis & {
  taskStore?: TaskStore;
};

if (
  globalState.taskStore === undefined ||
  globalState.taskStore === null
) {
  globalState.taskStore = createTaskStore();
}

export const taskStore = globalState.taskStore;
