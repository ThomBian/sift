import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMonths, getDaysInMonth, startOfDay, startOfMonth } from "date-fns";
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

function firstDayCellIndexInGrid(
  cells: { date: Date; isCurrentMonth: boolean }[],
): number {
  const i = cells.findIndex((d) => d.isCurrentMonth);
  return i === -1 ? 0 : i;
}

function lastDayCellIndexInGrid(
  cells: { date: Date; isCurrentMonth: boolean }[],
): number {
  let last = -1;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].isCurrentMonth) last = i;
  }
  return last === -1 ? 41 : last;
}

function cellIndexForDayInMonth(
  anchorMonth: Date,
  dayOfMonth: number,
): number {
  const cells = buildMonthDays(anchorMonth);
  const max = getDaysInMonth(anchorMonth);
  const d = Math.min(Math.max(1, Math.floor(dayOfMonth)), max);
  const i = cells.findIndex(
    (c) => c.isCurrentMonth && c.date.getDate() === d,
  );
  return i === -1 ? firstDayCellIndexInGrid(cells) : i;
}

function dayOfMonthFromCellIndex(
  prevAnchor: Date,
  prevFocusedIndex: number,
): number {
  const prevCells = buildMonthDays(prevAnchor);
  const sel = prevCells[prevFocusedIndex];
  if (sel) return sel.date.getDate();
  return new Date().getDate();
}

type MonthPageFocusTarget =
  | "grid"
  | "monthHeader"
  | "monthNavPrev"
  | "monthNavNext";

