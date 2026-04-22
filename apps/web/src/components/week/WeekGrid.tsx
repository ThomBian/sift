import DayColumn from "./DayColumn";
import type { DayBucket } from "../../hooks/useWeekTasks";
import type { Project, Space, Task } from "@sift/shared";

interface WeekGridProps {
  days: DayBucket[];
  focusedTaskId: string | null;
  onTaskFocus: (taskId: string) => void;
  resolveTaskContext: (
    task: Task,
  ) => {
    project: Project;
    space: Space;
  };
}

export default function WeekGrid({
  days,
  focusedTaskId,
  onTaskFocus,
  resolveTaskContext,
}: WeekGridProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-stretch" style={{ minWidth: "980px" }}>
        {days.map((bucket, dayIndex) => (
          <DayColumn
            key={bucket.date.toISOString()}
            dayIndex={dayIndex}
            bucket={bucket}
            focusedTaskId={focusedTaskId}
            onTaskFocus={onTaskFocus}
            resolveTaskContext={resolveTaskContext}
          />
        ))}
      </div>
    </div>
  );
}
