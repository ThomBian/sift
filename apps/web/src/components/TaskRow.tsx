import type { Task, Project, Space } from '@speedy/shared';

export interface TaskRowProps {
  task: Task;
  project: Project;
  space: Space;
  isFocused: boolean;
  onFocus: () => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isLate(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return task.dueDate < today;
}

export default function TaskRow({ task, space, isFocused, onFocus }: TaskRowProps) {
  const late = isLate(task);

  return (
    <div
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
        flex items-center h-task-row px-3 gap-3 cursor-pointer select-none
        border-l-2 transition-colors
        ${isFocused ? 'border-accent bg-surface-2' : 'border-transparent hover:bg-surface-2/50'}
      `}
    >
      <span
        data-testid="space-dot"
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: space.color }}
      />

      <span
        className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-colors ${
          task.status === 'done'
            ? 'border-green bg-green/20'
            : 'border-border-2 hover:border-accent'
        }`}
      >
        {task.status === 'done' && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
            <path
              d="M1.5 4L3 5.5L6.5 2.5"
              stroke="#4ade80"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      <span
        className={`flex-1 text-sm truncate ${
          task.status === 'done' ? 'text-muted line-through' : 'text-text'
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
          className="text-muted hover:text-accent transition-colors shrink-0"
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
          className={`text-xs shrink-0 tabular-nums ${
            late ? 'text-red' : 'text-muted'
          }`}
        >
          {formatDate(task.dueDate)}
        </span>
      )}
    </div>
  );
}
