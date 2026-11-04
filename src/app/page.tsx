import { TaskList } from "@/components/task-list";
import { appRouter } from "@/server/tasks-router";
import { createContext } from "@/server/trpc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const serverApi = appRouter.createCaller(createContext());
  const tasks = await serverApi.tasks.list();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
      <TaskList tasks={tasks} />
    </main>
  );
}
