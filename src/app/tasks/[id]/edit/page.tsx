import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaskForm } from "@/components/task-form";
import { taskIdSchema } from "@/lib/task-schema";
import { appRouter } from "@/server/tasks-router";
import { createContext } from "@/server/trpc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Edit task | Tasks" };

type Props = { params: Promise<{ id: string }> };

export default async function EditTask({ params }: Props) {
  const validation = taskIdSchema.safeParse(await params);
  if (!validation.success) notFound();

  const serverApi = appRouter.createCaller(createContext());
  let task;

  try {
    task = await serverApi.tasks.findById(validation.data);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Edit task</h1>
      <TaskForm key={task.id} task={task} />
    </main>
  );
}
