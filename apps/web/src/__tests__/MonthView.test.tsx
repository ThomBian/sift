// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
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

afterEach(() => {
  cleanup();
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
      expect(document.querySelectorAll("[data-month-day-index]").length).toBe(
        42,
      ),
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
      expect(document.querySelectorAll("[data-month-day-index]").length).toBe(
        42,
      ),
    );
    fireEvent.keyDown(window, { key: "v" });
    await waitFor(() =>
      expect(screen.getByTestId("week-page")).toBeInTheDocument(),
    );
  });

  it("ArrowRight moves focus to next day", async () => {
    renderMonth();
    await waitFor(() =>
      expect(document.querySelectorAll("[data-month-day-index]").length).toBe(
        42,
      ),
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
      expect(document.querySelectorAll("[data-month-day-index]").length).toBe(
        42,
      ),
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
