// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useTasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useTasks")>();
  return {
    ...actual,
    useTasks: vi.fn().mockReturnValue([]),
  };
});

const { useAuth } = await import("../contexts/AuthContext");
const { default: AppLayout } = await import("../components/layout/AppLayout");

const syncStatus = "synced" as const;

afterEach(() => {
  cleanup();
});

describe("AppLayout ←/→ main view navigation", () => {
  it("cycles from /month toward /projects when focus is on main view tabs", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signInWithGoogle: vi.fn(() => Promise.resolve()),
      signInWithMagicLink: vi.fn(() => Promise.resolve()),
      signOut: vi.fn(() => Promise.resolve()),
    });

    render(
      <MemoryRouter initialEntries={["/month"]}>
        <Routes>
          <Route path="/" element={<AppLayout syncStatus={syncStatus} />}>
            <Route
              path="month"
              element={
                <div data-testid="month-body" data-month-view-root>
                  <button type="button">mock day</button>
                </div>
              }
            />
            <Route path="projects" element={<div data-testid="projects-body" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const tab = document.querySelector(
      'nav[aria-label="Main views"] a[href="/month"]',
    ) as HTMLElement;
    expect(tab).toBeTruthy();
    tab.focus();

    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() =>
      expect(screen.getByTestId("projects-body")).toBeInTheDocument(),
    );
  });

  it("does not change views from /month when focus is on the calendar surface", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signInWithGoogle: vi.fn(() => Promise.resolve()),
      signInWithMagicLink: vi.fn(() => Promise.resolve()),
      signOut: vi.fn(() => Promise.resolve()),
    });

    render(
      <MemoryRouter initialEntries={["/month"]}>
        <Routes>
          <Route path="/" element={<AppLayout syncStatus={syncStatus} />}>
            <Route
              path="month"
              element={
                <div data-testid="month-body" data-month-view-root>
                  <button type="button">mock day</button>
                </div>
              }
            />
            <Route path="projects" element={<div data-testid="projects-body" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    screen.getByRole("button", { name: "mock day" }).focus();
    expect(document.activeElement?.textContent).toBe("mock day");

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(screen.getByTestId("month-body")).toBeInTheDocument();
    expect(screen.queryByTestId("projects-body")).not.toBeInTheDocument();
  });
});
