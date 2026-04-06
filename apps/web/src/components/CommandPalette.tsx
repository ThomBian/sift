import { useEffect, useRef, useMemo } from "react";
import { SmartInput, type ProjectWithSpace, type Task, type ChipFocus, type SmartInputValues } from "@speedy/shared";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import { db } from "../lib/db";
import { nanoid } from "nanoid";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId: string;
  editTask?: Task | null;
  editChip?: ChipFocus | null;
}

async function createTask(
  partial: Pick<Task, "title" | "dueDate" | "workingDate"> & { projectId?: string },
  defaultProjectId: string,
): Promise<void> {
  const now = new Date();
  await db.tasks.add({
    id: nanoid(),
    title: partial.title,
    projectId: partial.projectId ?? defaultProjectId,
    status: partial.workingDate ? "todo" : "inbox",
    workingDate: partial.workingDate ?? null,
    dueDate: partial.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    synced: false,
  });
}

async function updateTask(
  taskId: string,
  partial: Pick<Task, "title" | "dueDate" | "workingDate"> & { projectId?: string },
): Promise<void> {
  const patch: Partial<Task> = {
    title: partial.title,
    dueDate: partial.dueDate,
    workingDate: partial.workingDate,
    updatedAt: new Date(),
    synced: false,
  };
  if (partial.projectId !== undefined) patch.projectId = partial.projectId;
  if (partial.workingDate !== undefined) {
    patch.status = partial.workingDate !== null ? "todo" : "inbox";
  }
  await db.tasks.update(taskId, patch);
}

export default function CommandPalette({
  isOpen,
  onClose,
  defaultProjectId,
  editTask,
  editChip,
}: CommandPaletteProps) {
  const { spacesWithProjects } = useSpacesProjects();
  const inputRef = useRef<HTMLInputElement>(null);

  const projects: ProjectWithSpace[] = useMemo(
    () =>
      spacesWithProjects.flatMap(({ space, projects: ps }) =>
        ps.map((p) => ({ ...p, space })),
      ),
    [spacesWithProjects],
  );

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isEditing = editTask != null;

  const initialValues: SmartInputValues | undefined = isEditing
    ? {
        title: editTask.title,
        projectId: editTask.projectId,
        dueDate: editTask.dueDate,
        workingDate: editTask.workingDate,
      }
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/40"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[820px] border border-border bg-bg">
        <div className="flex items-center px-3 py-1.5 border-b border-border">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
            {isEditing ? `Editing · ${editTask.title}` : "New task"}
          </span>
          <span className="ml-auto font-mono text-[9px] text-dim">
            esc to close
          </span>
        </div>
        <SmartInput
          key={isEditing ? editTask.id : "new"}
          projects={projects}
          onTaskReady={async (partial) => {
            if (isEditing) {
              await updateTask(editTask.id, partial);
            } else {
              await createTask(partial, defaultProjectId);
            }
            onClose();
          }}
          inputRef={inputRef}
          initialValues={initialValues}
          initialFocus={editChip ?? undefined}
        />
      </div>
    </div>
  );
}
