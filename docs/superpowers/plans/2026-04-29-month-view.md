# Month View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a month-grid sibling to Week view at `/month`, with per-day task counts, a live-selecting calendar, a tasks panel below, and `V` to toggle Week ↔ Month.

**Architecture:** New `MonthView` mirrors `WeekView`'s shell. New hook `useMonthTasks` returns exactly 42 day cells (6×7) with per-day counts and tasks driven by the existing `WeekMode`. New components live under `apps/web/src/components/month/`. AppLayout/Topbar/Sidebar/HintBar are extended (no rewrites) to recognize `/month` and a unified `data-calendar-header` marker shared by both `WeekTopBar` and `MonthTopBar`.

**Tech Stack:** React + TypeScript, Vite, react-router-dom, date-fns, Dexie + dexie-react-hooks, Tailwind, Vitest + Testing Library + fake-indexeddb.

---

## File Structure

**Create:**
- `apps/web/src/hooks/useMonthTasks.ts` — month-grid data hook
- `apps/web/src/views/MonthView.tsx` — view glue (state + keyboard)
- `apps/web/src/components/month/MonthTopBar.tsx` — month header + mode radio
- `apps/web/src/components/month/MonthGrid.tsx` — 6×7 grid + weekday header
- `apps/web/src/components/month/MonthDayCell.tsx` — individual day cell
- `apps/web/src/components/month/MonthTaskPanel.tsx` — tasks for selected day
- `apps/web/src/__tests__/useMonthTasks.test.ts`
- `apps/web/src/__tests__/MonthView.test.tsx`

**Modify:**
- `apps/web/src/App.tsx` — add `/month` route
- `apps/web/src/components/layout/AppLayout.tsx` — add `/month` to VIEWS, V toggle, treat `/month` like `/week` for arrow capture
- `apps/web/src/components/layout/Topbar.tsx` — rename "Week" tab to "Calendar", add `data-calendar-header` lookup, treat `/month` as a calendar route
- `apps/web/src/components/layout/Sidebar.tsx` — rename "Week" link to "Calendar", enable header-jump for `/month`, switch to `data-calendar-header` lookup
- `apps/web/src/components/layout/HintBar.tsx` — add `month` and `month-task` focus states
- `apps/web/src/components/week/WeekTopBar.tsx` — add `data-calendar-header` attribute alongside `data-week-header`

---

## Task 1: useMonthTasks — build a stable 42-cell grid

**Files:**
- Create: `apps/web/src/hooks/useMonthTasks.ts`
- Test: `apps/web/src/__tests__/useMonthTasks.test.ts`

- [ ] **Step 1: Write the failing test for grid shape**

Create `apps/web/src/__tests__/useMonthTasks.test.ts`:

```ts
// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db } from "../lib/db";
import { useMonthTasks } from "../hooks/useMonthTasks";
import type { Project, Space, Task } from "@sift/shared";

function makeSpace(): Space {
  const now = new Date();
  return {
    id: "space-1",
    name: "Work",
    color: "#5E6AD2",
    createdAt: now,
    updatedAt: now,
    synced: true,
  };
}

function makeProject(): Project {
  const now = new Date();
  return {
    id: "project-1",
    name: "General",
    emoji: "📚",
    spaceId: "space-1",
    dueDate: null,
    archived: false,
    url: null,
    createdAt: now,
    updatedAt: now,
    synced: true,
  };
}

function makeTask(overrides?: Partial<Task>): Task {
  const now = new Date();
  return {
    id: "task-1",
    title: "Test task",
    projectId: "project-1",
    status: "inbox",
    workingDate: null,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    url: null,
    synced: true,
    ...overrides,
  };
}

beforeEach(async () => {
  await db.tasks.clear();
  await db.projects.clear();
  await db.spaces.clear();
  await db.spaces.add(makeSpace());
  await db.projects.add(makeProject());
});

describe("useMonthTasks", () => {
  it("always returns exactly 42 day cells", async () => {
    const { result } = renderHook(() =>
      useMonthTasks(new Date(2026, 3, 1), "working"),
    );
    await waitFor(() => expect(result.current.days.length).toBe(42));
  });

  it("starts the grid on Monday", async () => {
    const { result } = renderHook(() =>
      useMonthTasks(new Date(2026, 3, 1), "working"),
    );
    await waitFor(() => expect(result.current.days.length).toBe(42));
    expect(result.current.days[0].date.getDay()).toBe(1);
  });

  it("flags isCurrentMonth correctly", async () => {
    const { result } = renderHook(() =>
      useMonthTasks(new Date(2026, 3, 1), "working"),
    );
    await waitFor(() => expect(result.current.days.length).toBe(42));
    const inMonth = result.current.days.filter((d) => d.isCurrentMonth);
    expect(inMonth.length).toBe(30);
    expect(inMonth[0].date.getDate()).toBe(1);
    expect(inMonth[inMonth.length - 1].date.getDate()).toBe(30);
  });

  it("returns 42 cells even for a 28-day month starting Monday", async () => {
    // February 2021: 28 days, starts Monday → 4 rows of in-month + 2 trailing rows
    const { result } = renderHook(() =>
      useMonthTasks(new Date(2021, 1, 1), "working"),
    );
    await waitFor(() => expect(result.current.days.length).toBe(42));
    expect(result.current.days[0].isCurrentMonth).toBe(true);
    expect(result.current.days[27].isCurrentMonth).toBe(true);
    expect(result.current.days[28].isCurrentMonth).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/__tests__/useMonthTasks.test.ts`
