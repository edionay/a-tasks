import Link from "next/link";
import type { Task } from "@/lib/task-schema";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

type Props = { tasks: Task[] };

export function TaskList({ tasks }: Props) {
  if (tasks.length === 0) {
    return (
      <section
        aria-label="Task list"
        className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center"
      >
        <h2 className="text-lg font-medium">No tasks yet</h2>
        <p className="mt-2 text-sm text-slate-600">Tasks will appear here.</p>
      </section>
    );
  }

  return (
    <ul aria-label="Task list" className="mt-8 space-y-4">
      {tasks.map((task) => (
        <li key={task.id}>
          <article
            aria-labelledby={`task-${task.id}`}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <h2
              id={`task-${task.id}`}
              className="text-lg font-semibold wrap-anywhere"
            >
              {task.titulo}
            </h2>
            {task.descricao && (
              <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-600 wrap-anywhere">
                {task.descricao}
              </p>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Created{" "}
              <time dateTime={task.dataCriacao}>
                {dateFormatter.format(new Date(task.dataCriacao))} UTC
              </time>
            </p>
            <Link
              href={`/tasks/${task.id}/edit`}
              aria-label={`Edit ${task.titulo}`}
              className="mt-4 inline-block rounded-lg border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Edit
            </Link>
          </article>
        </li>
      ))}
    </ul>
  );
}
