/// <reference types="vitest" />
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useTasks", () => ({
  useTasks: vi.fn().mockReturnValue([]),
}));

const { useAuth } = await import("../contexts/AuthContext");
const { default: Topbar } = await import("../components/layout/Topbar");

function mockAuth(user: User | null) {
  const auth = vi.mocked(useAuth);
  auth.mockReset();
  auth.mockReturnValue({
    user,
    session: null,
    loading: false,
    signInWithGoogle: vi.fn(() => Promise.resolve()),
    signInWithMagicLink: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => Promise.resolve()),
  });
}

afterEach(() => {
  cleanup();
});

function renderTopbar(user: User | null, syncStatus: "local" | "syncing" | "synced" = "local") {
  mockAuth(user);
  return render(
    <MemoryRouter>
      <Topbar syncStatus={syncStatus} />
    </MemoryRouter>
  );
}

describe("Topbar", () => {
  it("shows sign-in button when user is null", () => {
    renderTopbar(null);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("hides sign-in button when user exists", () => {
    renderTopbar({ id: "u1", email: "a@b.com" } as User);
    expect(screen.queryByRole("button", { name: /sign in/i })).toBeNull();
  });

  it("renders synced icon with no spin when syncStatus is synced", () => {
    const { container } = renderTopbar(null, "synced");
    const icon = container.querySelector("[data-sync-status='synced']");
    expect(icon).toBeInTheDocument();
  });
});
