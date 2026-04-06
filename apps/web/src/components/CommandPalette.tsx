import { useEffect, useRef, useMemo } from "react";
import { SmartInput, type ProjectWithSpace, type Task } from "@speedy/shared";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import { db } from "../lib/db";
import { nanoid } from "nanoid";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId: string;
}

async function createTask(
  partial: Pick<Task, "title" | "dueDate" | "workingDate"> & {
    projectId?: string;
  },
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

export default function CommandPalette({
  isOpen,
  onClose,
  defaultProjectId,
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
            New task
          </span>
          <span className="ml-auto font-mono text-[9px] text-dim">
            esc to close
          </span>
        </div>
        <SmartInput
          projects={projects}
          onTaskReady={async (partial) => {
            await createTask(partial, defaultProjectId);
            onClose();
          }}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
