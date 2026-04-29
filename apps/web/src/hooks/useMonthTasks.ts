import {
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  endOfMonth,
} from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import {
  compareByCompletedAtThenProject,
  compareByDueDateThenProject,
} from "./useTasks";
import type { Task, Project } from "@sift/shared";
import type { WeekMode } from "./useWeekTasks";

export type { WeekMode };

export interface MonthDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  count: number;
  active: Task[];
  completed: Task[];
}

export interface MonthTasksResult {
  days: MonthDay[];
}

export function buildMonthDays(anchorMonth: Date): {
  date: Date;
  isCurrentMonth: boolean;
}[] {
  const monthStart = startOfMonth(anchorMonth);
  const monthEnd = endOfMonth(anchorMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  const cursor = new Date(gridStart);
  while (cursor.getTime() <= gridEnd.getTime()) {
    const day = startOfDay(cursor);
    cells.push({
      date: day,
      isCurrentMonth: day.getMonth() === monthStart.getMonth(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = startOfDay(new Date(last));
    next.setDate(next.getDate() + 1);
    cells.push({
      date: next,
      isCurrentMonth: next.getMonth() === monthStart.getMonth(),
    });
  }
  return cells.slice(0, 42);
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function placementKey(
  task: Task,
  mode: WeekMode,
  gridStartMs: number,
  gridEndMs: number,
): number | null {
  if (mode === "completed") {
    if (task.status !== "done" || task.completedAt == null) return null;
    const k = startOfDay(task.completedAt).getTime();
    return k >= gridStartMs && k <= gridEndMs ? k : null;
  }
  const date = mode === "working" ? task.workingDate : task.dueDate;
  if (date == null) return null;
  const k = startOfDay(date).getTime();
  return k >= gridStartMs && k <= gridEndMs ? k : null;
}

export function useMonthTasks(
  anchorMonth: Date,
  mode: WeekMode,
): MonthTasksResult {
  const cells = buildMonthDays(anchorMonth);
  const gridStartMs = cells[0].date.getTime();
  const gridEndMs = cells[cells.length - 1].date.getTime();
  const today = startOfDay(new Date());

  const days =
    useLiveQuery(async () => {
      const [tasks, projects] = await Promise.all([
        db.tasks.toArray(),
        db.projects.toArray(),
      ]);
      const projectsById = new Map<string, Project>(
        projects.map((p) => [p.id, p]),
      );

      const byKey = new Map<number, MonthDay>(
        cells.map(({ date, isCurrentMonth }) => [
          date.getTime(),
          {
            date,
            isCurrentMonth,
            isToday: isSameLocalDay(date, today),
            count: 0,
            active: [],
            completed: [],
          },
        ]),
      );

      for (const task of tasks) {
        if (task.status === "archived") continue;
        const k = placementKey(task, mode, gridStartMs, gridEndMs);
        if (k == null) continue;
        const cell = byKey.get(k);
        if (!cell) continue;
        if (mode === "completed") cell.completed.push(task);
        else if (task.status === "done") cell.completed.push(task);
        else if (task.status === "inbox" || task.status === "todo")
          cell.active.push(task);
      }

      for (const cell of byKey.values()) {
        cell.active.sort((a, b) =>
          compareByDueDateThenProject(a, b, projectsById),
        );
        cell.completed.sort((a, b) =>
          mode === "completed"
            ? compareByCompletedAtThenProject(a, b, projectsById)
            : compareByDueDateThenProject(a, b, projectsById),
        );
        cell.count = cell.active.length + cell.completed.length;
      }

      return cells.map(({ date }) => byKey.get(date.getTime())!);
    }, [gridStartMs, gridEndMs, mode]) ??
    cells.map(({ date, isCurrentMonth }) => ({
      date,
      isCurrentMonth,
      isToday: isSameLocalDay(date, today),
      count: 0,
      active: [],
      completed: [],
    }));

  return { days };
}
