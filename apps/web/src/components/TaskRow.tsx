import { useEffect, useRef } from 'react';
import type { Task, Project, Space } from '@sift/shared';

export interface TaskRowProps {
  task: Task;
  project: Project;
  space: Space;
  isFocused: boolean;
  onFocus: () => void;
  onToggle?: () => void;
  exiting?: boolean;
  index?: number;
  showProject?: boolean;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isLate(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  if (task.completedAt != null) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return task.dueDate < today;
}

export default function TaskRow({
  task,
  project,
  space,
  isFocused,
  onFocus,
  onToggle,
  exiting = false,
  index = 0,
  showProject = true,
}: TaskRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isFocused) rowRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [isFocused]);
  const late = isLate(task);
  // During exit animation, show the row as if it's done; archived tasks keep done visuals via completedAt
  const showDone =
    exiting || task.status === 'done' || (task.status === 'archived' && task.completedAt != null);

  const rowLabel =
    task.status === 'archived'
      ? showDone
        ? `${task.title}, completed, archived`
        : `${task.title}, archived`
      : showDone
        ? `${task.title}, completed`
        : `${task.title}, task`;

  const completeToggleVisual = `border-[0.5px] shrink-0 flex items-center justify-center transition-colors ${
    showDone
      ? 'border-green bg-green/10 text-green'
      : 'border-border-2 hover:border-accent'
  }`;

  return (
    <div
      ref={rowRef}
      role="listitem"
      tabIndex={0}
      aria-label={rowLabel}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFocus();
        }
      }}
      className={`
        ${exiting ? 'animate-task-exit' : 'animate-task-enter'}
        flex items-center min-h-11 h-auto md:h-task-row md:min-h-0 px-3 gap-3 cursor-pointer select-none min-w-0
        transition-colors duration-150
        ${isFocused
          ? 'bg-accent/5 laser-focus'
          : 'hover:bg-surface-2'
        }
      `}
      style={{ animationDelay: exiting || late ? undefined : `${Math.min(index * 25, 150)}ms` }}
    >
      <span
        data-testid="space-dot"
        className="w-2 h-2 shrink-0"
        style={{ backgroundColor: space.color }}
        aria-hidden="true"
      />

      {onToggle ? (
        <button
          type="button"
          aria-pressed={showDone}
          aria-label={showDone ? 'Mark as not done' : 'Mark complete'}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`${completeToggleVisual} min-w-11 min-h-11 md:min-w-0 md:min-h-0 md:w-4 md:h-4`}
        >
          {showDone && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <path
                d="M1.5 4L3 5.5L6.5 2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      ) : (
        <span className={`${completeToggleVisual} w-4 h-4`} aria-hidden="true">
          {showDone && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <path
                d="M1.5 4L3 5.5L6.5 2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      )}

      <span
        className={`flex-1 text-sm font-medium tracking-[-0.02em] truncate ${
          showDone
            ? 'text-muted line-through'
            : 'text-text'
        }`}
      >
        {task.title}
      </span>

      {task.sourceUrl && (
        <a
          href={task.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="source-url-icon"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 transition-colors text-muted hover:text-accent"
          title={task.sourceUrl}
          aria-label="Visit source"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M7 1h4m0 0v4m0-4L5 7"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      )}

      {showProject && (
        <span
          data-testid="project-label"
          className="shrink-0 flex items-center gap-1 max-w-[10rem] min-w-0 text-muted"
        >
          {project.emoji ? (
            <span className="shrink-0 text-sm leading-none" aria-hidden="true">
              {project.emoji}
            </span>
          ) : null}
          <em className="font-sans text-sm font-medium tracking-[-0.02em] italic truncate">{project.name}</em>
        </span>
      )}

      {task.dueDate && (
        <span
          data-testid="due-date"
          className={`text-xs shrink-0 tabular-nums font-mono inline-flex items-center gap-1 ${
            late ? 'text-red font-medium' : 'text-muted'
          }`}
        >
          {late && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M5 1L9.33 8.5H0.67L5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M5 4.5V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="5" cy="7.25" r="0.5" fill="currentColor" />
            </svg>
          )}
          {formatDate(task.dueDate)}
        </span>
      )}
    </div>
  );
}
