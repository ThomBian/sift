// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db } from "../lib/db";
import {
  useInboxTasks,
  useTodayTasks,
  useProjectTasks,
} from "../hooks/useTasks";
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

function yesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

beforeEach(async () => {
  await db.tasks.clear();
  await db.projects.clear();
  await db.spaces.clear();
  await db.spaces.add(makeSpace());
  await db.projects.add(makeProject());
});

describe("useInboxTasks", () => {
  it("returns tasks with workingDate null and non-terminal status", async () => {
    await db.tasks.bulkAdd([
      makeTask({ id: "t1", status: "inbox", workingDate: null }),
      makeTask({ id: "t2", status: "todo", workingDate: today() }),
      makeTask({ id: "t3", status: "done", workingDate: null }),
      makeTask({ id: "t4", status: "archived", workingDate: null }),
    ]);

    const { result } = renderHook(() => useInboxTasks());
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe("t1");
  });

  it("returns empty array when no inbox tasks exist", async () => {
    const { result } = renderHook(() => useInboxTasks());
    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current).toHaveLength(0);
  });
});

describe("useTodayTasks", () => {
  it("returns tasks where workingDate <= today and status is not done/archived", async () => {
    await db.tasks.bulkAdd([
      makeTask({ id: "t1", status: "todo", workingDate: today() }),
      makeTask({ id: "t2", status: "todo", workingDate: yesterday() }),
      makeTask({ id: "t3", status: "todo", workingDate: tomorrow() }),
      makeTask({ id: "t4", status: "done", workingDate: today() }),
      makeTask({ id: "t5", status: "archived", workingDate: yesterday() }),
    ]);

    const { result } = renderHook(() => useTodayTasks());
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));

    const ids = result.current.map((t) => t.id).sort();
    expect(ids).toEqual(["t1", "t2"]);
  });

  it("includes tasks whose workingDate is later same calendar day than midnight (not only midnight)", async () => {
    const noonToday = new Date();
    noonToday.setHours(14, 51, 43, 441);

    await db.tasks.bulkAdd([
      makeTask({ id: "t-midday", status: "todo", workingDate: noonToday }),
      makeTask({ id: "t-tomorrow", status: "todo", workingDate: tomorrow() }),
    ]);

    const { result } = renderHook(() => useTodayTasks());
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));

    expect(result.current.map((t) => t.id).sort()).toEqual(["t-midday"]);
  });

  it("orders by dueDate ascending, null due dates last", async () => {
    const d1 = new Date();
    d1.setDate(d1.getDate() + 3);
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date();
    d2.setDate(d2.getDate() + 1);
    d2.setHours(0, 0, 0, 0);

    await db.tasks.bulkAdd([
      makeTask({
        id: "t-later",
        status: "todo",
        workingDate: today(),
        dueDate: d1,
      }),
      makeTask({
        id: "t-soon",
        status: "todo",
        workingDate: today(),
        dueDate: d2,
      }),
      makeTask({
        id: "t-none",
        status: "todo",
        workingDate: today(),
        dueDate: null,
      }),
    ]);

    const { result } = renderHook(() => useTodayTasks());
    await waitFor(() => expect(result.current.length).toBe(3));

    expect(result.current.map((t) => t.id)).toEqual([
      "t-soon",
      "t-later",
      "t-none",
    ]);
  });

  it("ties on dueDate break by project name", async () => {
    const sameDue = new Date();
    sameDue.setDate(sameDue.getDate() + 2);
    sameDue.setHours(0, 0, 0, 0);

    await db.projects.bulkAdd([
      makeProject({ id: "proj-zebra", name: "Zebra" }),
      makeProject({ id: "proj-ant", name: "Ant Farm" }),
    ]);

    await db.tasks.bulkAdd([
      makeTask({
        id: "t-z",
        projectId: "proj-zebra",
        status: "todo",
        workingDate: today(),
        dueDate: sameDue,
      }),
      makeTask({
        id: "t-a",
        projectId: "proj-ant",
        status: "todo",
        workingDate: today(),
        dueDate: sameDue,
      }),
    ]);

    const { result } = renderHook(() => useTodayTasks());
    await waitFor(() => expect(result.current.length).toBe(2));

    expect(result.current.map((t) => t.id)).toEqual(["t-a", "t-z"]);
  });

  it("when due dates differ across projects, orders by due date before project name", async () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 1);
    soon.setHours(0, 0, 0, 0);
    const late = new Date();
    late.setDate(late.getDate() + 10);
    late.setHours(0, 0, 0, 0);

    await db.projects.bulkAdd([
      makeProject({ id: "proj-apple", name: "Apple" }),
      makeProject({ id: "proj-banana", name: "Banana" }),
    ]);

    await db.tasks.bulkAdd([
      makeTask({
        id: "t-banana-soon",
        projectId: "proj-banana",
        status: "todo",
        workingDate: today(),
        dueDate: soon,
      }),
      makeTask({
        id: "t-apple-late",
        projectId: "proj-apple",
        status: "todo",
        workingDate: today(),
        dueDate: late,
      }),
    ]);

    const { result } = renderHook(() => useTodayTasks());
    await waitFor(() => expect(result.current.length).toBe(2));

    expect(result.current.map((t) => t.id)).toEqual([
      "t-banana-soon",
      "t-apple-late",
    ]);
  });

  it("ties on dueDate place tasks without a project after those with one", async () => {
    const sameDue = new Date();
    sameDue.setDate(sameDue.getDate() + 5);
    sameDue.setHours(0, 0, 0, 0);

    await db.tasks.bulkAdd([
      makeTask({
        id: "t-unn",
        projectId: null,
        status: "todo",
        workingDate: today(),
        dueDate: sameDue,
      }),
      makeTask({
        id: "t-gen",
        projectId: "project-1",
        status: "todo",
        workingDate: today(),
        dueDate: sameDue,
      }),
    ]);

    const { result } = renderHook(() => useTodayTasks());
    await waitFor(() => expect(result.current.length).toBe(2));

    expect(result.current.map((t) => t.id)).toEqual(["t-gen", "t-unn"]);
  });
});

