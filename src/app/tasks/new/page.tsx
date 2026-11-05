import type { Metadata } from "next";
import { TaskForm } from "@/components/task-form";

export const metadata: Metadata = { title: "New task | Tasks" };

export default function NewTask() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">New task</h1>
      <TaskForm />
    </main>
  );
}
