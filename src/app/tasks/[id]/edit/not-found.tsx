import Link from "next/link";

export default function TaskNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Task not found</h1>
      <p className="mt-4 text-slate-600">This task may have been deleted.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        Back to tasks
      </Link>
    </main>
  );
}
