/// <reference types="vitest" />
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";

vi.mock("../lib/supabase", () => ({
  supabase: { auth: {} },
}));

vi.mock("../lib/requestSync", () => ({
  registerSyncRunner: vi.fn(),
}));

const mockClearLocalDB = vi.fn().mockResolvedValue(undefined);
vi.mock("../lib/db", () => ({
  clearLocalDB: mockClearLocalDB,
}));

const { mockSync, mockSubscribe, mockBootstrap } = vi.hoisted(() => {
  const mockSync = vi.fn();
  const mockSubscribe = vi.fn().mockReturnValue(() => {});
  const mockBootstrap = vi.fn();
  return { mockSync, mockSubscribe, mockBootstrap };
});

vi.mock("../services/SyncService", () => ({
  SyncService: vi.fn(function MockSyncService() {
    return {
      sync: mockSync,
      subscribe: mockSubscribe,
      bootstrap: mockBootstrap,
    };
  }),
}));

// import AFTER mocks are declared
const { useSync } = await import("../hooks/useSync");

const fakeUser = { id: "user-1" } as User;

describe("useSync", () => {
  beforeEach(() => {
    mockSync.mockReset();
    mockSync.mockResolvedValue(undefined);
    mockSubscribe.mockReset();
    mockSubscribe.mockReturnValue(() => {});
    mockBootstrap.mockReset();
    mockBootstrap.mockResolvedValue(undefined);
    mockClearLocalDB.mockReset();
    mockClearLocalDB.mockResolvedValue(undefined);
    localStorage.clear();
  });

  it("returns local when user is null and no prior user", () => {
    const { result } = renderHook(() => useSync(null));
    expect(result.current).toBe("local");
    expect(mockClearLocalDB).not.toHaveBeenCalled();
  });

  it("clears DB on sign-out (user was previously set)", async () => {
    localStorage.setItem("sift_user_id", "user-1");
    const { result } = renderHook(() => useSync(null));
    await waitFor(() => expect(mockClearLocalDB).toHaveBeenCalled());
    expect(result.current).toBe("local");
  });

  it("calls bootstrap on first sign-in (no cursor)", async () => {
    const { result } = renderHook(() => useSync(fakeUser));
    await waitFor(() => expect(result.current).toBe("synced"));
    expect(mockBootstrap).toHaveBeenCalledWith("user-1");
    expect(mockSync).not.toHaveBeenCalled();
    expect(localStorage.getItem("sift_user_id")).toBe("user-1");
  });

  it("calls sync when same user and cursor already exists", async () => {
    localStorage.setItem("sift_user_id", "user-1");
    localStorage.setItem("speedy_last_synced_at", new Date().toISOString());
    const { result } = renderHook(() => useSync(fakeUser));
    await waitFor(() => expect(result.current).toBe("synced"));
    expect(mockSync).toHaveBeenCalledWith("user-1");
    expect(mockBootstrap).not.toHaveBeenCalled();
  });

  it("clears DB and bootstraps when userId changes", async () => {
    localStorage.setItem("sift_user_id", "old-user");
    localStorage.setItem("speedy_last_synced_at", new Date().toISOString());
    const { result } = renderHook(() => useSync(fakeUser));
    await waitFor(() => expect(result.current).toBe("synced"));
    expect(mockClearLocalDB).toHaveBeenCalled();
    expect(mockBootstrap).toHaveBeenCalledWith("user-1");
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("returns syncing while bootstrap is in progress", async () => {
    let resolveBootstrap!: () => void;
    mockBootstrap.mockReturnValue(
      new Promise<void>((res) => { resolveBootstrap = res; }),
    );
    const { result } = renderHook(() => useSync(fakeUser));
    expect(result.current).toBe("syncing");
    act(() => { resolveBootstrap(); });
    await waitFor(() => expect(result.current).toBe("synced"));
  });

  it("returns local after failed bootstrap", async () => {
    mockBootstrap.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useSync(fakeUser));
    await waitFor(() => expect(result.current).toBe("local"));
    expect(localStorage.getItem("sift_user_id")).toBeNull();
  });
});
