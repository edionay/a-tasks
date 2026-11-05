"use client";

import { TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Task } from "@/lib/task-schema";
import { trpcClient } from "@/lib/trpc-client";

type Props = { task: Pick<Task, "id" | "titulo"> };

export function DeleteTaskButton({ task }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState("");
  const deletionInProgress = useRef(false);

  async function deleteTask() {
    if (deletionInProgress.current) return;
    if (!window.confirm(`Delete "${task.titulo}"? This cannot be undone.`)) return;

    deletionInProgress.current = true;
    setDeleting(true);
    setDeletionError("");

    try {
      await trpcClient.tasks.delete.mutate({ id: task.id });
      router.replace("/?notice=deleted", { scroll: false });
      router.refresh();
    } catch (error) {
      let message = "Unable to delete the task. Check your connection and try again.";
      if (error instanceof TRPCClientError && error.data) {
        message = error.message;
      }
      setDeletionError(message);
      deletionInProgress.current = false;
      setDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={deleteTask}
        disabled={deleting}
        aria-label={deleting ? `Deleting ${task.titulo}` : `Delete ${task.titulo}`}
        className="rounded-lg border border-red-700 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-60"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
      <p role="status" className="mt-2 text-sm text-slate-600">
        {deleting ? "Deleting task..." : ""}
      </p>
      {deletionError && (
        <p role="alert" className="mt-2 text-sm text-red-700">{deletionError}</p>
      )}
    </div>
  );
}
