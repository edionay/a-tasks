export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Tarefas</h1>
      <section
        aria-label="Lista de tarefas"
        className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center"
      >
        <h2 className="text-lg font-medium">Nenhuma tarefa cadastrada</h2>
        <p className="mt-2 text-sm text-slate-600">
          As tarefas serão exibidas aqui.
        </p>
      </section>
    </main>
  );
}
