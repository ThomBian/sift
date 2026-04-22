import { useEffect, useRef } from "react";
import type { Task, Project, Space } from "@sift/shared";

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
  /** Narrow columns: title on first line, project + due stacked with truncation. */
  layout?: "default" | "week";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isLate(task: Task): boolean {
  if (!task.dueDate || task.status === "done") return false;
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
  layout = "default",
}: TaskRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isFocused) rowRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [isFocused]);
  const late = isLate(task);
  // During exit animation, show the row as if it's done; archived tasks keep done visuals via completedAt
  const showDone =
    exiting ||
    task.status === "done" ||
    (task.status === "archived" && task.completedAt != null);

  const rowLabel =
    task.status === "archived"
      ? showDone
        ? `${task.title}, completed, archived`
        : `${task.title}, archived`
      : showDone
        ? `${task.title}, completed`
        : `${task.title}, task`;

  const completeToggleVisual = `border-[0.5px] shrink-0 flex items-center justify-center transition-colors ${
    showDone
      ? "border-green bg-green/10 text-green"
      : "border-border-2 hover:border-accent"
  }`;

  const rowShellClass =
    layout === "week"
      ? `
        ${exiting ? "animate-task-exit" : "animate-task-enter"}
        flex min-h-11 h-auto px-3 gap-3 cursor-pointer select-none min-w-0 w-full max-w-full
        items-start py-1.5
        transition-colors duration-150
        ${isFocused ? "bg-accent/5 laser-focus" : "hover:bg-surface-2"}
      `
      : `
        ${exiting ? "animate-task-exit" : "animate-task-enter"}
        flex min-h-11 h-auto md:h-task-row md:min-h-0 px-3 gap-3 cursor-pointer select-none min-w-0 w-full max-w-full
        items-center
        transition-colors duration-150
        ${isFocused ? "bg-accent/5 laser-focus" : "hover:bg-surface-2"}
      `;

  const titleClass = `text-sm font-medium tracking-[-0.02em] truncate min-w-0 ${
    showDone ? "text-muted line-through" : "text-text"
  }`;

  const dueBlock = task.dueDate ? (
    <span
      data-testid="due-date"
      className={`text-[10px] shrink-0 tabular-nums font-mono font-normal inline-flex items-center gap-1 ${
        late ? "text-red font-medium" : "text-muted"
      }`}
    >
      {late && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 1L9.33 8.5H0.67L5 1Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M5 4.5V6"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="5" cy="7.25" r="0.5" fill="currentColor" />
        </svg>
      )}
      {formatDate(task.dueDate)}
    </span>
  ) : null;

  const projectBlock =
    showProject && (
      <span
        data-testid="project-label"
        className={
          layout === "week"
            ? `flex min-w-0 flex-1 items-center gap-1.5 font-mono text-[10px] font-normal ${
                showDone ? "text-dim" : "text-muted"
              }`
            : `shrink-0 flex items-center gap-1.5 max-w-40 min-w-0 font-mono text-[10px] font-normal truncate ${
                showDone ? "text-dim" : "text-muted"
              }`
        }
      >
        {project.emoji ? (
          <span
            className="shrink-0 text-[12px] leading-none font-sans"
            aria-hidden="true"
          >
            {project.emoji}
          </span>
        ) : null}
        <span className="min-w-0 truncate">{project.name}</span>
      </span>
    );

  const urlBlock = task.url ? (
    <a
      href={task.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="url-icon"
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 flex items-center justify-center min-w-11 min-h-11 md:min-w-0 md:min-h-0 text-muted hover:text-accent transition-colors duration-150"
      title={task.url}
      aria-label="Open link in new tab"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M7 1h4m0 0v4m0-4L5 7"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  ) : null;

  const toggleBlock = onToggle ? (
    <button
      type="button"
      aria-pressed={showDone}
      aria-label={showDone ? "Mark as not done" : "Mark complete"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`${completeToggleVisual} min-w-11 min-h-11 md:min-w-0 md:min-h-0 md:w-4 md:h-4 ${layout === "week" ? "mt-0.5" : ""}`}
    >
      {showDone && (
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden="true"
        >
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
    <span className={`${completeToggleVisual} w-4 h-4 ${layout === "week" ? "mt-0.5" : ""}`} aria-hidden="true">
      {showDone && (
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden="true"
        >
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
  );

  return (
    <div
      ref={rowRef}
      role="listitem"
      tabIndex={0}
      aria-label={rowLabel}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFocus();
        }
      }}
      className={rowShellClass}
      style={{
        animationDelay:
          exiting || late ? undefined : `${Math.min(index * 25, 150)}ms`,
      }}
    >
      <span
        data-testid="space-dot"
        className={
          layout === "week"
            ? "mt-1.5 w-2 h-2 shrink-0"
            : "w-2 h-2 shrink-0"
        }
        style={{ backgroundColor: space.color }}
        aria-hidden="true"
      />

      {layout === "week" ? (
        <div className="mt-0.5 shrink-0">{toggleBlock}</div>
      ) : (
        toggleBlock
      )}

      {layout === "week" ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-visible py-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <span title={task.title} className={`min-w-0 flex-1 ${titleClass}`}>
              {task.title}
            </span>
            {urlBlock}
          </div>
          {(showProject || task.dueDate) && (
            <div className="flex min-w-0 items-center gap-2 overflow-x-hidden overflow-y-visible">
              {projectBlock}
              {dueBlock}
            </div>
          )}
        </div>
      ) : (
        <>
          <span title={task.title} className={`flex-1 ${titleClass}`}>
            {task.title}
          </span>
          {urlBlock}
          {projectBlock}
          {dueBlock}
        </>
      )}
    </div>
  );
}