export default function MonthView() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [anchorMonth, setAnchorMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [mode, setMode] = useState<WeekMode>("working");
  const [focusedIndex, setFocusedIndex] = useState<number>(() =>
    findTodayCellIndex(buildMonthDays(startOfMonth(new Date()))),
  );
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const taskRefocusId = useRef<string | null>(null);

  /** Always points at the latest anchored month — used by keyboard navigators called in one tick. */
  const anchorMonthRef = useRef(anchorMonth);
  anchorMonthRef.current = anchorMonth;

  /**
   * `applyAnchorMonthFocus` sets month + selection then restores focus; skipping avoids
   * the snap effect overwriting that focus when `anchorMonth` changes.
   */
  const skipSnapFocusOutsideRootRef = useRef(false);

  const { spacesWithProjects, spacesProjectsReady } = useSpacesProjects();
  const { days } = useMonthTasks(anchorMonth, mode);

  /**
   * When focus is outside this view (sidebar, prior view, body), Arrow keys never reach synthetic
   * grid handling and would switch main views or do nothing. After load or when the grid first
   * stabilizes, snap focus to today's cell so day arrows work — mirrors the old
   * [anchorMonth, days.length] autofocus without clobbering `applyAnchorMonthFocus` (see skip
   * ref above) or running on every live-query `days` refresh.
   */
  useEffect(() => {
    if (!spacesProjectsReady || days.length !== 42) return;
    const root = rootRef.current;
    if (!root) return;
    if (skipSnapFocusOutsideRootRef.current) {
      return;
    }
    const ae = document.activeElement;
    if (ae instanceof Node && root.contains(ae)) return;
    const idx = findTodayCellIndex(days);
    setFocusedIndex(idx);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-month-day-index="${idx}"]`)
        ?.focus();
    });
  }, [spacesProjectsReady, anchorMonth, days.length]);

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

  function applyAnchorMonthFocus(
    nextAnchor: Date,
    cellIndex: number,
    focus: MonthPageFocusTarget,
  ) {
    skipSnapFocusOutsideRootRef.current = true;
    setAnchorMonth(nextAnchor);
    setFocusedIndex(cellIndex);
    requestAnimationFrame(() => {
      if (focus === "grid") {
        document
          .querySelector<HTMLElement>(
            `[data-month-day-index="${cellIndex}"]`,
          )
          ?.focus();
      } else if (focus === "monthHeader") {
        document.querySelector<HTMLElement>("[data-month-header]")?.focus();
      } else if (focus === "monthNavPrev") {
        document.querySelector<HTMLElement>("[data-month-nav-prev]")?.focus();
      } else if (focus === "monthNavNext") {
        document.querySelector<HTMLElement>("[data-month-nav-next]")?.focus();
      }
      skipSnapFocusOutsideRootRef.current = false;
    });
  }

  /** First/last column crosses to adjacent month — first or last day of that month row. */
  function navigateMonthFromOppositeGridEdge(
    monthDelta: -1 | 1,
    edge: "first" | "last",
  ) {
    const nextAnchor = startOfMonth(
      addMonths(anchorMonthRef.current, monthDelta),
    );
    const cells = buildMonthDays(nextAnchor);
    const idx =
      edge === "first"
        ? firstDayCellIndexInGrid(cells)
        : lastDayCellIndexInGrid(cells);
    applyAnchorMonthFocus(nextAnchor, idx, "grid");
  }

  const selectedDay = days[focusedIndex];

  const tasksByDay = useMemo(() => {
    if (!selectedDay) return [] as Task[];
    return [...selectedDay.active, ...selectedDay.completed];
  }, [selectedDay]);

  const tasksByDayRef = useRef<Task[]>([]);
  tasksByDayRef.current = tasksByDay;
  const focusedIndexRef = useRef(focusedIndex);
  focusedIndexRef.current = focusedIndex;

  /** Month chrome (← buttons / title): same day-of-month in the new month; keep focus on chrome. */
  function navigateMonthByDelta(
    monthDelta: number,
    focusAfter: MonthPageFocusTarget,
  ) {
    const prevAnchor = anchorMonthRef.current;
    const dom = dayOfMonthFromCellIndex(prevAnchor, focusedIndexRef.current);
    const nextAnchor = startOfMonth(addMonths(prevAnchor, monthDelta));
    const idx = cellIndexForDayInMonth(nextAnchor, dom);
    applyAnchorMonthFocus(nextAnchor, idx, focusAfter);
  }

  /** Move focus after paint to the descended task row. */
  function focusDomForTask(taskId: string) {
    const safe =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(taskId)
        : taskId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          `[data-month-task-id="${safe}"] [role="listitem"]`,
        )
        ?.focus();
    });
  }

  function focusCalendarCell(index: number) {
    const cell = document.querySelector<HTMLElement>(
      `[data-month-day-index="${index}"]`,
    );
    cell?.focus();
  }

  function focusFirstTaskInPanel(): string | null {
    const list = tasksByDayRef.current;
    if (list.length > 0) return list[0].id;
    const el = document.querySelector<HTMLElement>(
      "[data-month-panel] [data-month-task-id]",
    );
    const fromDom = el?.dataset.monthTaskId;
    return fromDom ?? null;
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

  useEffect(() => {
    if (focusedTaskId == null) return;
    if (tasksByDay.length === 0) return;
    if (!tasksByDay.some((t) => t.id === focusedTaskId))
      setFocusedTaskId(null);
  }, [focusedTaskId, tasksByDay]);

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
          applyAnchorMonthFocus(month, idx, "grid");
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
          navigateMonthByDelta(-1, "monthHeader");
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          e.stopPropagation();
          navigateMonthByDelta(1, "monthHeader");
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
          focusCalendarCell(focusedIndexRef.current);
          return;
        }
      }

      const cellFromEvent = monthDayCellFromEventTarget(e.target);
      const cellFromActive = (active as HTMLElement | null)?.closest(
        "[data-month-day-index]",
      );
      let cell = (cellFromEvent ?? cellFromActive) as HTMLElement | null;
      /** Synthetic cell focus when focus is inside the month root but not on a cell (e.g. panel chrome). */
      if (!(cell instanceof HTMLElement) && rootRef.current != null) {
        const ae = document.activeElement;
        const synthetic = document.querySelector<HTMLElement>(
          `[data-month-day-index="${focusedIndexRef.current}"]`,
        );
        const focusLostToDocumentRoot =
          ae === document.body || ae === document.documentElement;
        const focusOnTask =
          ae instanceof Element &&
          ae.closest("[data-month-task-id]") != null;
        if (synthetic instanceof HTMLElement && !focusOnTask) {
          if (focusLostToDocumentRoot) {
            cell = synthetic;
          } else if (ae instanceof Node && rootRef.current.contains(ae)) {
            cell = synthetic;
          }
        }
      }
      if (cell instanceof HTMLElement) {
        const idx = readMonthDayIndex(cell);
        if (Number.isNaN(idx)) return;

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (idx === 0) {
            navigateMonthFromOppositeGridEdge(-1, "last");
            return;
          }
          setFocusedIndex(idx - 1);
          focusCalendarCell(idx - 1);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (idx === 41) {
            navigateMonthFromOppositeGridEdge(1, "first");
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
            if (taskId) {
              setFocusedTaskId(taskId);
              focusDomForTask(taskId);
            }
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
          if (taskId) {
            setFocusedTaskId(taskId);
            focusDomForTask(taskId);
          }
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
      const byDay = tasksByDayRef.current;
      const task = byDay[taskIdx];
      if (!task) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (taskIdx === 0) {
          setFocusedTaskId(null);
          focusCalendarCell(focusedIndexRef.current);
          return;
        }
        const prev = byDay[taskIdx - 1];
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
        if (taskIdx >= byDay.length - 1) return;
        const next = byDay[taskIdx + 1];
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
        focusCalendarCell(focusedIndexRef.current);
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
        onPrevMonth={() => navigateMonthByDelta(-1, "monthNavPrev")}
        onNextMonth={() => navigateMonthByDelta(1, "monthNavNext")}
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
