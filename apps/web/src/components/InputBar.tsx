import { useMemo } from "react";
import React from "react";
import {
  SmartInput,
  type ProjectWithSpace,
  type TaskDraftPayload,
} from "@sift/shared";
import { db } from "../lib/db";
import { requestSync } from "../lib/requestSync";
import { nanoid } from "nanoid";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import { useTaskCounts } from "../hooks/useTasks";
import { resolveTaskProjectId } from "../lib/createProjectForTask";
import type { SpaceWithProjects } from "../hooks/useSpacesProjects";

interface InputBarProps {
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

async function handleTaskReady(
  partial: TaskDraftPayload,
  spacesWithProjects: SpaceWithProjects[],
): Promise<void> {
  const projectId = await resolveTaskProjectId(partial, spacesWithProjects);
  const { newProjectName: _np, ...fields } = partial;
  const now = new Date();
  await db.tasks.add({
    id: nanoid(),
    title: fields.title,
    projectId,
    status: fields.workingDate ? "todo" : "inbox",
    workingDate: fields.workingDate ?? null,
    dueDate: fields.dueDate ?? null,
    url: fields.url ?? null,
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
        onTaskReady={(partial) =>
          handleTaskReady(partial, spacesWithProjects)
        }
        inputRef={inputRef}
        taskCounts={taskCounts}
      />
    </div>
  );
}
