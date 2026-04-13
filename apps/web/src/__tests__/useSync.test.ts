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

const { mockSync, mockSubscribe } = vi.hoisted(() => {
  const mockSync = vi.fn();
  const mockSubscribe = vi.fn().mockReturnValue(() => {});
  return { mockSync, mockSubscribe };
});

vi.mock("../services/SyncService", () => ({
  SyncService: vi.fn(function MockSyncService() {
    return {
      sync: mockSync,
      subscribe: mockSubscribe,
    };
  }),
}));

// import AFTER mocks are declared
const { useSync } = await import("../hooks/useSync");

const fakeUser = { id: "user-1" } as User;

describe("useSync", () => {
  beforeEach(() => {
    mockSync.mockReset();
    mockSubscribe.mockReset();
    mockSubscribe.mockReturnValue(() => {});
  });

  it("returns local when user is null", () => {
    const { result } = renderHook(() => useSync(null));
    expect(result.current).toBe("local");
  });

  it("returns syncing while sync is in progress", async () => {
    let resolveSync!: () => void;
    mockSync.mockReturnValue(new Promise<void>((res) => { resolveSync = res; }));
    const { result } = renderHook(() => useSync(fakeUser));
    expect(result.current).toBe("syncing");
    act(() => { resolveSync(); });
    await waitFor(() => expect(result.current).toBe("synced"));
  });

  it("returns synced after successful sync", async () => {
    mockSync.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSync(fakeUser));
    await waitFor(() => expect(result.current).toBe("synced"));
  });

  it("returns local after failed sync", async () => {
    mockSync.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useSync(fakeUser));
    await waitFor(() => expect(result.current).toBe("local"));
  });
});