Expected: FAIL with "Cannot find module '../hooks/useMonthTasks'".

- [ ] **Step 3: Implement minimal useMonthTasks (grid only, no tasks yet)**

Create `apps/web/src/hooks/useMonthTasks.ts`:

```ts
import { startOfDay, startOfMonth, startOfWeek, endOfWeek, endOfMonth } from "date-fns";
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

export function buildMonthDays(anchorMonth: Date): { date: Date; isCurrentMonth: boolean }[] {
  const monthStart = startOfMonth(anchorMonth);
  const monthEnd = endOfMonth(anchorMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  const cursor = new Date(gridStart);
  while (cursor.getTime() <= gridEnd.getTime()) {
    const day = startOfDay(cursor);
    cells.push({ date: day, isCurrentMonth: day.getMonth() === monthStart.getMonth() });
    cursor.setDate(cursor.getDate() + 1);
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = startOfDay(new Date(last));
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, isCurrentMonth: next.getMonth() === monthStart.getMonth() });
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

export function useMonthTasks(anchorMonth: Date, _mode: WeekMode): MonthTasksResult {
  const cells = buildMonthDays(anchorMonth);
  const today = startOfDay(new Date());
  const days: MonthDay[] = cells.map(({ date, isCurrentMonth }) => ({
    date,
    isCurrentMonth,
    isToday: isSameLocalDay(date, today),
    count: 0,
    active: [],
    completed: [],
  }));
  // Touch unused imports so eslint doesn't yell while we land Step 4.
  void useLiveQuery;
  void db;
  void compareByCompletedAtThenProject;
  void compareByDueDateThenProject;
  void ({} as Task);
  void ({} as Project);
  return { days };
}
```

- [ ] **Step 4: Run grid-shape tests to verify they pass**

Run: `npx vitest run apps/web/src/__tests__/useMonthTasks.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useMonthTasks.ts apps/web/src/__tests__/useMonthTasks.test.ts
git commit -m "feat(month): useMonthTasks grid shape (6x7, monday-start)"
```

---

## Task 2: useMonthTasks — counts + tasks per day

**Files:**
- Modify: `apps/web/src/hooks/useMonthTasks.ts`
- Test: `apps/web/src/__tests__/useMonthTasks.test.ts`

- [ ] **Step 1: Add failing tests for counts and mode placement**

Append inside the `describe("useMonthTasks", ...)` block in `apps/web/src/__tests__/useMonthTasks.test.ts`:

