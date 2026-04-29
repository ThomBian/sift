import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMonths, startOfDay, startOfMonth } from "date-fns";
import MonthTopBar from "../components/month/MonthTopBar";
import MonthGrid from "../components/month/MonthGrid";
import MonthTaskPanel from "../components/month/MonthTaskPanel";
import HintBar from "../components/layout/HintBar";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import { useMonthTasks, buildMonthDays } from "../hooks/useMonthTasks";
import type { WeekMode } from "../hooks/useWeekTasks";
import { db } from "../lib/db";
import { requestSync } from "../lib/requestSync";
import type { Project, Space, Task } from "@sift/shared";

function orphanCtx(task: Task): { project: Project; space: Space } {
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

function monthDayCellFromEventTarget(
  target: EventTarget | null,
): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest("[data-month-day-index]");
  return el instanceof HTMLElement ? el : null;
}

function readMonthDayIndex(cell: HTMLElement): number {
  const raw = cell.getAttribute("data-month-day-index");
  if (raw == null || raw === "") return NaN;
  return Number(raw);
}

/** Index of the cell that shows local "today", including leading/trailing month cells. */
function findTodayCellIndex(
  days: { date: Date; isCurrentMonth: boolean }[],
): number {
  if (days.length !== 42) return 0;
  const today = startOfDay(new Date());
  const t = today.getTime();
  const byDay = days.findIndex((d) => startOfDay(d.date).getTime() === t);
  if (byDay !== -1) return byDay;
  const firstIn = days.findIndex((d) => d.isCurrentMonth);
  if (firstIn !== -1) return firstIn;
  return 0;
}

