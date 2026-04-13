import { useMemo } from "react";
import React from "react";
import { SmartInput, type ProjectWithSpace, type Task } from "@sift/shared";
import { db } from "../lib/db";
import { requestSync } from "../lib/requestSync";
import { nanoid } from "nanoid";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import { useTaskCounts } from "../hooks/useTasks";

interface InputBarProps {
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

async function handleTaskReady(
  partial: Pick<Task, "title" | "dueDate" | "workingDate" | "url" | "projectId">,
): Promise<void> {
  const now = new Date();
  await db.tasks.add({
    id: nanoid(),
    title: partial.title,
    projectId: partial.projectId,
    status: partial.workingDate ? "todo" : "inbox",
    workingDate: partial.workingDate ?? null,
    dueDate: partial.dueDate ?? null,
    url: partial.url ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    synced: false,
  });
  requestSync();
}

export default function InputBar({ inputRef }: InputBarProps) {
  const { spacesWithProjects } = useSpacesProjects();
  const taskCounts = useTaskCounts();

  const projects: ProjectWithSpace[] = useMemo(
    () =>
      spacesWithProjects.flatMap(({ space, projects: ps }) =>
        ps.map((p) => ({ ...p, space })),
      ),
    [spacesWithProjects],
  );

  return (
    <div className="border-b border-[0.5px] border-border bg-surface px-4 py-3">
      <SmartInput
        projects={projects}
        onTaskReady={(partial) => handleTaskReady(partial)}
        inputRef={inputRef}
        taskCounts={taskCounts}
      />
    </div>
  );
}