```ts
  it("counts tasks per day in working mode (current month days)", async () => {
    const apr8 = new Date(2026, 3, 8, 14, 0, 0);
    const apr9 = new Date(2026, 3, 9, 14, 0, 0);
    await db.tasks.bulkAdd([
      makeTask({ id: "a", status: "todo", workingDate: apr8 }),
      makeTask({ id: "b", status: "todo", workingDate: apr8 }),
      makeTask({ id: "c", status: "todo", workingDate: apr9 }),
    ]);

    const { result } = renderHook(() =>
      useMonthTasks(new Date(2026, 3, 1), "working"),
    );
    await waitFor(() => expect(result.current.days.length).toBe(42));
    const apr8Cell = result.current.days.find(
      (d) => d.date.getMonth() === 3 && d.date.getDate() === 8,
    )!;
    const apr9Cell = result.current.days.find(
      (d) => d.date.getMonth() === 3 && d.date.getDate() === 9,
    )!;
    expect(apr8Cell.count).toBe(2);
    expect(apr9Cell.count).toBe(1);
  });

  it("counts sibling-month days too", async () => {
    // Mar 31 2026 (Tuesday) is a leading sibling cell in April's grid (cell index 1).
    const mar31 = new Date(2026, 2, 31, 14, 0, 0);
    await db.tasks.add(makeTask({ id: "leading", status: "todo", workingDate: mar31 }));

    const { result } = renderHook(() =>
      useMonthTasks(new Date(2026, 3, 1), "working"),
    );
    await waitFor(() => expect(result.current.days.length).toBe(42));
    const cell = result.current.days.find(
      (d) => d.date.getMonth() === 2 && d.date.getDate() === 31,
    )!;
    expect(cell.isCurrentMonth).toBe(false);
    expect(cell.count).toBe(1);
  });

  it("filters by dueDate in due mode and completedAt in completed mode", async () => {
    const apr8 = new Date(2026, 3, 8, 14, 0, 0);
    const apr10 = new Date(2026, 3, 10, 14, 0, 0);
    const apr12 = new Date(2026, 3, 12, 14, 0, 0);
    await db.tasks.bulkAdd([
      makeTask({ id: "wd", status: "todo", workingDate: apr8 }),
      makeTask({ id: "due", status: "todo", workingDate: null, dueDate: apr10 }),
      makeTask({
        id: "done",
        status: "done",
        workingDate: apr8,
        completedAt: apr12,
      }),
    ]);

    const month = new Date(2026, 3, 1);
    const due = renderHook(() => useMonthTasks(month, "due"));
    await waitFor(() => expect(due.result.current.days.length).toBe(42));
    const apr10Cell = due.result.current.days.find(
      (d) => d.date.getMonth() === 3 && d.date.getDate() === 10,
    )!;
    expect(apr10Cell.count).toBe(1);
    expect(apr10Cell.active.map((t) => t.id)).toContain("due");

    const completed = renderHook(() => useMonthTasks(month, "completed"));
    await waitFor(() => expect(completed.result.current.days.length).toBe(42));
    const apr12Cell = completed.result.current.days.find(
      (d) => d.date.getMonth() === 3 && d.date.getDate() === 12,
    )!;
    expect(apr12Cell.count).toBe(1);
    expect(apr12Cell.completed.map((t) => t.id)).toEqual(["done"]);
  });

  it("excludes archived tasks", async () => {
    const apr8 = new Date(2026, 3, 8, 14, 0, 0);
    await db.tasks.add(
      makeTask({ id: "trash", status: "archived", workingDate: apr8 }),
    );
    const { result } = renderHook(() =>
      useMonthTasks(new Date(2026, 3, 1), "working"),
    );
    await waitFor(() => expect(result.current.days.length).toBe(42));
    const apr8Cell = result.current.days.find(
      (d) => d.date.getMonth() === 3 && d.date.getDate() === 8,
    )!;
    expect(apr8Cell.count).toBe(0);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run apps/web/src/__tests__/useMonthTasks.test.ts`
Expected: FAIL — counts are 0 because the hook doesn't read from Dexie yet.

- [ ] **Step 3: Replace useMonthTasks with the live-query implementation**

Replace the body of `apps/web/src/hooks/useMonthTasks.ts` (keep imports, types, and `buildMonthDays`):

```ts
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
    }, [gridStartMs, gridEndMs, mode]) ?? cells.map(({ date, isCurrentMonth }) => ({
      date,
      isCurrentMonth,
      isToday: isSameLocalDay(date, today),
      count: 0,
      active: [],
      completed: [],
    }));

  return { days };
}
```

Delete the `void` placeholder block from Task 1 Step 3.

- [ ] **Step 4: Run all useMonthTasks tests to verify they pass**

Run: `npx vitest run apps/web/src/__tests__/useMonthTasks.test.ts`
Expected: PASS (8 tests total).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useMonthTasks.ts apps/web/src/__tests__/useMonthTasks.test.ts
git commit -m "feat(month): per-day counts and mode-driven task placement"
```

---

## Task 3: MonthDayCell component

**Files:**
- Create: `apps/web/src/components/month/MonthDayCell.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/month/MonthDayCell.tsx`:

```tsx
import type { MonthDay } from "../../hooks/useMonthTasks";

interface MonthDayCellProps {
  cell: MonthDay;
  cellIndex: number;
  isFocused: boolean;
  onFocus: () => void;
}

function pipWidthClass(count: number): string {
  if (count <= 0) return "w-0";
  if (count <= 2) return "w-2";
  if (count <= 4) return "w-3.5";
  return "w-full";
}

