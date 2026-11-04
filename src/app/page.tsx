export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
      <section
        aria-label="Task list"
        className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center"
      >
        <h2 className="text-lg font-medium">No tasks yet</h2>
        <p className="mt-2 text-sm text-slate-600">
          Tasks will appear here.
        </p>
      </section>
    </main>
  );
}
