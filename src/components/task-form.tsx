"use client";

import { TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { flattenError } from "zod";
import {
  DESCRIPTION_LIMIT,
  TITLE_LIMIT,
  taskCreationSchema,
  type Task,
} from "@/lib/task-schema";
import { trpcClient } from "@/lib/trpc-client";

type FieldErrors = { titulo?: string[]; descricao?: string[] };
type Props = { task?: Task };

export function TaskForm({ task }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(task?.titulo ?? "");
  const [description, setDescription] = useState(task?.descricao ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState("");
  const [saving, setSaving] = useState(false);
  const submissionInProgress = useRef(false);
  const titleField = useRef<HTMLInputElement>(null);
  const descriptionField = useRef<HTMLTextAreaElement>(null);

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInProgress.current) return;

    setSubmissionError("");
    const validation = taskCreationSchema.safeParse({ titulo: title, descricao: description });

    if (!validation.success) {
      const errors = flattenError(validation.error).fieldErrors;
      setFieldErrors(errors);
      if (errors.titulo) {
        titleField.current?.focus();
      } else {
        descriptionField.current?.focus();
      }
      return;
    }

    setFieldErrors({});
    submissionInProgress.current = true;
    setSaving(true);

    try {
      if (task) {
        await trpcClient.tasks.update.mutate({ id: task.id, ...validation.data });
        router.replace("/?notice=updated");
      } else {
        await trpcClient.tasks.create.mutate(validation.data);
        router.replace("/?notice=created");
      }
      router.refresh();
    } catch (error) {
      let message = "Unable to save the task. Check your connection and try again.";
      if (error instanceof TRPCClientError && error.data) {
        message = error.message;
      }
      setSubmissionError(message);
      submissionInProgress.current = false;
      setSaving(false);
    }
  }

  const fieldClassName = "mt-2 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:bg-slate-100";

  return (
    <form onSubmit={saveTask} noValidate className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
      <fieldset disabled={saving} className="space-y-6">
        <legend className="sr-only">Task details</legend>
        <div>
          <label htmlFor="title" className="font-medium">
            Title (required)
          </label>
          <p id="title-help" className="mt-1 text-sm text-slate-600">
            Up to {TITLE_LIMIT} characters.
          </p>
          <input
            ref={titleField}
            id="title"
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={Boolean(fieldErrors.titulo)}
            aria-describedby={
              fieldErrors.titulo ? "title-help title-error" : "title-help"
            }
            className={fieldClassName}
          />
          {fieldErrors.titulo && (
            <p id="title-error" className="mt-2 text-sm text-red-700">
              {fieldErrors.titulo[0]}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="description" className="font-medium">
            Description (optional)
          </label>
          <p id="description-help" className="mt-1 text-sm text-slate-600">
            Up to {DESCRIPTION_LIMIT.toLocaleString("en-US")} characters.
          </p>
          <textarea
            ref={descriptionField}
            id="description"
            name="description"
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={Boolean(fieldErrors.descricao)}
            aria-describedby={
              fieldErrors.descricao
                ? "description-help description-error"
                : "description-help"
            }
            className={fieldClassName}
          />
          {fieldErrors.descricao && (
            <p id="description-error" className="mt-2 text-sm text-red-700">
              {fieldErrors.descricao[0]}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60">
            {saving ? "Saving..." : "Save task"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-lg border border-slate-400 px-4 py-2 font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </fieldset>
      <p role="status" className="mt-4 text-sm text-slate-600">
        {saving ? "Saving task..." : ""}
      </p>
      {submissionError && (
        <p role="alert" className="mt-4 text-sm text-red-700">{submissionError}</p>
      )}
    </form>
  );
}
