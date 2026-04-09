import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { SmartInput, type ProjectWithSpace, type Task, type ChipFocus, type SmartInputValues } from "@sift/shared";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import { db } from "../lib/db";
import { nanoid } from "nanoid";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId: string;
  prefillProjectId?: string | null;
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
  prefillProjectId,
  editTask,
  editChip,
}: CommandPaletteProps) {
  const { spacesWithProjects } = useSpacesProjects();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const projects: ProjectWithSpace[] = useMemo(
    () =>
      spacesWithProjects.flatMap(({ space, projects: ps }) =>
        ps.map((p) => ({ ...p, space })),
      ),
    [spacesWithProjects],
  );

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      (triggerRef.current as HTMLElement | null)?.focus();
    }, 100);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      setIsClosing(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const isEditing = editTask != null;

  const initialValues: SmartInputValues | undefined = isEditing
    ? {
        title: editTask.title,
        projectId: editTask.projectId,
        dueDate: editTask.dueDate,
        workingDate: editTask.workingDate,
      }
    : prefillProjectId
      ? { projectId: prefillProjectId }
      : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[14vh] md:pt-[18vh] px-3 sm:px-4 bg-text/30 backdrop-blur-scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`${isClosing ? 'animate-palette-out' : 'animate-palette-in'} w-full max-w-[min(820px,calc(100vw-1.5rem))] border-[0.5px] border-border bg-bg/95 floating-panel shadow-panel`}
      >
        <div className="flex items-center px-3 py-1.5 border-b border-[0.5px] border-border">
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
          dropdownPosition="inline"
        />
      </div>
    </div>
  );
}
