import { useState } from 'react';
import TaskRow from './TaskRow';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import type { Task } from '@speedy/shared';

interface TaskListProps {
  tasks: Task[];
  focusedId: string | null;
  onFocus: (id: string) => void;
}

export default function TaskList({ tasks, focusedId, onFocus }: TaskListProps) {
  const [doneExpanded, setDoneExpanded] = useState(false);
  const { spacesWithProjects } = useSpacesProjects();

  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  function getProjectAndSpace(task: Task) {
    for (const { space, projects } of spacesWithProjects) {
      const project = projects.find((p) => p.id === task.projectId);
      if (project) return { project, space };
    }
    return null;
  }

  return (
    <div className="flex-1">
      {activeTasks.length === 0 && doneTasks.length === 0 && (
        <p className="text-muted text-sm px-4 py-8 text-center">No tasks here.</p>
      )}

      {activeTasks.map((task) => {
        const ctx = getProjectAndSpace(task);
        if (!ctx) return null;
        return (
          <TaskRow
            key={task.id}
            task={task}
            project={ctx.project}
            space={ctx.space}
            isFocused={focusedId === task.id}
            onFocus={() => onFocus(task.id)}
          />
        );
      })}

      {doneTasks.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setDoneExpanded((v) => !v)}
            className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted hover:text-text transition-colors w-full"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className={`transition-transform ${doneExpanded ? '' : '-rotate-90'}`}
              aria-hidden="true"
            >
              <path
                d="M2 3.5L5 6.5L8 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            Done · {doneTasks.length}
          </button>

          {doneExpanded &&
            doneTasks.map((task) => {
              const ctx = getProjectAndSpace(task);
              if (!ctx) return null;
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={ctx.project}
                  space={ctx.space}
                  isFocused={focusedId === task.id}
                  onFocus={() => onFocus(task.id)}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
