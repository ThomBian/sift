import { useState, useMemo } from 'react';
import TaskRow from './TaskRow';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import type { Task, Project, Space } from '@sift/shared';

interface TaskListProps {
  tasks: Task[];
  focusedId: string | null;
  onFocus: (id: string) => void;
  onToggle?: (task: Task) => void;
  exitingIds?: Set<string>;
}

export default function TaskList({ tasks, focusedId, onFocus, onToggle, exitingIds }: TaskListProps) {
  const [doneExpanded, setDoneExpanded] = useState(false);
  const { spacesWithProjects } = useSpacesProjects();

  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  const projectMap = useMemo(() => {
    const map = new Map<string, { project: Project; space: Space }>();
    for (const { space, projects } of spacesWithProjects) {
      for (const project of projects) {
        map.set(project.id, { project, space });
      }
    }
    return map;
  }, [spacesWithProjects]);

  return (
    <div className="flex-1">
      {activeTasks.length === 0 && doneTasks.length === 0 && (
        <p className="font-mono text-[11px] text-dim px-4 py-8 text-center uppercase tracking-[0.1em]">No tasks.</p>
      )}

      {activeTasks.map((task, i) => {
        const ctx = projectMap.get(task.projectId);
        if (!ctx) return null;
        return (
          <TaskRow
            key={task.id}
            task={task}
            project={ctx.project}
            space={ctx.space}
            isFocused={focusedId === task.id}
            onFocus={() => onFocus(task.id)}
            onToggle={onToggle ? () => onToggle(task) : undefined}
            exiting={exitingIds?.has(task.id)}
            index={i}
          />
        );
      })}

      {doneTasks.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setDoneExpanded((v) => !v)}
            className="flex items-center gap-2 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-dim hover:text-text transition-colors w-full"
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
              const ctx = projectMap.get(task.projectId);
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
