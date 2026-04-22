# Week Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/week` route that shows tasks grouped by calendar day (Mon–Sun) for either working date or due date, with full keyboard navigation and a mode toggle.

**Architecture:** A new `useWeekTasks` hook does all data work (filter, bucket, sort); `WeekView` owns state (`anchorMonday`, `mode`, `focusedId`) and keyboard handling; presentational components (`WeekTopBar`, `WeekGrid`, `DayColumn`) are pure renderers. AppLayout, Topbar, HintBar, and the router each get minimal targeted edits.

**Tech Stack:** React, TypeScript, Dexie + `useLiveQuery`, `date-fns` v4, Tailwind CSS, Vitest + Testing Library + fake-indexeddb.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/hooks/useWeekTasks.ts` | Filter/bucket/sort tasks into 7 day buckets |
| Create | `apps/web/src/__tests__/useWeekTasks.test.ts` | Unit tests for the hook |
| Create | `apps/web/src/components/week/WeekTopBar.tsx` | Week range header + mode toggle |
| Create | `apps/web/src/components/week/DayColumn.tsx` | Single day column (header + active + completed rows) |
| Create | `apps/web/src/components/week/WeekGrid.tsx` | 7-column grid layout |
| Create | `apps/web/src/views/WeekView.tsx` | Root view — state, keyboard, capture listener |
| Modify | `apps/web/src/components/layout/HintBar.tsx` | Add `"week"` focusState variant |
| Modify | `apps/web/src/components/layout/AppLayout.tsx` | Add `/week` to `VIEWS` |
| Modify | `apps/web/src/components/layout/Topbar.tsx` | Add `Week` NavTab + `↓` keydown handler |
| Modify | `apps/web/src/App.tsx` | Register `/week` route |

---

## Task 1: `useWeekTasks` hook

**Files:**
- Create: `apps/web/src/hooks/useWeekTasks.ts`

- [ ] **Step 1: Write the file**

```ts
import { useLiveQuery } from "dexie-react-hooks";
import { startOfDay, addDays } from "date-fns";
import { db } from "../lib/db";
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

function compareByDueDateNullsLast(a: Task, b: Task): number {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.getTime() - b.dueDate.getTime();
}

function projectCollateKey(
  projectId: string | null,
  projectsById: Map<string, Project>,
): string {
  if (projectId === null) return "￿￿￿";
  const p = projectsById.get(projectId);
  if (!p) return `￿￿￾_${projectId}`;
  return p.name;
}

function compareByDueDateThenProject(
  a: Task,
  b: Task,
  projectsById: Map<string, Project>,
): number {
  const byDue = compareByDueDateNullsLast(a, b);
  if (byDue !== 0) return byDue;
  return projectCollateKey(a.projectId, projectsById).localeCompare(
    projectCollateKey(b.projectId, projectsById),
    undefined,
    { sensitivity: "base" },
  );
}

function emptyDays(anchorMonday: Date): DayBucket[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: startOfDay(addDays(anchorMonday, i)),
    active: [],
    completed: [],
  }));
}

