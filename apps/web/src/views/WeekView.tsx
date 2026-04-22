import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { addDays, endOfWeek, startOfDay, startOfWeek } from "date-fns";
import WeekTopBar from "../components/week/WeekTopBar";
import WeekGrid from "../components/week/WeekGrid";
import HintBar from "../components/layout/HintBar";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import { useWeekTasks, type WeekMode } from "../hooks/useWeekTasks";
import { db } from "../lib/db";
import { requestSync } from "../lib/requestSync";
import type { Project, Space, Task } from "@sift/shared";

function thisWeekMonday(): Date {
  return startOfWeek(startOfDay(new Date()), { weekStartsOn: 1 });
}

function orphanProjectContext(task: Task): { project: Project; space: Space } {
  const now = new Date();
  const unassigned = task.projectId == null;
  return {
    project: {
      id: task.projectId ?? "__unassigned__",
      name: unassigned ? "No project" : "Unknown project",
      emoji: null,
      spaceId: "__orphan__",
      dueDate: null,
      archived: false,
      url: null,
      createdAt: now,
      updatedAt: now,
      synced: true,
    },
    space: {
      id: "__orphan__",
      name: "Unknown",
      color: "#888888",
      createdAt: now,
      updatedAt: now,
      synced: true,
    },
  };
}