describe("useProjectTasks", () => {
  it("groups tasks by space then project", async () => {
    const space2 = makeSpace({
      id: "space-2",
      name: "Personal",
      color: "#4ade80",
    });
    const project2 = makeProject({
      id: "project-2",
      name: "Errands",
      spaceId: "space-2",
    });
    await db.spaces.add(space2);
    await db.projects.add(project2);

    await db.tasks.bulkAdd([
      makeTask({ id: "t1", projectId: "project-1", status: "todo" }),
      makeTask({ id: "t2", projectId: "project-2", status: "inbox" }),
    ]);

    const { result } = renderHook(() => useProjectTasks());
    await waitFor(() => expect(result.current[0].length).toBeGreaterThan(0));

    const [groups] = result.current;
    expect(groups).toHaveLength(2);
    const workSpace = groups.find((g) => g.space.id === "space-1");
    const personalSpace = groups.find((g) => g.space.id === "space-2");

    expect(workSpace).toBeDefined();
    expect(workSpace!.projects[0].tasks).toHaveLength(1);
    expect(workSpace!.archivedProjects).toHaveLength(0);
    expect(personalSpace).toBeDefined();
    expect(personalSpace!.projects[0].tasks).toHaveLength(1);
    expect(personalSpace!.archivedProjects).toHaveLength(0);
  });

  it("includes done tasks in project groups (for progress bars)", async () => {
    await db.tasks.bulkAdd([
      makeTask({ id: "t1", status: "todo" }),
      makeTask({ id: "t2", status: "done" }),
    ]);

    const { result } = renderHook(() => useProjectTasks());
    await waitFor(() => expect(result.current[0].length).toBeGreaterThan(0));

    expect(result.current[0][0].projects[0].tasks).toHaveLength(2);
  });

  it("splits active vs archived projects and returns archivedCount", async () => {
    await db.projects.add(
      makeProject({
        id: "project-arch",
        name: "Old",
        spaceId: "space-1",
        archived: true,
      }),
    );
    await db.tasks.bulkAdd([
      makeTask({ id: "t1", status: "todo" }),
      makeTask({ id: "t-arch", projectId: "project-arch", status: "todo" }),
    ]);

    const { result } = renderHook(() => useProjectTasks());
    await waitFor(() => expect(result.current[1]).toBe(1));

    const [groups, archivedCount] = result.current;
    expect(archivedCount).toBe(1);
    const work = groups.find((g) => g.space.id === "space-1");
    expect(work!.projects).toHaveLength(1);
    expect(work!.projects[0].project.id).toBe("project-1");
    expect(work!.archivedProjects).toHaveLength(1);
    expect(work!.archivedProjects[0].project.id).toBe("project-arch");
    expect(work!.archivedProjects[0].tasks).toHaveLength(1);
  });

  it("includes archived-status tasks under archived projects (e.g. after project archive)", async () => {
    await db.projects.add(
      makeProject({
        id: "project-arch",
        name: "Old",
        spaceId: "space-1",
        archived: true,
      }),
    );
    const completedAt = new Date();
    await db.tasks.bulkAdd([
      makeTask({ id: "t1", status: "todo" }),
      makeTask({
        id: "t-done-arch",
        projectId: "project-arch",
        status: "archived",
        completedAt,
      }),
    ]);

    const { result } = renderHook(() => useProjectTasks());
    await waitFor(() => expect(result.current[1]).toBe(1));

    const [groups] = result.current;
    const work = groups.find((g) => g.space.id === "space-1");
    const archGroup = work!.archivedProjects.find(
      (g) => g.project.id === "project-arch",
    );
    expect(archGroup?.tasks).toHaveLength(1);
    expect(archGroup?.tasks[0].status).toBe("archived");
    expect(archGroup?.tasks[0].completedAt).toEqual(completedAt);
  });
});
