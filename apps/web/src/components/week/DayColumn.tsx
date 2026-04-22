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
    <div data-week-task-id={task.id} data-week-day-index={dayIndex}>
      <TaskRow
        task={task}
        project={ctx.project}
        space={ctx.space}
        isFocused={focusedTaskId === task.id}
        onFocus={() => onTaskFocus(task.id)}
        index={index}
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

  return (
    <section
      className={`flex-1 border-r border-[0.5px] border-border last:border-r-0 ${today ? "bg-surface" : "bg-bg"}`}
      aria-label={format(bucket.date, "EEEE, MMMM d")}
    >
      <div
        className="px-3 py-2 border-b border-[0.5px] border-border outline-none focus-visible:ring-1 focus-visible:ring-accent"
        tabIndex={0}
        data-week-day-header={dayIndex}
      >
        <div className="flex items-center gap-1.5">
          {today && (
            <span
              aria-hidden
              className="w-1 h-1 shrink-0 bg-accent"
              style={{ boxShadow: "0 0 4px rgba(255,79,0,0.5)" }}
            />
          )}
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.12em] ${today ? "text-accent" : "text-muted"}`}
          >
            {format(bucket.date, "EEE MMM d")}
          </span>
        </div>
      </div>

      <div role="list">
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
          <div className="border-t border-[0.5px] border-border mx-3 my-1" />
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
    </section>
  );
}
