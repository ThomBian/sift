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
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function isLate(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return task.dueDate < TODAY;
}

export default function TaskRow({ task, space, isFocused, onFocus, onToggle, exiting = false, index = 0 }: TaskRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isFocused) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isFocused]);
  const late = isLate(task);
  // During exit animation, show the row as if it's done
  const showDone = exiting || task.status === 'done';

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFocus();
        }
      }}
      className={`
        ${exiting ? 'animate-task-exit' : 'animate-task-enter'}
        ${late ? 'animate-late-breathe' : ''}
        flex items-center h-task-row px-3 gap-3 cursor-pointer select-none
        border-l-2 transition-colors duration-150
        ${late
          ? 'bg-red border-red'
          : isFocused
            ? 'border-accent bg-[#FF4F00]/5 laser-focus'
            : 'border-transparent hover:bg-surface-2'
        }
      `}
      style={{ animationDelay: exiting || late ? undefined : `${index * 25}ms` }}
    >
      <span
        data-testid="space-dot"
        className="w-2 h-2 shrink-0"
        style={{ backgroundColor: late ? '#FFFFFF' : space.color }}
      />

      <span
        onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
        className={`w-4 h-4 border shrink-0 flex items-center justify-center transition-colors ${
          showDone
            ? late
              ? 'border-white bg-white/20'
              : 'border-green bg-green/10'
            : late
              ? 'border-white hover:border-white/60'
              : 'border-border-2 hover:border-accent'
        }`}
      >
        {showDone && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
            <path
              d="M1.5 4L3 5.5L6.5 2.5"
              stroke={late ? '#FFFFFF' : '#16A34A'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      <span
        className={`flex-1 text-sm font-medium tracking-[-0.02em] truncate ${
          late
            ? 'text-white'
            : showDone
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
          className={`shrink-0 transition-colors ${late ? 'text-white/70 hover:text-white' : 'text-muted hover:text-accent'}`}
          title={task.sourceUrl}
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

      {task.dueDate && (
        <span
          data-testid="due-date"
          className={`text-xs shrink-0 tabular-nums font-mono ${
            late ? 'text-white font-medium' : 'text-muted'
          }`}
        >
          {formatDate(task.dueDate)}
        </span>
      )}
    </div>
  );
}
