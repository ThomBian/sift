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

  it("ArrowRight moves focus to next day after load without manually focusing a cell", async () => {
    renderMonth();
    await waitFor(() =>
      expect(document.querySelectorAll("[data-month-day-index]").length).toBe(
        42,
      ),
    );
    await waitFor(() => {
      const active = document.activeElement as HTMLElement | null;
      expect(active?.dataset.monthDayIndex).toBeDefined();
    });
    const startIdx = Number(
      (document.activeElement as HTMLElement).dataset.monthDayIndex,
    );
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => {
      const active = document.activeElement as HTMLElement | null;
      expect(active?.dataset.monthDayIndex).toBe(String(startIdx + 1));
    });
  });

  it("ArrowRight moves focus to next day when today is focused", async () => {
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

  it("ArrowRight on month header advances month, keeps header focus, preserves day-of-month", async () => {
    renderMonth();
    await waitFor(() =>
      expect(document.querySelectorAll("[data-month-day-index]").length).toBe(
        42,
      ),
    );
    const header = document.querySelector<HTMLElement>("[data-month-header]");
    expect(header).not.toBeNull();
    header!.focus();
    expect(document.activeElement).toBe(header);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() => {
      const h = document.querySelector<HTMLElement>("[data-month-header]");
      expect(document.activeElement).toBe(h);
      expect(h?.getAttribute("aria-label")).toMatch(/May 2026/i);
      const sel = document.querySelector<HTMLElement>(
        '[data-month-grid] [data-month-day-index][tabindex="0"]',
      );
      expect(sel?.getAttribute("aria-label")).toContain("May 15 2026");
    });
  });

  it("month header preserves last valid day (Mar 31 → Apr 30)", async () => {
    vi.setSystemTime(new Date(2026, 2, 31, 9, 0, 0));
    renderMonth();
    await waitFor(() =>
      expect(document.querySelectorAll("[data-month-day-index]").length).toBe(
        42,
      ),
    );
    const header = document.querySelector<HTMLElement>("[data-month-header]");
    header!.focus();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => {
      expect(header!.getAttribute("aria-label")).toMatch(/April 2026/i);
      const sel = document.querySelector<HTMLElement>(
        '[data-month-grid] [data-month-day-index][tabindex="0"]',
      );
      expect(sel?.getAttribute("aria-label")).toContain("Apr 30 2026");
    });
  });

  it("lists a task under the month panel when a task exists for that day", async () => {
    await db.tasks.add(
      makeTask({
        id: "panel-task",
        status: "todo",
        workingDate: new Date(2026, 3, 15, 10, 0, 0),
      }),
    );
    renderMonth();
    await screen.findByText("Test task");
    await waitFor(() =>
      expect(document.querySelector("[data-month-panel]")).not.toBeNull(),
    );
  });
});