export default function MonthDayCell({
  cell,
  cellIndex,
  isFocused,
  onFocus,
}: MonthDayCellProps) {
  const dim = !cell.isCurrentMonth;
  const cls = [
    "relative outline-none border-r border-b border-[0.5px] border-border",
    "min-h-0 px-1.5 pt-1 pb-3.5 text-left",
    "font-mono text-[11px] leading-tight",
    dim ? "text-dim bg-bg" : "text-text bg-surface",
    cell.isToday ? "bg-[#FFF6F0]" : "",
    isFocused
      ? "ring-2 ring-inset ring-accent shadow-laser z-[1]"
      : "",
  ].join(" ");

  return (
    <button
      type="button"
      data-month-day-index={cellIndex}
      data-month-day-iso={cell.date.toISOString()}
      aria-label={cell.date.toDateString()}
      aria-current={cell.isToday ? "date" : undefined}
      tabIndex={isFocused ? 0 : -1}
      onFocus={onFocus}
      className={cls}
    >
      <span className="font-medium">{cell.date.getDate()}</span>
      {cell.count > 0 && (
        <span className="absolute inset-x-1.5 bottom-1 flex items-center gap-1">
          <span
            aria-hidden
            className={`h-[3px] bg-accent ${pipWidthClass(cell.count)}`}
          />
          <span className="ml-auto font-mono text-[9px] text-accent tabular-nums">
            {cell.count}
          </span>
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Quick smoke check via type-check**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS (no type errors in the new file).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/month/MonthDayCell.tsx
git commit -m "feat(month): MonthDayCell with pip + count + focused ring"
```

---

## Task 4: MonthGrid component

**Files:**
- Create: `apps/web/src/components/month/MonthGrid.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/month/MonthGrid.tsx`:

```tsx
import MonthDayCell from "./MonthDayCell";
import type { MonthDay } from "../../hooks/useMonthTasks";

const WEEKDAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

interface MonthGridProps {
  days: MonthDay[];
  focusedIndex: number;
  onFocusIndex: (index: number) => void;
}

export default function MonthGrid({
  days,
  focusedIndex,
  onFocusIndex,
}: MonthGridProps) {
  return (
    <div
      className="grid w-full grid-cols-7 border-l border-t border-[0.5px] border-border bg-surface"
      data-month-grid
      role="grid"
      aria-label="Month calendar"
    >
      {WEEKDAY_HEADERS.map((label, i) => (
        <div
          key={`h-${i}`}
          role="columnheader"
          className="border-r border-b border-[0.5px] border-border px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted bg-surface-2"
        >
          {label}
        </div>
      ))}
      {days.map((cell, i) => (
        <MonthDayCell
          key={cell.date.toISOString()}
          cell={cell}
          cellIndex={i}
          isFocused={focusedIndex === i}
          onFocus={() => onFocusIndex(i)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/month/MonthGrid.tsx
git commit -m "feat(month): MonthGrid (6x7 + weekday header row)"
```

---

## Task 5: MonthTaskPanel component

**Files:**
- Create: `apps/web/src/components/month/MonthTaskPanel.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/month/MonthTaskPanel.tsx`:

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/month/MonthTaskPanel.tsx
git commit -m "feat(month): MonthTaskPanel for selected-day tasks"
```

---

## Task 6: MonthTopBar component (with `data-calendar-header`)

**Files:**
- Create: `apps/web/src/components/month/MonthTopBar.tsx`
- Modify: `apps/web/src/components/week/WeekTopBar.tsx`

- [ ] **Step 1: Add unified `data-calendar-header` attribute on WeekTopBar**

In `apps/web/src/components/week/WeekTopBar.tsx`, change the focusable header element so it carries both the existing and the new attribute:

```tsx
        <div
          tabIndex={0}
          data-week-header
          data-calendar-header
          aria-label={label}
          className="min-w-0 truncate outline-none focus:text-accent px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted select-none cursor-default transition-colors duration-150"
        >
```

(only the `data-calendar-header` line is new — leave everything else untouched.)

- [ ] **Step 2: Create MonthTopBar**

Create `apps/web/src/components/month/MonthTopBar.tsx`:

```tsx
import { format } from "date-fns";
import type { WeekMode } from "../../hooks/useWeekTasks";

const MODE_OPTIONS: { id: WeekMode; label: string; title: string }[] = [
  { id: "working", label: "Working", title: "Group by working date" },
  { id: "due", label: "Due", title: "Group by due date" },
  { id: "completed", label: "Done", title: "Group by completion date" },
];

interface MonthTopBarProps {
  anchorMonth: Date;
  mode: WeekMode;
  onModeChange: (mode: WeekMode) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export default function MonthTopBar({
  anchorMonth,
  mode,
  onModeChange,
  onPrevMonth,
  onNextMonth,
}: MonthTopBarProps) {
  const label = format(anchorMonth, "MMMM yyyy");

  return (
    <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-2.5 border-b border-[0.5px] border-border bg-surface shrink-0">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Previous month"
          className="w-9 h-9 border-[0.5px] border-border text-muted transition-[color,border-color,box-shadow] duration-150 shrink-0 hover:border-accent/40 hover:text-accent hover:shadow-hotkey"
        >
          ←
        </button>
        <div
          tabIndex={0}
          data-month-header
          data-calendar-header
          aria-label={label}
          className="min-w-0 truncate outline-none focus:text-accent px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted select-none cursor-default transition-colors duration-150"
        >
          <span
            key={anchorMonth.getTime()}
            className="inline-block motion-reduce:animate-none motion-safe:animate-week-nudge"
          >
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Next month"
          className="w-9 h-9 border-[0.5px] border-border text-muted transition-[color,border-color,box-shadow] duration-150 shrink-0 hover:border-accent/40 hover:text-accent hover:shadow-hotkey"
        >
          →
        </button>
      </div>

      <div
        className="ml-auto grid h-9 min-w-0 w-[13.75rem] max-w-full shrink grid-cols-3 border-[0.5px] border-border bg-surface-2"
        role="radiogroup"
        aria-label="Month grouping"
      >
        {MODE_OPTIONS.map(({ id, label: optLabel, title }, index) => {
          const selected = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={title}
              title={title}
              onClick={() => onModeChange(id)}
              className={`relative z-0 flex min-h-0 min-w-0 items-center justify-center px-1 font-mono text-[10px] uppercase tracking-[0.1em] outline-none transition-[color,background-color,box-shadow] duration-150 ${
                index < MODE_OPTIONS.length - 1
                  ? "border-r border-[0.5px] border-border"
                  : ""
              } ${
                selected
                  ? "z-[1] bg-accent/5 text-accent shadow-hotkey ring-1 ring-inset ring-accent"
                  : "text-muted hover:bg-surface hover:text-text hover:shadow-laser-archive"
              }`}
            >
              <span className="whitespace-nowrap">{optLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/month/MonthTopBar.tsx apps/web/src/components/week/WeekTopBar.tsx
git commit -m "feat(month): MonthTopBar + unified data-calendar-header attr"
```

---

## Task 7: MonthView — state, focus model, keyboard nav

**Files:**
- Create: `apps/web/src/views/MonthView.tsx`

- [ ] **Step 1: Implement MonthView**

Create `apps/web/src/views/MonthView.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMonths, startOfDay, startOfMonth } from "date-fns";
import MonthTopBar from "../components/month/MonthTopBar";
import MonthGrid from "../components/month/MonthGrid";
import MonthTaskPanel from "../components/month/MonthTaskPanel";
import HintBar from "../components/layout/HintBar";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import { useMonthTasks } from "../hooks/useMonthTasks";
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

export default function MonthView() {
  const navigate = useNavigate();
  const [anchorMonth, setAnchorMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [mode, setMode] = useState<WeekMode>("working");
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const taskRefocusId = useRef<string | null>(null);
  const pendingEdgeFocus = useRef<"first-in-month" | "last-in-month" | null>(null);
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
      const today = startOfDay(new Date());
      idx = days.findIndex(
        (d) => d.isCurrentMonth && d.date.getTime() === today.getTime(),
      );
      if (idx === -1) idx = days.findIndex((d) => d.isCurrentMonth);
      if (idx === -1) idx = 0;
    }
    pendingEdgeFocus.current = null;
    setFocusedIndex(idx);
    requestAnimationFrame(() => {
      const cell = document.querySelector<HTMLElement>(
        `[data-month-day-index="${idx}"]`,
      );
      const ae = document.activeElement;
      if (
        cell &&
        ae instanceof HTMLElement &&
        (ae.dataset.monthDayIndex != null || ae === document.body)
      ) {
        cell.focus();
      }
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (target?.isContentEditable) return;

      // Global month-view shortcuts
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
          setAnchorMonth(startOfMonth(new Date()));
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

      const cell = (active as HTMLElement | null)?.closest(
        "[data-month-day-index]",
      );
      if (cell instanceof HTMLElement) {
        const idx = Number(cell.dataset.monthDayIndex);
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
            // last grid row → descend into panel
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
      const editKey =
        e.key === "d" || e.key === "D"
          ? "dueDate"
          : e.key === "w" || e.key === "W"
            ? "workingDate"
            : e.key === "p" || e.key === "P"
              ? "project"
              : e.key === "u" || e.key === "U"
                ? "url"
                : e.key === "e" || e.key === "E"
                  ? null
                  : "skip";
      if (editKey !== "skip") {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("sift:edit-task", { detail: { task, chip: editKey } }),
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS (the `month` and `month-task` HintBar focus states are added in Task 10 — type-check will fail until then; if it does, proceed to Task 10 first then return).

If it fails on `focusState` typing, jump to Task 10 Step 1 and Step 2 first.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/views/MonthView.tsx
git commit -m "feat(month): MonthView with full keyboard nav model"
```

---

## Task 8: Wire `/month` route + V toggle

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Add the route**

Edit `apps/web/src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import { useAuth } from './contexts/AuthContext';
import { useSync } from './hooks/useSync';
import AppLayout from './components/layout/AppLayout';
import AuthPage from './pages/AuthPage';
import InboxView from './views/InboxView';
import TodayView from './views/TodayView';
import ProjectsView from './views/ProjectsView';
import WeekView from './views/WeekView';
import MonthView from './views/MonthView';

export default function App() {
  const { user } = useAuth();
  const syncStatus = useSync(user);

  return (
    <>
      <Analytics />
      <SpeedInsights />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<AppLayout syncStatus={syncStatus} />}>
          <Route index element={<Navigate to="/inbox" replace />} />
          <Route path="inbox" element={<InboxView />} />
          <Route path="today" element={<TodayView />} />
          <Route path="projects" element={<ProjectsView />} />
          <Route path="week" element={<WeekView />} />
          <Route path="month" element={<MonthView />} />
        </Route>
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Routes>
    </>
  );
}
```

- [ ] **Step 2: Add /month to AppLayout VIEWS and global V toggle**

In `apps/web/src/components/layout/AppLayout.tsx`:

Replace the `VIEWS` constant:

```ts
const VIEWS = ["/inbox", "/today", "/week", "/projects"];
```

with:

```ts
const VIEWS = ["/inbox", "/today", "/week", "/projects"];
const CALENDAR_VIEWS = new Set(["/week", "/month"]);
```

Then inside the `useEffect` that wires `onKey`, before the existing arrow-key branch, add a V handler and update the data-week-view-root check to also accept `/month`:

```ts
      if (
        !isInput &&
        !paletteOpen &&
        !projectPaletteOpen &&
        (e.key === "v" || e.key === "V") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        if (location.pathname.startsWith("/week")) {
          e.preventDefault();
          void navigate("/month");
          return;
        }
        if (location.pathname.startsWith("/month")) {
          e.preventDefault();
          void navigate("/week");
          return;
        }
      }

      if (
        !isInput &&
        !paletteOpen &&
        !projectPaletteOpen &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        const onCalendar = [...CALENDAR_VIEWS].some((p) =>
          location.pathname.startsWith(p),
        );
        if (onCalendar) {
          const active = document.activeElement;
          const root =
            document.querySelector("[data-week-view-root]") ??
            document.querySelector("[data-month-view-root]");
          if (root instanceof HTMLElement && active && root.contains(active)) {
            return;
          }
        }
        e.preventDefault();
        const curr = VIEWS.findIndex((v) => location.pathname.startsWith(v));
        if (curr === -1) return;
        const next =
          e.key === "ArrowRight"
            ? VIEWS[(curr + 1) % VIEWS.length]
            : VIEWS[(curr - 1 + VIEWS.length) % VIEWS.length];
        void navigate(next);
      }
```

(replace the existing arrow-key block — leave the rest of `onKey` and the `Cmd+K` / `Escape` blocks above it untouched.)

- [ ] **Step 3: Run the web build to verify**

Run: `npm run build --workspace=@sift/shared && npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/components/layout/AppLayout.tsx
git commit -m "feat(month): /month route and V week<->month toggle"
```

---

## Task 9: Sidebar + Topbar updates

**Files:**
- Modify: `apps/web/src/components/layout/Topbar.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Topbar — rename "Week" tab to "Calendar" and treat /month as active**

Edit `apps/web/src/components/layout/Topbar.tsx`. Replace the `<NavTab to="/week" label="Week" count={0} />` line with:

```tsx
          <NavTab
            to={location.pathname.startsWith("/month") ? "/month" : "/week"}
            label="Calendar"
            count={0}
          />
```

(The `to` swaps based on current pathname so the active highlight tracks correctly via `aria-current`.)

Then update the `useEffect` that captures ArrowDown to also fire on `/month` and look for `data-calendar-header` instead of `data-week-header`:

```ts
  useEffect(() => {
    const onCalendar =
      location.pathname.startsWith("/week") ||
      location.pathname.startsWith("/month");
    if (!onCalendar) return;
    function onKeyCapture(e: KeyboardEvent) {
      if (e.key !== "ArrowDown") return;
      const ae = document.activeElement;
      if (!(ae instanceof HTMLElement)) return;
      const mainNav = document.querySelector(
        'nav[aria-label="Main views"]',
      ) as HTMLElement | null;
      if (!mainNav || !mainNav.contains(ae)) return;
      const tabLink = ae.closest("a");
      if (!(tabLink instanceof HTMLAnchorElement)) return;
      if (!mainNav.contains(tabLink)) return;
      const header = document.querySelector("[data-calendar-header]");
      if (!(header instanceof HTMLElement)) {
        requestAnimationFrame(() => {
          const next = document.querySelector("[data-calendar-header]");
          if (next instanceof HTMLElement) next.focus();
        });
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      header.focus();
    }
    window.addEventListener("keydown", onKeyCapture, true);
    return () => window.removeEventListener("keydown", onKeyCapture, true);
  }, [location.pathname]);
```

- [ ] **Step 2: Sidebar — rename "Week" link to "Calendar", switch jump attribute**

Edit `apps/web/src/components/layout/Sidebar.tsx`:

Replace `focusWeekHeaderSoon` with:

```tsx
function focusCalendarHeaderSoon(): boolean {
  const header = document.querySelector("[data-calendar-header]");
  if (header instanceof HTMLElement) {
    header.focus();
    return true;
  }
  requestAnimationFrame(() => {
    const next = document.querySelector("[data-calendar-header]");
    if (next instanceof HTMLElement) next.focus();
  });
  return false;
}
```

Replace the `enableWeekHeaderJump` prop name with `enableCalendarHeaderJump` throughout the file (interface, JSX usages). Replace the `focusWeekHeaderSoon()` call in the keydown handler with `focusCalendarHeaderSoon()`.

Replace the line `const enableWeekHeaderJump = location.pathname.startsWith("/week");` with:

```tsx
  const enableCalendarHeaderJump =
    location.pathname.startsWith("/week") ||
    location.pathname.startsWith("/month");
```

Replace the four `<SidebarLink ... enableWeekHeaderJump={enableWeekHeaderJump} />` instances with `enableCalendarHeaderJump={enableCalendarHeaderJump}`.

Replace the existing `<SidebarLink to="/week" label="Week" .../>` with:

```tsx
        <SidebarLink
          to="/week"
          label="Calendar"
          onNavigate={onNavigate}
          enableCalendarHeaderJump={enableCalendarHeaderJump}
        />
```

- [ ] **Step 3: Type-check + run topbar test**

Run: `npm run build --workspace=@sift/shared && npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS.

Run: `npx vitest run apps/web/src/__tests__/Topbar.test.tsx`
Expected: PASS — if the existing test asserts the literal string "Week" on the third tab, update the assertion to "Calendar".

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/Topbar.tsx apps/web/src/components/layout/Sidebar.tsx apps/web/src/__tests__/Topbar.test.tsx
git commit -m "feat(month): Calendar tab/link active for /week and /month"
```

---

## Task 10: HintBar — month and month-task focus states

**Files:**
- Modify: `apps/web/src/components/layout/HintBar.tsx`

- [ ] **Step 1: Extend FocusState and hint sets**

Replace the type alias and add hint constants in `apps/web/src/components/layout/HintBar.tsx`:

```tsx
type FocusState = "none" | "project" | "task" | "week" | "month" | "month-task";
```

Add after `WEEK_HINTS`:

```tsx
const MONTH_HINTS: Hint[] = [
  { keys: ["↑↓←→"], label: "navigate" },
  { keys: ["Enter"], label: "open day", hot: true },
  { keys: ["M"], label: "mode", hot: true },
  { keys: ["T"], label: "today", hot: true },
  { keys: ["V"], label: "week", hot: true },
];

const MONTH_TASK_HINTS: Hint[] = [
  { keys: ["Enter"], label: "Done", hot: true },
  { keys: ["D"], label: "Due date", hot: true },
  { keys: ["W"], label: "Today", hot: true },
  { keys: ["P"], label: "Project", hot: true },
  { keys: ["U"], label: "Link", hot: true },
  { keys: ["⌫"], label: "Archive" },
  { keys: ["↑"], label: "back to day" },
];
```

Replace the `hints` selection block:

```tsx
  const hints =
    focusState === "task"
      ? TASK_HINTS
      : focusState === "project"
        ? buildProjectHints(archiveHint, projectExpanded)
        : focusState === "week"
          ? WEEK_HINTS
          : focusState === "month"
            ? MONTH_HINTS
            : focusState === "month-task"
              ? MONTH_TASK_HINTS
              : NONE_HINTS;
```

- [ ] **Step 2: Run HintBar test**

Run: `npx vitest run apps/web/src/__tests__/HintBar.test.tsx`
Expected: PASS (no existing assertions broken; new states are additive).

- [ ] **Step 3: Type-check the whole web app**

Run: `npm run build --workspace=@sift/shared && npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS — including `MonthView.tsx` from Task 7 which uses `"month"` and `"month-task"`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/HintBar.tsx
git commit -m "feat(month): HintBar month + month-task focus states"
```

---

## Task 11: MonthView integration test

**Files:**
- Create: `apps/web/src/__tests__/MonthView.test.tsx`

- [ ] **Step 1: Write integration test covering live selection + keyboard**

Create `apps/web/src/__tests__/MonthView.test.tsx`:

```tsx
// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { db } from "../lib/db";
import MonthView from "../views/MonthView";
import type { Project, Space, Task } from "@sift/shared";

function makeSpace(): Space {
  const now = new Date();
  return {
    id: "space-1",
    name: "Work",
    color: "#5E6AD2",
    createdAt: now,
    updatedAt: now,
    synced: true,
  };
}
function makeProject(): Project {
  const now = new Date();
  return {
    id: "project-1",
    name: "General",
    emoji: "📚",
    spaceId: "space-1",
    dueDate: null,
    archived: false,
    url: null,
    createdAt: now,
    updatedAt: now,
    synced: true,
  };
}
function makeTask(overrides?: Partial<Task>): Task {
  const now = new Date();
  return {
    id: "task-1",
    title: "Test task",
    projectId: "project-1",
    status: "inbox",
    workingDate: null,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    url: null,
    synced: true,
    ...overrides,
  };
}

beforeEach(async () => {
  vi.setSystemTime(new Date(2026, 3, 15, 9, 0, 0));
  await db.tasks.clear();
  await db.projects.clear();
  await db.spaces.clear();
  await db.spaces.add(makeSpace());
  await db.projects.add(makeProject());
});

function renderMonth() {
  return render(
    <MemoryRouter initialEntries={["/month"]}>
      <Routes>
        <Route path="/month" element={<MonthView />} />
        <Route path="/week" element={<div data-testid="week-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MonthView", () => {
  it("renders 42 day cells with weekday header row", async () => {
    renderMonth();
    await waitFor(() =>
      expect(document.querySelectorAll("[data-month-day-index]").length).toBe(42),
    );
    expect(document.querySelector("[role='columnheader']")).toBeTruthy();
  });

  it("focuses today on mount", async () => {
    renderMonth();
    await waitFor(() => {
      const focused = document.querySelector("[aria-current='date']");
      expect(focused).not.toBeNull();
    });
  });

  it("V navigates to /week", async () => {
    renderMonth();
    await waitFor(() =>
      expect(document.querySelectorAll("[data-month-day-index]").length).toBe(42),
    );
    fireEvent.keyDown(window, { key: "v" });
    await waitFor(() =>
      expect(screen.getByTestId("week-page")).toBeInTheDocument(),
    );
  });

  it("ArrowRight moves focus to next day", async () => {
    renderMonth();
    await waitFor(() =>
      expect(document.querySelectorAll("[data-month-day-index]").length).toBe(42),
    );
    const today = document.querySelector<HTMLElement>("[aria-current='date']");
    expect(today).not.toBeNull();
    today!.focus();
    const startIdx = Number(today!.dataset.monthDayIndex);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => {
      const active = document.activeElement as HTMLElement | null;
      expect(active?.dataset.monthDayIndex).toBe(String(startIdx + 1));
    });
  });

  it("ArrowRight from cell 41 advances anchorMonth", async () => {
    renderMonth();
    await waitFor(() =>
      expect(document.querySelectorAll("[data-month-day-index]").length).toBe(42),
    );
    const cell41 = document.querySelector<HTMLElement>(
      "[data-month-day-index='41']",
    );
    cell41!.focus();
    const beforeIso = cell41!.dataset.monthDayIso;
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => {
      const after = document.querySelector<HTMLElement>(
        "[data-month-day-index='0']",
      );
      expect(after?.dataset.monthDayIso).not.toBe(beforeIso);
    });
  });

  it("Enter on a day descends focus into the tasks panel", async () => {
    const apr15 = new Date(2026, 3, 15, 10, 0, 0);
    await db.tasks.add(
      makeTask({ id: "panel-task", status: "todo", workingDate: apr15 }),
    );
    renderMonth();
    await waitFor(() =>
      expect(
        document.querySelectorAll("[data-month-task-id]").length,
      ).toBeGreaterThan(0),
    );
    const today = document.querySelector<HTMLElement>("[aria-current='date']");
    today!.focus();
    fireEvent.keyDown(window, { key: "Enter" });
    await waitFor(() => {
      const active = document.activeElement as HTMLElement | null;
      expect(active?.closest("[data-month-task-id]")).not.toBeNull();
    });
  });

  it("ArrowUp from first task returns to the selected day", async () => {
    const apr15 = new Date(2026, 3, 15, 10, 0, 0);
    await db.tasks.add(
      makeTask({ id: "panel-task", status: "todo", workingDate: apr15 }),
    );
    renderMonth();
    await waitFor(() =>
      expect(
        document.querySelectorAll("[data-month-task-id]").length,
      ).toBeGreaterThan(0),
    );
    const today = document.querySelector<HTMLElement>("[aria-current='date']");
    today!.focus();
    fireEvent.keyDown(window, { key: "Enter" });
    await waitFor(() => {
      const active = document.activeElement as HTMLElement | null;
      expect(active?.closest("[data-month-task-id]")).not.toBeNull();
    });
    fireEvent.keyDown(window, { key: "ArrowUp" });
    await waitFor(() => {
      const active = document.activeElement as HTMLElement | null;
      expect(active?.dataset.monthDayIndex).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx vitest run apps/web/src/__tests__/MonthView.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 3: Run the full app test suite**

Run: `npm run test --workspace=web`
Expected: PASS (all existing + new tests).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/__tests__/MonthView.test.tsx
git commit -m "test(month): MonthView keyboard + selection coverage"
```

---

## Task 12: Manual smoke test in the browser

**Files:** none

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: web app available locally; navigate to `/month`.

- [ ] **Step 2: Verify the checklist below in the browser**

Each item must pass before the task is closed:

1. `/month` renders 6 rows × 7 cols, weekday header `M T W T F S S`, today highlighted.
2. Each in-month and sibling-month day shows its task count + pip when count > 0.
3. Arrow keys move the focused day; tasks panel below updates live.
4. Pressing past cell 0 (←) advances to previous month; past cell 41 (→) advances to next month.
5. `M` cycles working → due → completed; counts and panel reflect the change.
6. `T` jumps to current month and selects today.
7. `V` swaps to `/week`; `V` again returns to `/month`.
8. `Enter` on a day moves focus to first task; `↑` from first task returns to the day.
9. `D / W / P / U` open the CommandPalette pre-focused on the right chip; `Enter` toggles done; `Backspace` archives.
10. Topbar tab labeled "Calendar" highlights for both `/week` and `/month`; `↓` from the tab descends to the month/week header; sidebar "Calendar" link works the same.
11. Resize the viewport — the calendar grid does not change row count between months.

- [ ] **Step 3: Final summary commit if any tweaks landed**

Only commit if any code changed during smoke testing.
