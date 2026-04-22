import { format, isToday } from "date-fns";
import TaskRow from "../TaskRow";
import type { DayBucket } from "../../hooks/useWeekTasks";
import type { Project, Space, Task } from "@sift/shared";

interface DayColumnProps {
  dayIndex: number;
  bucket: DayBucket;
  resolveTaskContext: (task: Task) => { project: Project; space: Space };
  focusedTaskId: string | null;
  onTaskFocus: (taskId: string) => void;
}

function TaskItem({
  task,
  dayIndex,
  index,
  ctx,
  focusedTaskId,
  onTaskFocus,
}: {
  task: Task;
  dayIndex: number;
  index: number;
  ctx: { project: Project; space: Space };
  focusedTaskId: string | null;
  onTaskFocus: (id: string) => void;
}) {
  return (
    <div
      className="min-w-0 max-w-full"
      data-week-task-id={task.id}
      data-week-day-index={dayIndex}
    >
      <TaskRow
        task={task}
        project={ctx.project}
        space={ctx.space}
        isFocused={focusedTaskId === task.id}
        onFocus={() => onTaskFocus(task.id)}
        index={index}
        layout="week"
      />
    </div>
  );
}

export default function DayColumn({
  dayIndex,
  bucket,
  resolveTaskContext,
  focusedTaskId,
  onTaskFocus,
}: DayColumnProps) {
  const today = isToday(bucket.date);
  const hasTasks = bucket.active.length + bucket.completed.length > 0;

  return (
    <section
      className={`min-w-0 flex-1 border-r border-[0.5px] border-border last:border-r-0 ${today ? "bg-surface" : "bg-bg"}`}
      aria-label={
        hasTasks
          ? format(bucket.date, "EEEE, MMMM d")
          : `${format(bucket.date, "EEEE, MMMM d")} — no tasks`
      }
    >
      <div
        className={`px-3 py-2 border-b border-[0.5px] border-border outline-none transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-accent ${
          today
            ? "hover:bg-accent/[0.04]"
            : "hover:bg-surface-2"
        }`}
        tabIndex={0}
        data-week-day-header={dayIndex}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {today && (
            <span
              aria-hidden
              className="h-1 w-1 shrink-0 bg-accent shadow-hotkey motion-reduce:animate-none motion-safe:animate-week-today-glow"
            />
          )}
          <span
            className={`min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.12em] ${today ? "text-accent" : "text-muted"}`}
          >
            {format(bucket.date, "EEE MMM d")}
          </span>
        </div>
      </div>

      {hasTasks ? (
        <div className="min-w-0" role="list">
          {bucket.active.map((task, i) => (
            <TaskItem
              key={task.id}
              task={task}
              dayIndex={dayIndex}
              index={i}
              ctx={resolveTaskContext(task)}
              focusedTaskId={focusedTaskId}
              onTaskFocus={onTaskFocus}
            />
          ))}

          {bucket.active.length > 0 && bucket.completed.length > 0 && (
            <div className="mx-3 my-1 border-t border-[0.5px] border-border" />
          )}

          {bucket.completed.map((task, i) => (
            <TaskItem
              key={task.id}
              task={task}
              dayIndex={dayIndex}
              index={bucket.active.length + i}
              ctx={resolveTaskContext(task)}
              focusedTaskId={focusedTaskId}
              onTaskFocus={onTaskFocus}
            />
          ))}
        </div>
      ) : (
        <p className="motion-safe:animate-week-nudge px-3 py-10 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
          Nothing here
        </p>
      )}
    </section>
  );
}
