import { format } from "date-fns";
import TaskRow from "../TaskRow";
import type { MonthDay } from "../../hooks/useMonthTasks";
import type { Project, Space, Task } from "@sift/shared";

interface MonthTaskPanelProps {
  day: MonthDay;
  focusedTaskId: string | null;
  onTaskFocus: (taskId: string) => void;
  resolveTaskContext: (task: Task) => { project: Project; space: Space };
}

export default function MonthTaskPanel({
  day,
  focusedTaskId,
  onTaskFocus,
  resolveTaskContext,
}: MonthTaskPanelProps) {
  const total = day.active.length + day.completed.length;
  const doneCount = day.completed.length;

  return (
    <section
      className="border-t border-[0.5px] border-border bg-bg flex-1 min-h-0 overflow-y-auto"
      aria-label={`Tasks for ${format(day.date, "EEEE, MMMM d")}`}
      data-month-panel
    >
      <header className="flex items-baseline justify-between px-4 py-2.5 border-b border-[0.5px] border-border bg-surface">
        <h2 className="font-medium text-[13px] tracking-[-0.02em] text-text">
          {format(day.date, "EEE, MMM d")}
        </h2>
        <span className="font-mono text-[10px] text-muted">
          {total === 0
            ? "no tasks"
            : `${total} task${total === 1 ? "" : "s"} · ${doneCount} done`}
        </span>
      </header>

      {total === 0 ? (
        <p className="px-4 py-10 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
          No tasks for this day
        </p>
      ) : (
        <div role="list" className="min-w-0">
          {day.active.map((task, i) => (
            <div
              key={task.id}
              data-month-task-id={task.id}
              data-month-task-index={i}
            >
              <TaskRow
                task={task}
                project={resolveTaskContext(task).project}
                space={resolveTaskContext(task).space}
                isFocused={focusedTaskId === task.id}
                onFocus={() => onTaskFocus(task.id)}
                index={i}
                layout="week"
              />
            </div>
          ))}
          {day.active.length > 0 && day.completed.length > 0 && (
            <div className="mx-3 my-1 border-t border-[0.5px] border-border" />
          )}
          {day.completed.map((task, i) => {
            const idx = day.active.length + i;
            return (
              <div
                key={task.id}
                data-month-task-id={task.id}
                data-month-task-index={idx}
              >
                <TaskRow
                  task={task}
                  project={resolveTaskContext(task).project}
                  space={resolveTaskContext(task).space}
                  isFocused={focusedTaskId === task.id}
                  onFocus={() => onTaskFocus(task.id)}
                  index={idx}
                  layout="week"
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
