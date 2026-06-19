// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db } from "../lib/db";
import { useFaviconBadge } from "../hooks/useFaviconBadge";
import type { Task } from "@sift/shared";

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function makeTodayTask(id: string): Task {
  const now = new Date();
  return {
    id,
    title: "t",
    projectId: "project-1",
    status: "todo",
    workingDate: todayDate(),
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    url: null,
    synced: true,
  };
}

function iconHref(): string | null {
  return document
    .querySelector<HTMLLinkElement>('link[rel="icon"]')
    ?.getAttribute("href") ?? null;
}

beforeEach(async () => {
  await db.tasks.clear();
  document.title = "Sift";
  document.head.innerHTML = "";
});

describe("useFaviconBadge", () => {
  it("reflects the today count in title and favicon", async () => {
    await db.tasks.bulkAdd([makeTodayTask("a"), makeTodayTask("b")]);
    const { unmount } = renderHook(() => useFaviconBadge());

    await waitFor(() => {
      expect(document.title).toBe("(2) Sift");
    });
    expect(iconHref()).toMatch(/^data:image\/svg\+xml,/);
    expect(decodeURIComponent(iconHref()!)).toContain(">2<");

    unmount();
    expect(document.title).toBe("Sift");
    expect(iconHref()).toBe("/favicon.svg");
  });

  it("shows plain title and favicon when empty", async () => {
    const { unmount } = renderHook(() => useFaviconBadge());
    await waitFor(() => {
      expect(document.title).toBe("Sift");
    });
    expect(decodeURIComponent(iconHref()!)).not.toContain("<circle");
    unmount();
  });
});
