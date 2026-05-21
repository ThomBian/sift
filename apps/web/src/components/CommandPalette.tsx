import { useEffect, useRef, useMemo } from "react";
import {
  SmartInput,
  type ProjectWithSpace,
  type Task,
  type ChipFocus,
  type SmartInputValues,
  type TaskDraftPayload,
} from "@sift/shared";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import { useTaskCounts } from "../hooks/useTasks";
import { db } from "../lib/db";
import { requestSync } from "../lib/requestSync";
import { resolveTaskProjectId } from "../lib/createProjectForTask";
import { nanoid } from "nanoid";
import PaletteShell, { usePaletteClose } from "./PaletteShell";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  prefillProjectId?: string | null;
  editTask?: Task | null;
  editChip?: ChipFocus | null;
}

async function createTask(
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

async function updateTask(
  taskId: string,
  partial: Pick<Task, "title" | "dueDate" | "workingDate" | "url" | "projectId">,
): Promise<void> {
  const patch: Partial<Task> = {
    title: partial.title,
    dueDate: partial.dueDate,
    workingDate: partial.workingDate,
    url: partial.url ?? null,
    projectId: partial.projectId,
    updatedAt: new Date(),
    synced: false,
  };
  if (partial.workingDate !== undefined) {
    patch.status = partial.workingDate !== null ? "todo" : "inbox";
  }
  await db.tasks.update(taskId, patch);
  requestSync();
}

export default function CommandPalette({
  isOpen,
  onClose,
  prefillProjectId,
  editTask,
  editChip,
}: CommandPaletteProps) {
  const { spacesWithProjects } = useSpacesProjects();
  const taskCounts = useTaskCounts();
  const inputRef = useRef<HTMLInputElement>(null);
  const { isClosing, handleClose, captureTrigger } = usePaletteClose(onClose);

  const projects: ProjectWithSpace[] = useMemo(
    () =>
      spacesWithProjects.flatMap(({ space, projects: ps }) =>
        ps.map((p) => ({ ...p, space })),
      ),
    [spacesWithProjects],
  );

  useEffect(() => {
    if (isOpen) {
      captureTrigger();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, captureTrigger]);

  if (!isOpen && !isClosing) return null;

  const isEditing = editTask != null;

  const initialValues: Partial<SmartInputValues> | undefined = isEditing
    ? {
        title: editTask.title,
        projectId: editTask.projectId,
        dueDate: editTask.dueDate,
        workingDate: editTask.workingDate,
        url: editTask.url ?? null,
      }
    : prefillProjectId
      ? { projectId: prefillProjectId }
      : undefined;

  return (
    <PaletteShell
      title={isEditing ? `Editing · ${editTask.title}` : "New task"}
      isClosing={isClosing}
      onClose={handleClose}
    >
      <SmartInput
        key={isEditing ? editTask.id : "new"}
        projects={projects}
        onTaskReady={async (partial: TaskDraftPayload) => {
          const projectId = await resolveTaskProjectId(
            partial,
            spacesWithProjects,
          );
          const { newProjectName: _np, ...fields } = partial;
          if (isEditing) {
            await updateTask(editTask.id, { ...fields, projectId });
          } else {
            await createTask({ ...fields, projectId });
          }
          onClose();
        }}
        inputRef={inputRef}
        initialValues={initialValues}
        initialFocus={editChip ?? undefined}
        dropdownPosition="inline"
        taskCounts={taskCounts}
      />
    </PaletteShell>
  );
}
