// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { startOfWeek, addDays } from "date-fns";
import { db } from "../lib/db";
import { useWeekTasks, type WeekMode } from "../hooks/useWeekTasks";
import type { Project, Space, Task } from "@sift/shared";

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
    emoji: "📚",
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

function mondayOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function taskDateForWeek(anchorMonday: Date, dayOffset: number): Date {
  const date = addDays(anchorMonday, dayOffset);
  date.setHours(14, 30, 0, 0);
  return date;
}

async function seedBaseData(): Promise<void> {
  await db.spaces.add(makeSpace());
  await db.projects.bulkAdd([
    makeProject({ id: "project-a", name: "Alpha" }),
    makeProject({ id: "project-z", name: "Zebra" }),
  ]);
}

function useWeek(anchorMonday: Date, mode: WeekMode) {
  return renderHook(() => useWeekTasks(anchorMonday, mode));
}

beforeEach(async () => {
  await db.tasks.clear();
  await db.projects.clear();
  await db.spaces.clear();
  await seedBaseData();
});

describe("useWeekTasks", () => {
  it("always returns seven Monday-Sunday buckets", async () => {
    const anchorMonday = mondayOf(new Date("2026-04-22T08:00:00"));
    const { result } = useWeek(anchorMonday, "working");

    await waitFor(() => expect(result.current.days.length).toBe(7));

    expect(result.current.days[0].date.getDay()).toBe(1);
    expect(result.current.days[6].date.getDay()).toBe(0);
  });

  it("groups by workingDate in working mode and by dueDate in due mode", async () => {
    const anchorMonday = mondayOf(new Date("2026-04-22T08:00:00"));
    const tuesday = taskDateForWeek(anchorMonday, 1);
    const thursday = taskDateForWeek(anchorMonday, 3);

    await db.tasks.bulkAdd([
      makeTask({
        id: "working-hit",
        status: "todo",
        projectId: "project-a",
        workingDate: tuesday,
        dueDate: null,
      }),
      makeTask({
        id: "due-hit",
        status: "todo",
        projectId: "project-z",
        workingDate: null,
        dueDate: thursday,
      }),
    ]);

    const working = useWeek(anchorMonday, "working");
    await waitFor(() =>
      expect(working.result.current.days[1].active.map((t) => t.id)).toContain(
        "working-hit",
      ),
    );
    expect(working.result.current.days[3].active.map((t) => t.id)).not.toContain(
      "due-hit",
    );

    const due = useWeek(anchorMonday, "due");
    await waitFor(() =>
      expect(due.result.current.days[3].active.map((t) => t.id)).toContain(
        "due-hit",
      ),
    );
    expect(due.result.current.days[1].active.map((t) => t.id)).not.toContain(
      "working-hit",
    );
  });

  it("keeps active and completed in separate ordered buckets", async () => {
    const anchorMonday = mondayOf(new Date("2026-04-22T08:00:00"));
    const monday = taskDateForWeek(anchorMonday, 0);
    const soon = addDays(anchorMonday, 1);
    const later = addDays(anchorMonday, 4);

    await db.tasks.bulkAdd([
      makeTask({
        id: "active-soon",
        status: "todo",
        projectId: "project-z",
        workingDate: monday,
        dueDate: soon,
      }),
      makeTask({
        id: "active-later",
        status: "inbox",
        projectId: "project-a",
        workingDate: monday,
        dueDate: later,
      }),
      makeTask({
        id: "done-item",
        status: "done",
        projectId: "project-a",
        workingDate: monday,
        dueDate: soon,
      }),
    ]);

    const { result } = useWeek(anchorMonday, "working");
    await waitFor(() =>
      expect(result.current.days[0].active.map((t) => t.id)).toEqual([
        "active-soon",
        "active-later",
      ]),
    );
    expect(result.current.days[0].completed.map((t) => t.id)).toEqual([
      "done-item",
    ]);
  });

  it("in working/due mode, done tasks follow working or due date, not completedAt", async () => {
    const anchorMonday = mondayOf(new Date("2026-04-22T08:00:00"));
    const monday = taskDateForWeek(anchorMonday, 0);
    const wednesday = taskDateForWeek(anchorMonday, 2);

    await db.tasks.add(
      makeTask({
        id: "done-wed",
        status: "done",
        projectId: "project-a",
        workingDate: monday,
        dueDate: null,
        completedAt: wednesday,
      }),
    );

    const { result } = useWeek(anchorMonday, "working");
    await waitFor(() =>
      expect(result.current.days[0].completed.map((t) => t.id)).toEqual([
        "done-wed",
      ]),
    );
    expect(result.current.days[2].completed.map((t) => t.id)).toEqual([]);
  });

  it("completed mode buckets only done tasks by completedAt day", async () => {
    const anchorMonday = mondayOf(new Date("2026-04-22T08:00:00"));
    const monday = taskDateForWeek(anchorMonday, 0);
    const wednesday = taskDateForWeek(anchorMonday, 2);

    await db.tasks.bulkAdd([
      makeTask({
        id: "active-only",
        status: "todo",
        projectId: "project-a",
        workingDate: monday,
        dueDate: null,
      }),
      makeTask({
        id: "done-wed",
        status: "done",
        projectId: "project-a",
        workingDate: monday,
        dueDate: null,
        completedAt: wednesday,
      }),
      makeTask({
        id: "done-no-time",
        status: "done",
        projectId: "project-z",
        workingDate: monday,
        dueDate: null,
        completedAt: null,
      }),
    ]);

    const { result } = useWeek(anchorMonday, "completed");
    await waitFor(() =>
      expect(result.current.days[2].completed.map((t) => t.id)).toEqual([
        "done-wed",
      ]),
    );
    expect(result.current.days[0].active.map((t) => t.id)).toEqual([]);
    expect(result.current.days[0].completed.map((t) => t.id)).toEqual([]);
    const allActive = result.current.days.flatMap((d) => d.active);
    expect(allActive.map((t) => t.id)).not.toContain("active-only");
    const allDone = result.current.days.flatMap((d) => d.completed);
    expect(allDone.map((t) => t.id)).not.toContain("done-no-time");
  });

  it("excludes archived tasks and tasks outside the viewed week", async () => {
    const anchorMonday = mondayOf(new Date("2026-04-22T08:00:00"));
    const monday = taskDateForWeek(anchorMonday, 0);
    const nextWeekMonday = taskDateForWeek(addDays(anchorMonday, 7), 0);

    await db.tasks.bulkAdd([
      makeTask({
        id: "inside",
        status: "todo",
        workingDate: monday,
      }),
      makeTask({
        id: "archived-inside",
        status: "archived",
        workingDate: monday,
      }),
      makeTask({
        id: "outside-week",
        status: "todo",
        workingDate: nextWeekMonday,
      }),
    ]);

    const { result } = useWeek(anchorMonday, "working");
    await waitFor(() =>
      expect(result.current.days[0].active.map((t) => t.id)).toEqual(["inside"]),
    );
    const allIds = result.current.days.flatMap((d) => [
      ...d.active.map((t) => t.id),
      ...d.completed.map((t) => t.id),
    ]);
    expect(allIds).not.toContain("archived-inside");
    expect(allIds).not.toContain("outside-week");
  });
});