export function useWeekTasks(
  anchorMonday: Date,
  mode: WeekMode,
): WeekTasksResult {
  const anchorTime = anchorMonday.getTime();

  return (
    useLiveQuery(async () => {
      const [tasks, projects] = await Promise.all([
        db.tasks.toArray(),
        db.projects.toArray(),
      ]);

      const projectsById = new Map(projects.map((p) => [p.id, p]));
      const days = emptyDays(new Date(anchorTime));

      for (const task of tasks) {
        if (task.status === "archived") continue;

        const dateField =
          mode === "working" ? task.workingDate : task.dueDate;
        if (!dateField) continue;

        const taskDay = startOfDay(dateField).getTime();
        const bucketIndex = days.findIndex((d) => d.date.getTime() === taskDay);
        if (bucketIndex === -1) continue;

        const bucket = days[bucketIndex];
        if (task.status === "done") {
          bucket.completed.push(task);
        } else {
          bucket.active.push(task);
        }
      }

      for (const day of days) {
        day.active.sort((a, b) =>
          compareByDueDateThenProject(a, b, projectsById),
        );
        day.completed.sort((a, b) =>
          compareByDueDateThenProject(a, b, projectsById),
        );
      }

      return { days };
    }, [anchorTime, mode]) ?? { days: emptyDays(new Date(anchorTime)) }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/useWeekTasks.ts
git commit -m "feat: add useWeekTasks hook"
```

---

## Task 2: Unit tests for `useWeekTasks`

**Files:**
- Create: `apps/web/src/__tests__/useWeekTasks.test.ts`

- [ ] **Step 1: Write the test file**

```ts
// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { startOfWeek, addDays, startOfDay } from "date-fns";
import { db } from "../lib/db";
import { useWeekTasks } from "../hooks/useWeekTasks";
import type { Space, Project, Task } from "@sift/shared";

function makeSpace(overrides?: Partial<Space>): Space {
  const now = new Date();
  return {
    id: "space-1",
    name: "Work",
    color: "#5E6AD2",
    createdAt: now,
    updatedAt: now,
    synced: true,
    ...overrides,
  };
}

function makeProject(overrides?: Partial<Project>): Project {
  const now = new Date();
  return {
    id: "project-1",
    name: "General",
    emoji: null,
    spaceId: "space-1",
    dueDate: null,
    archived: false,
    url: null,
    createdAt: now,
    updatedAt: now,
    synced: true,
    ...overrides,
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

const ANCHOR = startOfWeek(new Date("2026-04-20T12:00:00"), {
  weekStartsOn: 1,
}); // Mon Apr 20 2026

beforeEach(async () => {
  await db.spaces.clear();
  await db.projects.clear();
  await db.tasks.clear();
  await db.spaces.add(makeSpace());
  await db.projects.add(makeProject());
});

describe("useWeekTasks — working mode", () => {
  it("returns 7 day buckets starting on Monday", async () => {
    const { result } = renderHook(() => useWeekTasks(ANCHOR, "working"));
    await waitFor(() => expect(result.current.days).toHaveLength(7));
    expect(result.current.days[0].date.getTime()).toBe(
      startOfDay(ANCHOR).getTime(),
    );
    expect(result.current.days[6].date.getTime()).toBe(
      startOfDay(addDays(ANCHOR, 6)).getTime(),
    );
  });

  it("places task on correct day by workingDate", async () => {
    const wednesday = addDays(ANCHOR, 2);
    await db.tasks.add(
      makeTask({ id: "t1", workingDate: wednesday, status: "inbox" }),
    );

    const { result } = renderHook(() => useWeekTasks(ANCHOR, "working"));
    await waitFor(() =>
      expect(result.current.days[2].active).toHaveLength(1),
    );
    expect(result.current.days[2].active[0].id).toBe("t1");
  });

  it("excludes tasks with null workingDate", async () => {
    await db.tasks.add(makeTask({ id: "t1", workingDate: null }));
    const { result } = renderHook(() => useWeekTasks(ANCHOR, "working"));
    await waitFor(() => expect(result.current.days).toHaveLength(7));
    const total = result.current.days.reduce(
      (s, d) => s + d.active.length + d.completed.length,
      0,
    );
    expect(total).toBe(0);
  });

  it("puts done tasks in completed bucket, not active", async () => {
    const monday = ANCHOR;
    await db.tasks.add(
      makeTask({ id: "t1", workingDate: monday, status: "done" }),
    );
    const { result } = renderHook(() => useWeekTasks(ANCHOR, "working"));
    await waitFor(() =>
      expect(result.current.days[0].completed).toHaveLength(1),
    );
    expect(result.current.days[0].active).toHaveLength(0);
  });

  it("excludes archived tasks entirely", async () => {
    const monday = ANCHOR;
    await db.tasks.add(
      makeTask({
        id: "t1",
        workingDate: monday,
        status: "archived",
        completedAt: new Date(),
      }),
    );
    const { result } = renderHook(() => useWeekTasks(ANCHOR, "working"));
    await waitFor(() => expect(result.current.days).toHaveLength(7));
    const total = result.current.days.reduce(
      (s, d) => s + d.active.length + d.completed.length,
      0,
    );
    expect(total).toBe(0);
  });

  it("excludes tasks outside the week window", async () => {
    const nextWeek = addDays(ANCHOR, 7);
    await db.tasks.add(makeTask({ id: "t1", workingDate: nextWeek }));
    const { result } = renderHook(() => useWeekTasks(ANCHOR, "working"));
    await waitFor(() => expect(result.current.days).toHaveLength(7));
    const total = result.current.days.reduce(
      (s, d) => s + d.active.length + d.completed.length,
      0,
    );
    expect(total).toBe(0);
  });
});

describe("useWeekTasks — due mode", () => {
  it("places task by dueDate, not workingDate", async () => {
    const tuesday = addDays(ANCHOR, 1);
    const thursday = addDays(ANCHOR, 3);
    await db.tasks.add(
      makeTask({ id: "t1", workingDate: tuesday, dueDate: thursday }),
    );

    const { result } = renderHook(() => useWeekTasks(ANCHOR, "due"));
    await waitFor(() =>
      expect(result.current.days[3].active).toHaveLength(1),
    );
    expect(result.current.days[1].active).toHaveLength(0);
  });

  it("excludes tasks with null dueDate in due mode", async () => {
    const tuesday = addDays(ANCHOR, 1);
    await db.tasks.add(
      makeTask({ id: "t1", workingDate: tuesday, dueDate: null }),
    );
    const { result } = renderHook(() => useWeekTasks(ANCHOR, "due"));
    await waitFor(() => expect(result.current.days).toHaveLength(7));
    const total = result.current.days.reduce(
      (s, d) => s + d.active.length + d.completed.length,
      0,
    );
    expect(total).toBe(0);
  });
});

describe("useWeekTasks — ordering", () => {
  it("sorts active tasks before completed within same day", async () => {
    const monday = ANCHOR;
    await db.tasks.add(
      makeTask({ id: "active", workingDate: monday, status: "inbox" }),
    );
    await db.tasks.add(
      makeTask({ id: "done", workingDate: monday, status: "done" }),
    );
    const { result } = renderHook(() => useWeekTasks(ANCHOR, "working"));
    await waitFor(() =>
      expect(result.current.days[0].active).toHaveLength(1),
    );
    expect(result.current.days[0].active[0].id).toBe("active");
    expect(result.current.days[0].completed[0].id).toBe("done");
  });
});
```

- [ ] **Step 2: Run tests — expect all to pass**

```bash
npx vitest run apps/web/src/__tests__/useWeekTasks.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/__tests__/useWeekTasks.test.ts
git commit -m "test: useWeekTasks hook"
```

---

## Task 3: Update HintBar

**Files:**
- Modify: `apps/web/src/components/layout/HintBar.tsx`

- [ ] **Step 1: Add `"week"` to the `FocusState` type and add hints**

Change the first line:
```ts
type FocusState = "none" | "project" | "task" | "week";
```

Add a new hints constant after `TASK_HINTS`:
```ts
const WEEK_HINTS: Hint[] = [
  { keys: ["← →"], label: "Week" },
  { keys: ["M"], label: "Mode", hot: true },
  { keys: ["T"], label: "Today", hot: true },
];
```

Update the hints selection in `HintBar`:
```ts
const hints =
  focusState === "task"
    ? TASK_HINTS
    : focusState === "project"
      ? buildProjectHints(archiveHint, projectExpanded)
      : focusState === "week"
        ? WEEK_HINTS
        : NONE_HINTS;
```

- [ ] **Step 2: Run existing HintBar tests**

```bash
npx vitest run apps/web/src/__tests__/HintBar.test.tsx
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/HintBar.tsx
git commit -m "feat: add week focusState to HintBar"
```

---

## Task 4: `WeekTopBar` component

**Files:**
- Create: `apps/web/src/components/week/WeekTopBar.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { format, addDays } from "date-fns";
import type { WeekMode } from "../../hooks/useWeekTasks";

interface WeekTopBarProps {
  anchorMonday: Date;
  mode: WeekMode;
  onModeChange: (mode: WeekMode) => void;
  headerRef: React.RefObject<HTMLDivElement | null>;
  onHeaderKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export default function WeekTopBar({
  anchorMonday,
  mode,
  onModeChange,
  headerRef,
  onHeaderKeyDown,
}: WeekTopBarProps) {
  const weekEnd = addDays(anchorMonday, 6);
  const label = `${format(anchorMonday, "EEE MMM d")} – ${format(weekEnd, "EEE MMM d, yyyy")}`;

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-[0.5px] border-border bg-surface shrink-0">
      <div
        ref={headerRef}
        data-week-header
        tabIndex={0}
        role="heading"
        aria-label={`Week of ${label}`}
        onKeyDown={onHeaderKeyDown}
        className="font-mono text-[11px] text-muted tracking-[0.05em] outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-default select-none"
      >
        {label}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span
          className={`font-mono text-[9px] uppercase tracking-[0.1em] ${
            mode === "working" ? "text-text" : "text-dim"
          }`}
        >
          Working
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={mode === "due"}
          aria-label="Toggle grouping mode"
          onClick={() => onModeChange(mode === "working" ? "due" : "working")}
          className="relative w-7 h-3.5 bg-surface-2 border-[0.5px] border-border-2 shrink-0"
        >
          <span
            className="absolute top-px w-3 h-3 transition-transform duration-150"
            style={{
              background: "#FF4F00",
              boxShadow: "0 0 6px rgba(255,79,0,0.4)",
              transform:
                mode === "due" ? "translateX(13px)" : "translateX(1px)",
            }}
          />
        </button>

        <span
          className={`font-mono text-[9px] uppercase tracking-[0.1em] ${
            mode === "due" ? "text-text" : "text-dim"
          }`}
        >
          Due
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/week/WeekTopBar.tsx
git commit -m "feat: WeekTopBar — range header and mode toggle"
```

---

## Task 5: `DayColumn` component

**Files:**
- Create: `apps/web/src/components/week/DayColumn.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { format } from "date-fns";
import TaskRow from "../TaskRow";
import type { Task, Project, Space } from "@sift/shared";

interface DayColumnProps {
  date: Date;
  active: Task[];
  completed: Task[];
  projectMap: Map<string, { project: Project; space: Space }>;
  focusedId: string | null;
  onFocus: (id: string) => void;
  onToggle: (task: Task) => void;
  isToday: boolean;
}

const ORPHAN_SPACE: Space = {
  id: "__orphan__",
  name: "Unknown",
  color: "#888888",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  synced: true,
};

function orphanProject(task: Task): Project {
  const now = new Date(0);
  return {
    id: task.projectId ?? "__unassigned__",
    name: task.projectId == null ? "No project" : "Unknown project",
    emoji: null,
    spaceId: "__orphan__",
    dueDate: null,
    archived: false,
    url: null,
    createdAt: now,
    updatedAt: now,
    synced: true,
  };
}

export default function DayColumn({
  date,
  active,
  completed,
  projectMap,
  focusedId,
  onFocus,
  onToggle,
  isToday,
}: DayColumnProps) {
  const weekday = format(date, "EEE");
  const dayNum = format(date, "d");

  return (
    <div
      className="flex flex-col border-[0.5px] border-border min-w-0"
      style={{ background: isToday ? "#111" : undefined }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-2 border-b border-[0.5px] border-border shrink-0"
        style={{ color: isToday ? "#FF4F00" : undefined }}
      >
        {isToday && (
          <span
            className="w-1 h-1 shrink-0"
            style={{
              background: "#FF4F00",
              boxShadow: "0 0 4px rgba(255,79,0,0.5)",
            }}
          />
        )}
        <span className="font-mono text-[10px] uppercase tracking-[0.08em]">
          {weekday}
        </span>
        <span className="font-mono text-[10px] text-muted">{dayNum}</span>
      </div>

      <div className="flex flex-col flex-1" role="list">
        {active.map((task, i) => {
          const ctx = task.projectId != null ? projectMap.get(task.projectId) : undefined;
          const project = ctx?.project ?? orphanProject(task);
          const space = ctx?.space ?? ORPHAN_SPACE;
          return (
            <TaskRow
              key={task.id}
              task={task}
              project={project}
              space={space}
              isFocused={focusedId === task.id}
              onFocus={() => onFocus(task.id)}
              onToggle={() => onToggle(task)}
              index={i}
            />
          );
        })}

        {completed.length > 0 && (
          <>
            {active.length > 0 && (
              <div className="border-t border-[0.5px] border-border mx-3 my-1" />
            )}
            {completed.map((task) => {
              const ctx = task.projectId != null ? projectMap.get(task.projectId) : undefined;
              const project = ctx?.project ?? orphanProject(task);
              const space = ctx?.space ?? ORPHAN_SPACE;
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={project}
                  space={space}
                  isFocused={focusedId === task.id}
                  onFocus={() => onFocus(task.id)}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/week/DayColumn.tsx
git commit -m "feat: DayColumn component"
```

---

## Task 6: `WeekGrid` component

**Files:**
- Create: `apps/web/src/components/week/WeekGrid.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { startOfDay } from "date-fns";
import DayColumn from "./DayColumn";
import type { DayBucket } from "../../hooks/useWeekTasks";
import type { Task, Project, Space } from "@sift/shared";

interface WeekGridProps {
  days: DayBucket[];
  projectMap: Map<string, { project: Project; space: Space }>;
  focusedId: string | null;
  onFocus: (id: string) => void;
  onToggle: (task: Task) => void;
}

export default function WeekGrid({
  days,
  projectMap,
  focusedId,
  onFocus,
  onToggle,
}: WeekGridProps) {
  const todayTime = startOfDay(new Date()).getTime();

  return (
    <div
      className="w-full overflow-x-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(7, minmax(140px, 1fr))", minWidth: "980px" }}
      >
        {days.map((day) => (
          <DayColumn
            key={day.date.getTime()}
            date={day.date}
            active={day.active}
            completed={day.completed}
            projectMap={projectMap}
            focusedId={focusedId}
            onFocus={onFocus}
            onToggle={onToggle}
            isToday={day.date.getTime() === todayTime}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/week/WeekGrid.tsx
git commit -m "feat: WeekGrid component"
```

---

## Task 7: `WeekView` root

**Files:**
- Create: `apps/web/src/views/WeekView.tsx`

- [ ] **Step 1: Create the view**

```tsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { startOfWeek, addDays } from "date-fns";
import { useWeekTasks } from "../hooks/useWeekTasks";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import WeekTopBar from "../components/week/WeekTopBar";
import WeekGrid from "../components/week/WeekGrid";
import HintBar from "../components/layout/HintBar";
import { db } from "../lib/db";
import { requestSync } from "../lib/requestSync";
import type { Task, Project, Space } from "@sift/shared";
import type { WeekMode } from "../hooks/useWeekTasks";
import type { ChipFocus } from "@sift/shared";

function getThisMonday(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

function dispatchEditTask(task: Task, chip: ChipFocus | null) {
  window.dispatchEvent(
    new CustomEvent("sift:edit-task", { detail: { task, chip } }),
  );
}

export default function WeekView() {
  const [anchorMonday, setAnchorMonday] = useState<Date>(getThisMonday);
  const [mode, setMode] = useState<WeekMode>("working");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const { days } = useWeekTasks(anchorMonday, mode);
  const { spacesWithProjects } = useSpacesProjects();

  const projectMap = useMemo(() => {
    const map = new Map<string, { project: Project; space: Space }>();
    for (const { space, projects } of spacesWithProjects) {
      for (const project of projects) {
        map.set(project.id, { project, space });
      }
    }
    return map;
  }, [spacesWithProjects]);

  // Clear focus when focused task disappears (e.g. after toggle or mode change)
  useEffect(() => {
    if (focusedId === null) return;
    const allTasks = days.flatMap((d) => [...d.active, ...d.completed]);
    if (!allTasks.find((t) => t.id === focusedId)) setFocusedId(null);
  }, [days, focusedId]);

  // Capture listener — stop ←/→ propagation when focus is in the task grid.
  // Skip when focus is on the header itself: the header's onKeyDown calls
  // e.stopPropagation() directly, which is sufficient to block AppLayout.
  useEffect(() => {
    function onCapture(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const root = document.querySelector("[data-week-view-root]");
      if (!root?.contains(document.activeElement)) return;
      if (document.activeElement?.hasAttribute("data-week-header")) return;
      e.stopPropagation();
    }
    window.addEventListener("keydown", onCapture, true);
    return () => window.removeEventListener("keydown", onCapture, true);
  }, []);

  const handleToggle = useCallback((task: Task) => {
    const now = new Date();
    if (task.status === "done") {
      void db.tasks
        .update(task.id, {
          status: task.workingDate ? "todo" : "inbox",
          completedAt: null,
          updatedAt: now,
          synced: false,
        })
        .then(() => requestSync());
    } else {
      void db.tasks
        .update(task.id, {
          status: "done",
          completedAt: now,
          updatedAt: now,
          synced: false,
        })
        .then(() => requestSync());
    }
  }, []);

  // Header keyboard: ←/→ week, ↓ first task, ↑ topbar nav
  const handleHeaderKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation(); // prevent AppLayout route switch (bubble phase)
        setAnchorMonday((a) => addDays(a, -7));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        setAnchorMonday((a) => addDays(a, 7));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const firstDay = days.find(
          (d) => d.active.length > 0 || d.completed.length > 0,
        );
        if (firstDay) {
          const first = firstDay.active[0] ?? firstDay.completed[0];
          setFocusedId(first.id);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const nav = document.querySelector<HTMLElement>(
          'nav[aria-label="Main views"]',
        );
        nav?.querySelector<HTMLElement>("a")?.focus();
      }
    },
    [days],
  );

  // Global view keydown: M, T, ↑/↓/Tab on tasks, D/W/P/E, Enter, Backspace
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setMode((m) => (m === "working" ? "due" : "working"));
        return;
      }

      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setAnchorMonday(getThisMonday());
        return;
      }

      if (focusedId === null) return;

      // Find task context
      let dayIndex = -1;
      let taskIndex = -1;
      let allInDay: Task[] = [];
      for (let i = 0; i < days.length; i++) {
        const candidates = [...days[i].active, ...days[i].completed];
        const ti = candidates.findIndex((t) => t.id === focusedId);
        if (ti !== -1) {
          dayIndex = i;
          taskIndex = ti;
          allInDay = candidates;
          break;
        }
      }
      if (dayIndex === -1) return;

      const focused = allInDay[taskIndex];

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (taskIndex === 0) {
          setFocusedId(null);
          headerRef.current?.focus();
        } else {
          setFocusedId(allInDay[taskIndex - 1].id);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (taskIndex < allInDay.length - 1) {
          setFocusedId(allInDay[taskIndex + 1].id);
        } else {
          setFocusedId(null);
        }
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const targetDayIndex = e.shiftKey ? dayIndex - 1 : dayIndex + 1;
        if (targetDayIndex >= 0 && targetDayIndex < 7) {
          const target = days[targetDayIndex];
          const first = target.active[0] ?? target.completed[0];
          if (first) setFocusedId(first.id);
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleToggle(focused);
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        const now = new Date();
        void db.tasks
          .update(focusedId, { status: "archived", updatedAt: now, synced: false })
          .then(() => requestSync());
        return;
      }

      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        dispatchEditTask(focused, "dueDate");
        return;
      }
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        dispatchEditTask(focused, "workingDate");
        return;
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        dispatchEditTask(focused, "project");
        return;
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        dispatchEditTask(focused, null);
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedId, days, handleToggle]);

  return (
    <div
      data-week-view-root
      className="flex flex-col h-full min-h-0"
    >
      <h1 className="sr-only">Week</h1>

      <WeekTopBar
        anchorMonday={anchorMonday}
        mode={mode}
        onModeChange={setMode}
        headerRef={headerRef}
        onHeaderKeyDown={handleHeaderKeyDown}
      />

      <div className="flex-1 overflow-y-auto min-h-0">
        <WeekGrid
          days={days}
          projectMap={projectMap}
          focusedId={focusedId}
          onFocus={setFocusedId}
          onToggle={handleToggle}
        />
      </div>

      <HintBar focusState={focusedId !== null ? "task" : "week"} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/views/WeekView.tsx apps/web/src/components/week/WeekTopBar.tsx
git commit -m "feat: WeekView root with keyboard and capture listener"
```

---

## Task 8: Router, AppLayout, Topbar wiring

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/layout/AppLayout.tsx`
- Modify: `apps/web/src/components/layout/Topbar.tsx`

- [ ] **Step 1: Register `/week` route in `App.tsx`**

Add the import at the top of `apps/web/src/App.tsx` alongside existing view imports:
```ts
import WeekView from "./views/WeekView";
```

Add the route inside the `AppLayout` route, after `today` and before `projects`:
```tsx
<Route path="week" element={<WeekView />} />
```

The routes block should look like:
```tsx
<Route path="/" element={<AppLayout syncStatus={syncStatus} />}>
  <Route index element={<Navigate to="/inbox" replace />} />
  <Route path="inbox" element={<InboxView />} />
  <Route path="today" element={<TodayView />} />
  <Route path="week" element={<WeekView />} />
  <Route path="projects" element={<ProjectsView />} />
</Route>
```

- [ ] **Step 2: Update `VIEWS` in `AppLayout.tsx`**

Find line:
```ts
const VIEWS = ["/inbox", "/today", "/projects"];
```

Replace with:
```ts
const VIEWS = ["/inbox", "/today", "/week", "/projects"];
```

- [ ] **Step 3: Add `Week` NavTab and `↓` handler in `Topbar.tsx`**

Add the `Week` tab inside the nav's flex container, after `Today` and before `Projects`:
```tsx
<NavTab to="/week" label="Week" count={0} />
```

Add a `↓` keydown handler to the `<nav>` element. Import `useLocation` from `react-router-dom` (it's already imported via `useNavigate` — check and add `useLocation` if missing):

Add `const location = useLocation();` in the component body.

Add `onKeyDown` to the `<nav>` element:
```tsx
<nav
  className="flex-1 min-w-0 flex items-stretch justify-center overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
  aria-label="Main views"
  onKeyDown={(e) => {
    if (e.key === "ArrowDown" && location.pathname === "/week") {
      e.preventDefault();
      const header = document.querySelector<HTMLElement>("[data-week-header]");
      header?.focus();
    }
  }}
>
```

- [ ] **Step 4: Run all tests**

```bash
npm run test --workspace=web
```

Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/components/layout/AppLayout.tsx apps/web/src/components/layout/Topbar.tsx
git commit -m "feat: wire /week route into router, AppLayout, and Topbar"
```

---

## Task 9: Manual smoke test

- [ ] **Start the dev server**

```bash
npm run dev
```

- [ ] **Verify: `/week` appears in Topbar nav and is reachable**

Open `http://localhost:5173`. Click **Week** in the nav — should land on `/week` with a 7-column grid.

- [ ] **Verify: today's column is highlighted**

Today's column should show an orange dot in the header and a slightly lighter background (`#111`).

- [ ] **Verify: mode toggle switches grouping**

Toggle Working ↔ Due — tasks should move between columns depending on their `workingDate` vs `dueDate`.

- [ ] **Verify: keyboard vertical spine**

1. Click a Topbar nav tab so it's focused.
2. Press `↓` — focus should jump to the week range header.
3. Press `↓` again — focus should jump to the first task in the first non-empty column.
4. Press `↑` — focus should return to the week header.
5. Press `↑` again — focus should return to the Topbar nav.

- [ ] **Verify: ←/→ on week header changes week, does not switch routes**

With the week header focused, press `←` and `→` — the week range label should change by 7 days. The route should stay at `/week`.

- [ ] **Verify: T resets to current week**

Navigate to a different week with `←`, then press `T` (not in an input) — should snap back to the current week.

- [ ] **Verify: M cycles mode**

Press `M` (not in an input) — mode toggle should switch Working ↔ Due.

- [ ] **Verify: ←/→ routes cycle through inbox → today → week → projects and back**

From `/inbox`, press `→` repeatedly — should cycle inbox → today → week → projects → inbox.
