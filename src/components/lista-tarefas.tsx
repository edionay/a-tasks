import type { Tarefa } from "@/lib/tarefa-schema";

const formatadorData = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

type Propriedades = { tarefas: Tarefa[] };

export function ListaTarefas({ tarefas }: Propriedades) {
  if (tarefas.length === 0) {
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
      {tarefas.map((tarefa) => (
        <li key={tarefa.id}>
          <article
            aria-labelledby={`task-${tarefa.id}`}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <h2
              id={`task-${tarefa.id}`}
              className="text-lg font-semibold wrap-anywhere"
            >
              {tarefa.titulo}
            </h2>
            {tarefa.descricao && (
              <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-600 wrap-anywhere">
                {tarefa.descricao}
              </p>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Created{" "}
              <time dateTime={tarefa.dataCriacao}>
                {formatadorData.format(new Date(tarefa.dataCriacao))} UTC
              </time>
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
}
