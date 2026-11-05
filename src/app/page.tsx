import Link from "next/link";
import { TaskList } from "@/components/task-list";
import { appRouter } from "@/server/tasks-router";
import { createContext } from "@/server/trpc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { searchParams: Promise<{ notice?: string | string[] }> };

export default async function Home({ searchParams }: Props) {
  const parameters = await searchParams;
  const serverApi = appRouter.createCaller(createContext());
  const tasks = await serverApi.tasks.list();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
        <Link href="/tasks/new" className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">New task</Link>
      </div>
      {parameters.notice === "created" && <p role="status" className="mt-6 rounded-lg border border-green-700 bg-green-50 p-3 text-green-900">Task created.</p>}
      <TaskList tasks={tasks} />
    </main>
  );
}
