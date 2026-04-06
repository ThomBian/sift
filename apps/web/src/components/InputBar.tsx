import { useMemo } from 'react';
import React from 'react';
import {
  SmartInput,
  type ProjectWithSpace,
  type Task,
} from '@speedy/shared';
import { db } from '../lib/db';
import { nanoid } from 'nanoid';
import { useSpacesProjects } from '../hooks/useSpacesProjects';

interface InputBarProps {
  defaultProjectId: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

async function handleTaskReady(
  partial: Pick<Task, 'title' | 'dueDate' | 'workingDate'> & { projectId?: string },
  defaultProjectId: string
): Promise<void> {
  const now = new Date();
  await db.tasks.add({
    id: nanoid(),
    title: partial.title,
    projectId: partial.projectId ?? defaultProjectId,
    status: partial.workingDate ? 'todo' : 'inbox',
    workingDate: partial.workingDate ?? null,
    dueDate: partial.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    synced: false,
  });
}

export default function InputBar({ defaultProjectId, inputRef }: InputBarProps) {
  const { spacesWithProjects } = useSpacesProjects();

  const projects: ProjectWithSpace[] = useMemo(
    () =>
      spacesWithProjects.flatMap(({ space, projects: ps }) =>
        ps.map((p) => ({ ...p, space }))
      ),
    [spacesWithProjects]
  );

  return (
    <div className="border-b border-border bg-surface px-4 py-3">
      <SmartInput
        projects={projects}
        onTaskReady={(partial) => handleTaskReady(partial, defaultProjectId)}
        inputRef={inputRef}
      />
    </div>
  );
}
