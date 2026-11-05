"use client";

import Link from "next/link";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeleteTaskButton } from "@/components/delete-task-button";
import type { TaskPage } from "@/lib/task-schema";
import { trpcClient } from "@/lib/trpc-client";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

type Props = { initialPage: TaskPage };

export function TaskList({ initialPage }: Props) {
  const [tasks, setTasks] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const loadingInProgress = useRef(false);
  const requestController = useRef<AbortController | null>(null);
  const loadTrigger = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTasks(initialPage.items);
    setNextCursor(initialPage.nextCursor);
    setLoadError("");
    setLoading(false);
    loadingInProgress.current = false;
    return () => requestController.current?.abort();
  }, [initialPage]);

  const loadMore = useCallback(async () => {
    if (loadingInProgress.current || !nextCursor) return;
    const controller = new AbortController();
    requestController.current = controller;
    loadingInProgress.current = true;
    setLoading(true);
    setLoadError("");

    try {
      const page = await trpcClient.tasks.listPage.query(
        { cursor: nextCursor },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setTasks((current) => {
        const loadedIds = new Set(current.map((task) => task.id));
        return [...current, ...page.items.filter((task) => !loadedIds.has(task.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      if (controller.signal.aborted) return;
      let message = "Unable to load more tasks. Check your connection and try again.";
      if (error instanceof TRPCClientError && error.data) message = error.message;
      setLoadError(message);
    } finally {
      if (!controller.signal.aborted) {
        loadingInProgress.current = false;
        setLoading(false);
      }
    }
  }, [nextCursor]);

  useEffect(() => {
    if (!nextCursor || loadError || !loadTrigger.current) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: "200px" });
    observer.observe(loadTrigger.current);
    return () => observer.disconnect();
  }, [nextCursor, loadError, loadMore]);

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
    <>
      <ul aria-label="Task list" aria-busy={loading} className="mt-8 space-y-4">
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
              <div className="mt-4 flex flex-wrap items-start gap-3">
                <Link
                  href={`/tasks/${task.id}/edit`}
                  aria-label={`Edit ${task.titulo}`}
                  className="rounded-lg border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  Edit
                </Link>
                <DeleteTaskButton task={task} />
              </div>
            </article>
          </li>
        ))}
      </ul>
      <div ref={loadTrigger} className="mt-6 text-center">
        <p role="status" className="text-sm text-slate-600">
          {loading ? "Loading more tasks..." : nextCursor
            ? `${tasks.length} tasks loaded.`
            : `All ${tasks.length} tasks loaded.`}
        </p>
        {loadError && <p role="alert" className="mt-3 text-sm text-red-700">{loadError}</p>}
        {nextCursor && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="mt-3 rounded-lg border border-slate-400 px-4 py-2 font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
          >
            {loading ? "Loading..." : loadError ? "Try again" : "Load more"}
          </button>
        )}
      </div>
    </>
  );
}