export default function MonthView() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [anchorMonth, setAnchorMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [mode, setMode] = useState<WeekMode>("working");
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const taskRefocusId = useRef<string | null>(null);
  const pendingEdgeFocus = useRef<"first-in-month" | "last-in-month" | null>(
    null,
  );
  const { spacesWithProjects, spacesProjectsReady } = useSpacesProjects();
  const { days } = useMonthTasks(anchorMonth, mode);

  const projectMap = useMemo(() => {
    const map = new Map<string, { project: Project; space: Space }>();
    for (const { space, projects } of spacesWithProjects) {
      for (const project of projects) map.set(project.id, { project, space });
    }
    return map;
  }, [spacesWithProjects]);

  function resolveTaskContext(task: Task): { project: Project; space: Space } {
    if (task.projectId == null) return orphanCtx(task);
    return projectMap.get(task.projectId) ?? orphanCtx(task);
  }

  useEffect(() => {
    if (days.length !== 42) return;
    let idx: number;
    if (pendingEdgeFocus.current === "first-in-month") {
      idx = days.findIndex((d) => d.isCurrentMonth);
    } else if (pendingEdgeFocus.current === "last-in-month") {
      const inMonth = days
        .map((d, i) => ({ d, i }))
        .filter((x) => x.d.isCurrentMonth);
      idx = inMonth.length ? inMonth[inMonth.length - 1].i : 41;
    } else {
      idx = findTodayCellIndex(days);
    }
    pendingEdgeFocus.current = null;
    setFocusedIndex(idx);
    requestAnimationFrame(() => {
      const cell = document.querySelector<HTMLElement>(
        `[data-month-day-index="${idx}"]`,
      );
      cell?.focus();
    });
  }, [anchorMonth, days.length]);

  const selectedDay = days[focusedIndex];

  const tasksByDay = useMemo(() => {
    if (!selectedDay) return [] as Task[];
    return [...selectedDay.active, ...selectedDay.completed];
  }, [selectedDay]);

  useEffect(() => {
    if (focusedTaskId == null) return;
    if (!tasksByDay.some((t) => t.id === focusedTaskId))
      setFocusedTaskId(null);
  }, [focusedTaskId, tasksByDay]);

  function focusCalendarCell(index: number) {
    const cell = document.querySelector<HTMLElement>(
      `[data-month-day-index="${index}"]`,
    );
    cell?.focus();
  }

  function focusFirstTaskInPanel(): string | null {
    if (tasksByDay.length === 0) return null;
    const id = tasksByDay[0].id;
    const el = document.querySelector<HTMLElement>(
      `[data-month-task-id="${id}"] [role="listitem"]`,
    );
    el?.focus();
    return id;
  }

  function focusMonthHeader() {
    const el = document.querySelector<HTMLElement>("[data-month-header]");
    el?.focus();
  }

  function updateTask(task: Task, patch: Partial<Task>): void {
    void db.tasks
      .update(task.id, { ...patch, updatedAt: new Date(), synced: false })
      .then(() => requestSync());
  }

  /** Stop the scrollable main column from eating ArrowUp/ArrowDown before we handle grid nav. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    function onCapture(e: KeyboardEvent) {
      if (
        e.key !== "ArrowUp" &&
        e.key !== "ArrowDown" &&
        e.key !== "ArrowLeft" &&
        e.key !== "ArrowRight"
      ) {
        return;
      }
      const fromTarget = monthDayCellFromEventTarget(e.target);
      const fromActive =
        document.activeElement instanceof Element
          ? document.activeElement.closest("[data-month-day-index]")
          : null;
      if (fromTarget instanceof HTMLElement || fromActive instanceof HTMLElement) {
        e.preventDefault();
      }
    }
    root.addEventListener("keydown", onCapture, true);
    return () => root.removeEventListener("keydown", onCapture, true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (target?.isContentEditable) return;

      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "m" || e.key === "M") {
          e.preventDefault();
          setMode((p) =>
            p === "working" ? "due" : p === "due" ? "completed" : "working",
          );
          return;
        }
        if (e.key === "t" || e.key === "T") {
          e.preventDefault();
          const month = startOfMonth(new Date());
          const idx = findTodayCellIndex(buildMonthDays(month));
          setAnchorMonth(month);
          setFocusedIndex(idx);
          requestAnimationFrame(() => {
            document
              .querySelector<HTMLElement>(
                `[data-month-day-index="${idx}"]`,
              )
              ?.focus();
          });
          return;
        }
        if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          void navigate("/week");
          return;
        }
      }

      const active = document.activeElement;
      const header = document.querySelector("[data-month-header]");
      const isHeaderFocused = active === header;

      if (isHeaderFocused) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          e.stopPropagation();
          setAnchorMonth((p) => addMonths(p, -1));
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          e.stopPropagation();
          setAnchorMonth((p) => addMonths(p, 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const tab = document.querySelector(
            'nav[aria-label="Main views"] a[aria-current="page"]',
          );
          if (tab instanceof HTMLElement) tab.focus();
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          focusCalendarCell(focusedIndex);
          return;
        }
      }

      const cellFromEvent = monthDayCellFromEventTarget(e.target);
      const cellFromActive = (active as HTMLElement | null)?.closest(
        "[data-month-day-index]",
      );
      const cell = (cellFromEvent ?? cellFromActive) as HTMLElement | null;
      if (cell instanceof HTMLElement) {
        const idx = readMonthDayIndex(cell);
        if (Number.isNaN(idx)) return;

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (idx === 0) {
            pendingEdgeFocus.current = "last-in-month";
            setAnchorMonth((p) => addMonths(p, -1));
            return;
          }
          setFocusedIndex(idx - 1);
          focusCalendarCell(idx - 1);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (idx === 41) {
            pendingEdgeFocus.current = "first-in-month";
            setAnchorMonth((p) => addMonths(p, 1));
            return;
          }
          setFocusedIndex(idx + 1);
          focusCalendarCell(idx + 1);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (idx < 7) {
            focusMonthHeader();
            return;
          }
          setFocusedIndex(idx - 7);
          focusCalendarCell(idx - 7);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (idx >= 35) {
            const taskId = focusFirstTaskInPanel();
            if (taskId) setFocusedTaskId(taskId);
            return;
          }
          setFocusedIndex(idx + 7);
          focusCalendarCell(idx + 7);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          if (e.key === "Tab" && e.shiftKey) return;
          e.preventDefault();
          const taskId = focusFirstTaskInPanel();
          if (taskId) setFocusedTaskId(taskId);
          return;
        }
      }

      const taskWrap = (active as HTMLElement | null)?.closest(
        "[data-month-task-id]",
      );
      if (!(taskWrap instanceof HTMLElement)) return;
      const taskId = taskWrap.dataset.monthTaskId;
      const taskIdxRaw = taskWrap.dataset.monthTaskIndex;
      if (!taskId || taskIdxRaw == null) return;
      const taskIdx = Number(taskIdxRaw);
      if (Number.isNaN(taskIdx)) return;
      const task = tasksByDay[taskIdx];
      if (!task) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (taskIdx === 0) {
          setFocusedTaskId(null);
          focusCalendarCell(focusedIndex);
          return;
        }
        const prev = tasksByDay[taskIdx - 1];
        setFocusedTaskId(prev.id);
        document
          .querySelector<HTMLElement>(
            `[data-month-task-id="${prev.id}"] [role="listitem"]`,
          )
          ?.focus();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (taskIdx >= tasksByDay.length - 1) return;
        const next = tasksByDay[taskIdx + 1];
        setFocusedTaskId(next.id);
        document
          .querySelector<HTMLElement>(
            `[data-month-task-id="${next.id}"] [role="listitem"]`,
          )
          ?.focus();
        return;
      }
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        setFocusedTaskId(null);
        focusCalendarCell(focusedIndex);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        taskRefocusId.current = task.id;
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
  }, [days, focusedIndex, navigate, tasksByDay]);

  return (
    <div
      ref={rootRef}
      className="h-full flex flex-col"
      data-month-view-root
    >
      <MonthTopBar
        anchorMonth={anchorMonth}
        mode={mode}
        onModeChange={setMode}
        onPrevMonth={() => setAnchorMonth((p) => addMonths(p, -1))}
        onNextMonth={() => setAnchorMonth((p) => addMonths(p, 1))}
      />
      <div className="flex flex-col flex-1 min-h-0">
        {!spacesProjectsReady ? (
          <div className="h-full" aria-busy="true" aria-label="Loading month" />
        ) : (
          <>
            <MonthGrid
              days={days}
              focusedIndex={focusedIndex}
              onFocusIndex={(i) => setFocusedIndex(i)}
            />
            {selectedDay && (
              <MonthTaskPanel
                day={selectedDay}
                focusedTaskId={focusedTaskId}
                onTaskFocus={setFocusedTaskId}
                resolveTaskContext={resolveTaskContext}
              />
            )}
          </>
        )}
      </div>
      <HintBar
        focusState={focusedTaskId !== null ? "month-task" : "month"}
      />
    </div>
  );
}
