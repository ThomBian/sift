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
    const apr8Cell = () =>
      result.current.days.find(
        (d) => d.date.getMonth() === 3 && d.date.getDate() === 8,
      )!;
    const apr9Cell = () =>
      result.current.days.find(
        (d) => d.date.getMonth() === 3 && d.date.getDate() === 9,
      )!;
    await waitFor(() => expect(apr8Cell().count).toBe(2));
    expect(apr9Cell().count).toBe(1);
  });

  it("counts sibling-month days too", async () => {
    // Mar 31 2026 (Tuesday) is a leading sibling cell in April's grid (cell index 1).
    const mar31 = new Date(2026, 2, 31, 14, 0, 0);
    await db.tasks.add(makeTask({ id: "leading", status: "todo", workingDate: mar31 }));

    const { result } = renderHook(() =>
      useMonthTasks(new Date(2026, 3, 1), "working"),
    );
    await waitFor(() => expect(result.current.days.length).toBe(42));
    const cellFinder = () =>
      result.current.days.find(
        (d) => d.date.getMonth() === 2 && d.date.getDate() === 31,
      )!;
    await waitFor(() => expect(cellFinder().count).toBe(1));
    expect(cellFinder().isCurrentMonth).toBe(false);
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
    await waitFor(() => {
      const apr10Cell = due.result.current.days.find(
        (d) => d.date.getMonth() === 3 && d.date.getDate() === 10,
      )!;
      expect(apr10Cell.active.map((t) => t.id)).toContain("due");
    });

    const completed = renderHook(() => useMonthTasks(month, "completed"));
    await waitFor(() => expect(completed.result.current.days.length).toBe(42));
    await waitFor(() =>
      expect(
        completed.result.current.days.find(
          (d) => d.date.getMonth() === 3 && d.date.getDate() === 12,
        )!.completed.map((t) => t.id),
      ).toEqual(["done"]),
    );
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
});
