import { useMemo } from 'react';
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

export default function InputBar({ defaultProjectId }: InputBarProps) {
  const { spacesWithProjects } = useSpacesProjects();

  const projects: ProjectWithSpace[] = useMemo(
    () =>
      spacesWithProjects.flatMap(({ space, projects: ps }) =>
        ps.map((p) => ({ ...p, space }))
      ),
    [spacesWithProjects]
  );

  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      <SmartInput
        projects={projects}
        onTaskReady={(partial) => handleTaskReady(partial, defaultProjectId)}
      />
    </div>
  );
}