export default function WeekView() {
  const [anchorMonday, setAnchorMonday] = useState<Date>(() => thisWeekMonday());
  const [mode, setMode] = useState<WeekMode>("working");
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const weekRootRef = useRef<HTMLDivElement>(null);
  const weekTaskRefocusId = useRef<string | null>(null);
  const { spacesWithProjects, spacesProjectsReady } = useSpacesProjects();
  const { days } = useWeekTasks(anchorMonday, mode);

  const weekStart = startOfWeek(anchorMonday, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const projectMap = useMemo(() => {
    const map = new Map<string, { project: Project; space: Space }>();
    for (const { space, projects } of spacesWithProjects) {
      for (const project of projects) {
        map.set(project.id, { project, space });
      }
    }
    return map;
  }, [spacesWithProjects]);

  function resolveTaskContext(task: Task): { project: Project; space: Space } {
    if (task.projectId == null) return orphanProjectContext(task);
    return projectMap.get(task.projectId) ?? orphanProjectContext(task);
  }

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const day of days) {
      for (const task of [...day.active, ...day.completed]) {
        map.set(task.id, task);
      }
    }
    return map;
  }, [days]);

  useEffect(() => {
    if (focusedTaskId !== null && !tasksById.has(focusedTaskId)) {
      setFocusedTaskId(null);
    }
  }, [focusedTaskId, tasksById]);

  /** Enter toggles done moves the row in the DOM; restore focus so keyboard nav keeps working. */
  useLayoutEffect(() => {
    const id = weekTaskRefocusId.current;
    if (id === null) return;
    const row = document.querySelector<HTMLElement>(
      `[data-week-task-id="${id}"] [role="listitem"]`,
    );
    if (!row?.isConnected) {
      if (!tasksById.has(id)) weekTaskRefocusId.current = null;
      return;
    }
    weekTaskRefocusId.current = null;
    row.focus();
  }, [days, tasksById]);

  useEffect(() => {
    const root = weekRootRef.current;
    if (!root) return;
    function onFocusIn(e: FocusEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const wrap = t.closest("[data-week-task-id]");
      setFocusedTaskId(
        wrap instanceof HTMLElement ? (wrap.dataset.weekTaskId ?? null) : null,
      );
    }
    root.addEventListener("focusin", onFocusIn);
    return () => root.removeEventListener("focusin", onFocusIn);
  }, []);

  /**
   * After load, focus is usually on body. Focusing the week *header* trapped
   * focus inside data-week-view-root so global ←/→ could not reach Projects
   * without ArrowUp to the top nav first. Land on the active main-nav tab
   * instead so view cycling works; use Topbar ArrowDown (spec) to enter the
   * week header / week keyboard layer.
   */
  useEffect(() => {
    if (!spacesProjectsReady) return;
    const root = weekRootRef.current;
    if (!root) return;
    const ae = document.activeElement;
    if (ae instanceof Node && root.contains(ae)) return;
    const navTab = document.querySelector<HTMLElement>(
      'nav[aria-label="Main views"] a[aria-current="page"]',
    );
    navTab?.focus();
  }, [spacesProjectsReady]);

  useEffect(() => {
    function focusTaskInDay(dayIndex: number): string | null {
      const wrapper = document.querySelector<HTMLElement>(
        `[data-week-task-id][data-week-day-index="${dayIndex}"]`,
      );
      if (!wrapper) return null;
      const taskId = wrapper.dataset.weekTaskId ?? null;
      wrapper.querySelector<HTMLElement>('[role="listitem"]')?.focus();
      return taskId;
    }

    function dayHasTasks(dayIndex: number): boolean {
      const day = days[dayIndex];
      return day != null && day.active.length + day.completed.length > 0;
    }

    function focusFirstTaskInDay(dayIndex: number): string | null {
      const day = days[dayIndex];
      if (!day) return null;
      const ids = [...day.active, ...day.completed].map((t) => t.id);
      if (ids.length === 0) return null;
      const id = ids[0]!;
      document
        .querySelector<HTMLElement>(
          `[data-week-task-id="${id}"] [role="listitem"]`,
        )
        ?.focus();
      return id;
    }

    function focusLastTaskInDay(dayIndex: number): string | null {
      const day = days[dayIndex];
      if (!day) return null;
      const ids = [...day.active, ...day.completed].map((t) => t.id);
      if (ids.length === 0) return null;
      const id = ids[ids.length - 1]!;
      document
        .querySelector<HTMLElement>(
          `[data-week-task-id="${id}"] [role="listitem"]`,
        )
        ?.focus();
      return id;
    }

    function focusTopbarCurrentTab(): void {
      const el = document.querySelector(
        'nav[aria-label="Main views"] a[aria-current="page"]',
      );
      if (el instanceof HTMLElement) el.focus();
    }

    function updateTask(task: Task, patch: Partial<Task>): void {
      void db.tasks
        .update(task.id, { ...patch, updatedAt: new Date(), synced: false })
        .then(() => requestSync());
    }

    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;

      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (target?.isContentEditable) return;

      if (!e.metaKey && !e.ctrlKey && !e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        setMode((prev) =>
          prev === "working" ? "due" : prev === "due" ? "completed" : "working",
        );
        return;
      }
      if (!e.metaKey && !e.ctrlKey && !e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        setAnchorMonday(thisWeekMonday());
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      const header = document.querySelector("[data-week-header]");
      const isHeaderFocused = active === header;
      if (isHeaderFocused) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          e.stopPropagation();
          setAnchorMonday((prev) =>
            startOfWeek(addDays(prev, -7), { weekStartsOn: 1 }),
          );
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          e.stopPropagation();
          setAnchorMonday((prev) =>
            startOfWeek(addDays(prev, 7), { weekStartsOn: 1 }),
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          focusTopbarCurrentTab();
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          for (let i = 0; i < days.length; i += 1) {
            const taskId = focusTaskInDay(i);
            if (taskId) { setFocusedTaskId(taskId); return; }
          }
        }
      }

      const taskWrapper = active?.closest("[data-week-task-id]");
      const dayHeaderEl = active?.closest("[data-week-day-header]");

      if (e.key === "Tab") {
        let tabDay: number | null = null;
        if (taskWrapper instanceof HTMLElement && taskWrapper.dataset.weekDayIndex != null) {
          tabDay = Number(taskWrapper.dataset.weekDayIndex);
        } else if (dayHeaderEl instanceof HTMLElement) {
          const raw = dayHeaderEl.getAttribute("data-week-day-header");
          tabDay = raw != null ? Number(raw) : null;
        }
        if (tabDay !== null && !Number.isNaN(tabDay)) {
          e.preventDefault();
          const forward = !e.shiftKey;
          if (forward) {
            let found: number | null = null;
            for (let step = 1; step <= 6; step += 1) {
              const j = (tabDay + step) % 7;
              if (dayHasTasks(j)) {
                found = j;
                break;
              }
            }
            if (found !== null) {
              const id = focusFirstTaskInDay(found);
              if (id) setFocusedTaskId(id);
              return;
            }
            if (dayHasTasks(tabDay)) {
              const id = focusFirstTaskInDay(tabDay);
              if (id) setFocusedTaskId(id);
            }
            return;
          }
          let found: number | null = null;
          for (let step = 1; step <= 6; step += 1) {
            const j = (tabDay - step + 7) % 7;
            if (dayHasTasks(j)) {
              found = j;
              break;
            }
          }
          if (found !== null) {
            const id = focusLastTaskInDay(found);
            if (id) setFocusedTaskId(id);
            return;
          }
          if (dayHasTasks(tabDay)) {
            const id = focusLastTaskInDay(tabDay);
            if (id) setFocusedTaskId(id);
          }
          return;
        }
      }

      if (!(taskWrapper instanceof HTMLElement)) return;
      const taskId = taskWrapper.dataset.weekTaskId;
      const dayIndexRaw = taskWrapper.dataset.weekDayIndex;
      if (!taskId || dayIndexRaw == null) return;
      const dayIndex = Number(dayIndexRaw);
      const day = days[dayIndex];
      if (!day) return;
      const dayTaskIds = [...day.active, ...day.completed].map((t) => t.id);
      const index = dayTaskIds.indexOf(taskId);
      if (index === -1) return;
      const task = tasksById.get(taskId);
      if (!task) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (index === 0) {
          setFocusedTaskId(null);
          const weekHeader = document.querySelector<HTMLElement>("[data-week-header]");
          weekHeader?.focus();
          return;
        }
        const prevId = dayTaskIds[index - 1];
        setFocusedTaskId(prevId);
        document.querySelector<HTMLElement>(
          `[data-week-task-id="${prevId}"] [role="listitem"]`,
        )?.focus();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (index >= dayTaskIds.length - 1) return;
        const nextId = dayTaskIds[index + 1];
        setFocusedTaskId(nextId);
        document.querySelector<HTMLElement>(
          `[data-week-task-id="${nextId}"] [role="listitem"]`,
        )?.focus();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        weekTaskRefocusId.current = task.id;
        if (task.status === "done") {
          updateTask(task, {
            status: task.workingDate ? "todo" : "inbox",
            completedAt: null,
          });
        } else if (task.status === "inbox" || task.status === "todo") {
          updateTask(task, { status: "done", completedAt: new Date() });
        }
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        updateTask(task, { status: "archived" });
        return;
      }

      const isEditKey =
        e.key === "d" ||
        e.key === "D" ||
        e.key === "w" ||
        e.key === "W" ||
        e.key === "p" ||
        e.key === "P" ||
        e.key === "e" ||
        e.key === "E" ||
        e.key === "u" ||
        e.key === "U";
      if (isEditKey) {
        e.preventDefault();
        const chip =
          e.key === "d" || e.key === "D"
            ? "dueDate"
            : e.key === "w" || e.key === "W"
              ? "workingDate"
              : e.key === "p" || e.key === "P"
                ? "project"
                : e.key === "u" || e.key === "U"
                  ? "url"
                  : null;
        window.dispatchEvent(
          new CustomEvent("sift:edit-task", { detail: { task, chip } }),
        );
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [days, tasksById]);

  return (
    <div
      ref={weekRootRef}
      className="h-full flex flex-col"
      data-week-view-root
    >
      <WeekTopBar
        weekStart={weekStart}
        weekEnd={weekEnd}
        mode={mode}
        onModeChange={setMode}
        onPrevWeek={() =>
          setAnchorMonday((prev) =>
            startOfWeek(addDays(prev, -7), { weekStartsOn: 1 }),
          )
        }
        onNextWeek={() =>
          setAnchorMonday((prev) =>
            startOfWeek(addDays(prev, 7), { weekStartsOn: 1 }),
          )
        }
      />
      <div className="flex-1 overflow-y-auto min-h-0">
        {!spacesProjectsReady ? (
          <div className="h-full" aria-busy="true" aria-label="Loading week tasks" />
        ) : (
          <WeekGrid
            days={days}
            focusedTaskId={focusedTaskId}
            onTaskFocus={setFocusedTaskId}
            resolveTaskContext={resolveTaskContext}
          />
        )}
      </div>
      <HintBar focusState={focusedTaskId !== null ? "task" : "week"} />
    </div>
  );
}
