import { useEffect, useState } from "react";
import { endOfWeek, startOfDay, startOfWeek } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { compareByDueDateThenProject } from "./useTasks";
import type { Task, Project } from "@sift/shared";

export type WeekMode = "working" | "due";

export interface DayBucket {
  date: Date;
  active: Task[];
  completed: Task[];
}

export interface WeekTasksResult {
  days: DayBucket[];
}

function localCalendarDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function useLocalCalendarDayKey(): string {
  const [key, setKey] = useState(() => localCalendarDayKey(new Date()));
  useEffect(() => {
    const sync = () => {
      const next = localCalendarDayKey(new Date());
      setKey((prev) => (prev === next ? prev : next));
    };
    const id = window.setInterval(sync, 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return key;
}

function buildWeekDays(anchorMonday: Date): Date[] {
  const weekStart = startOfWeek(startOfDay(anchorMonday), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });
}

function taskDayKey(task: Task, mode: WeekMode): number | null {
  const date = mode === "working" ? task.workingDate : task.dueDate;
  if (date === null) return null;
  return startOfDay(date).getTime();
}

export function useWeekTasks(
  anchorMonday: Date,
  mode: WeekMode,
): WeekTasksResult {
  const calendarDayKey = useLocalCalendarDayKey();
  const weekStart = startOfWeek(startOfDay(anchorMonday), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const days =
    useLiveQuery(async () => {
      const [tasks, projects] = await Promise.all([
        db.tasks.toArray(),
        db.projects.toArray(),
      ]);
      const projectsById = new Map<string, Project>(
        projects.map((p) => [p.id, p]),
      );
      const weekDays = buildWeekDays(weekStart);
      const byDay = new Map<number, DayBucket>(
        weekDays.map((day) => [
          day.getTime(),
          { date: day, active: [], completed: [] },
        ]),
      );

      for (const task of tasks) {
        if (task.status === "archived") continue;
        const key = taskDayKey(task, mode);
        if (key === null) continue;
        if (key < weekStart.getTime() || key > weekEnd.getTime()) continue;
        const bucket = byDay.get(key);
        if (!bucket) continue;
        if (task.status === "done") {
          bucket.completed.push(task);
        } else if (task.status === "inbox" || task.status === "todo") {
          bucket.active.push(task);
        }
      }

      for (const day of weekDays) {
        const bucket = byDay.get(day.getTime());
        if (!bucket) continue;
        bucket.active.sort((a, b) =>
          compareByDueDateThenProject(a, b, projectsById),
        );
        bucket.completed.sort((a, b) =>
          compareByDueDateThenProject(a, b, projectsById),
        );
      }

      return weekDays.map((day) => byDay.get(day.getTime())!);
    }, [weekStart.getTime(), weekEnd.getTime(), mode, calendarDayKey]) ?? [];

  return { days };
}
