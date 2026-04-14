# Cloud Bootstrap Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After sign-in, any fresh browser context shows the same data as cloud; user switches wipe local DB; orphan seed rows are pruned on bootstrap.

**Architecture:** On first sign-in (or user switch), run a one-shot `bootstrap()` that does a full pull from Supabase, prunes empty seed rows, and pushes pre-login tasks. Subsequent syncs are incremental. A `sift_user_id` key in `localStorage` tracks DB ownership so user switches trigger a wipe. Realtime subscription is expanded from `tasks` to all three tables.

**Tech Stack:** Dexie.js (IndexedDB), Supabase JS client, React hooks, Vitest + Testing Library + fake-indexeddb

---

## File Map

| File | Change |
|------|--------|
| `packages/shared/src/db.ts` | Add `clearLocalDB()` export |
| `apps/web/src/lib/db.ts` | Re-export `clearLocalDB` |
| `apps/web/src/services/SyncService.ts` | Add `bootstrap(userId)`, expand `subscribe()` |
| `apps/web/src/hooks/useSync.ts` | Replace initial `runSync` with `initialize()`, handle sign-out wipe |
| `apps/web/src/__tests__/SyncService.test.ts` | Tests for `clearLocalDB`, `bootstrap`, updated `subscribe` |
| `apps/web/src/__tests__/useSync.test.ts` | Tests for initialize logic and sign-out wipe |

---

## Task 1: Add `clearLocalDB()` to shared db

**Files:**
- Modify: `packages/shared/src/db.ts`
- Modify: `apps/web/src/lib/db.ts`
- Test: `apps/web/src/__tests__/SyncService.test.ts`

- [ ] **Step 1: Write failing test**

Add a new `describe` block at the bottom of `apps/web/src/__tests__/SyncService.test.ts` (before the final `}`):

```ts
describe("clearLocalDB()", () => {
  it("clears all spaces, projects, and tasks", async () => {
    await db.spaces.add(makeSpace());
    await db.projects.add(makeProject());
    await db.tasks.add(makeTask());

    await clearLocalDB();

    expect(await db.spaces.count()).toBe(0);
    expect(await db.projects.count()).toBe(0);
    expect(await db.tasks.count()).toBe(0);
  });

  it("is idempotent on empty db", async () => {
    await expect(clearLocalDB()).resolves.toBeUndefined();
  });
});
```

Also add to the imports at the top of the file:
```ts
import { db, clearLocalDB } from "../lib/db";
```

(Replace the existing `import { db } from "../lib/db";`)

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run apps/web/src/__tests__/SyncService.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: `Error: clearLocalDB is not a function` or similar import error.

- [ ] **Step 3: Implement `clearLocalDB` in `packages/shared/src/db.ts`**

Add after the `export const db = new AppDatabase();` line:

```ts
export async function clearLocalDB(): Promise<void> {
  await db.transaction("rw", [db.spaces, db.projects, db.tasks], () =>
    Promise.all([db.spaces.clear(), db.projects.clear(), db.tasks.clear()]),
  );
}
```

- [ ] **Step 4: Re-export from `apps/web/src/lib/db.ts`**

Replace the file content:

```ts
export { db, clearLocalDB } from "@sift/shared";
```

- [ ] **Step 5: Build shared package so web app can resolve it**

```bash
npm run build --workspace=@sift/shared 2>&1 | tail -10
```

Expected: build succeeds with no errors.

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx vitest run apps/web/src/__tests__/SyncService.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all tests pass including the two new `clearLocalDB` tests.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/db.ts apps/web/src/lib/db.ts apps/web/src/__tests__/SyncService.test.ts
git commit -m "feat: add clearLocalDB utility to wipe all Dexie tables"
```

---

## Task 2: Add `SyncService.bootstrap()`

**Files:**
- Modify: `apps/web/src/services/SyncService.ts`
- Modify: `apps/web/src/__tests__/SyncService.test.ts`

### Background

`bootstrap()` differs from `sync()` in two ways:
1. It pulls **all** records for the user (no `updated_at` filter), using `.eq("user_id", userId)`.
2. After writing cloud data, it prunes local orphan seeds: `synced: false` projects with no tasks, then `synced: false` spaces with no remaining projects.

The existing mock uses `mockGt` for the `.gt()` chained on `.select()`. Bootstrap uses `.eq()` instead. You need to add `mockEq` to the mock infrastructure and update `createMockSupabase`.

- [ ] **Step 1: Update mock infrastructure in `SyncService.test.ts`**

Replace the top of the file through `createMockSupabase` with:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { db, clearLocalDB } from "../lib/db";
import { SyncService } from "../services/SyncService";
import type { Space, Project, Task } from "@sift/shared";

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockGt = vi.fn();
const mockEq = vi.fn();

function createMockSupabase() {
  const mockSelect = vi.fn(() => ({
    gt: (_col: string, _v: string) => mockGt(),
    eq: (_col: string, _v: string) => mockEq(),
  }));

  return {
    from: vi.fn(() => ({
      upsert: mockUpsert,
      select: mockSelect,
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  };
}
```

Also update `beforeEach` to reset `mockEq` and clear `localStorage`:

```ts
beforeEach(async () => {
  await db.tasks.clear();
  await db.projects.clear();
  await db.spaces.clear();
  localStorage.clear();
  vi.clearAllMocks();
  mockUpsert.mockResolvedValue({ error: null });
  mockGt.mockReset();
  mockGt.mockResolvedValue({ data: [], error: null });
  mockEq.mockReset();
  mockEq.mockResolvedValue({ data: [], error: null });
});
```

- [ ] **Step 2: Run existing tests to confirm no regressions**

```bash
npx vitest run apps/web/src/__tests__/SyncService.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all existing tests still pass.

- [ ] **Step 3: Write failing bootstrap tests**

Add a new `describe("bootstrap()")` block in `SyncService.test.ts`:

```ts
describe("bootstrap()", () => {
  it("writes all cloud spaces/projects/tasks to Dexie", async () => {
    const remoteSpace = makeSpace({ id: "cloud-space", synced: true });
    const remoteProject = makeProject({ id: "cloud-project", spaceId: "cloud-space", synced: true });
    const remoteTask = makeTask({ id: "cloud-task", projectId: "cloud-project", synced: true });

    mockEq
      .mockResolvedValueOnce({
        data: [{
          id: remoteSpace.id, name: remoteSpace.name, color: remoteSpace.color,
          created_at: remoteSpace.createdAt.toISOString(),
          updated_at: remoteSpace.updatedAt.toISOString(),
          user_id: "user-1",
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{
          id: remoteProject.id, name: remoteProject.name, emoji: remoteProject.emoji,
          space_id: remoteProject.spaceId, archived: false, url: null,
          due_date: null,
          created_at: remoteProject.createdAt.toISOString(),
          updated_at: remoteProject.updatedAt.toISOString(),
          user_id: "user-1",
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{
          id: remoteTask.id, title: remoteTask.title,
          project_id: remoteTask.projectId, status: remoteTask.status,
          working_date: null, due_date: null, completed_at: null, url: null,
          created_at: remoteTask.createdAt.toISOString(),
          updated_at: remoteTask.updatedAt.toISOString(),
          user_id: "user-1",
        }],
        error: null,
      });

    const svc = new SyncService(createMockSupabase() as never);
    await svc.bootstrap("user-1");

    expect(await db.spaces.get("cloud-space")).toBeDefined();
    expect(await db.projects.get("cloud-project")).toBeDefined();
    expect(await db.tasks.get("cloud-task")).toBeDefined();
  });

  it("prunes unsynced seed space and project when they have no tasks", async () => {
    await db.spaces.add(makeSpace({ id: "seed-space", synced: false }));
    await db.projects.add(makeProject({ id: "seed-project", spaceId: "seed-space", synced: false }));
    // mockEq returns empty cloud data (new user, nothing in cloud yet)

    const svc = new SyncService(createMockSupabase() as never);
    await svc.bootstrap("user-1");

    expect(await db.spaces.get("seed-space")).toBeUndefined();
    expect(await db.projects.get("seed-project")).toBeUndefined();
  });

  it("keeps unsynced project that has a task (not a seed)", async () => {
    await db.spaces.add(makeSpace({ id: "real-space", synced: false }));
    await db.projects.add(makeProject({ id: "real-project", spaceId: "real-space", synced: false }));
    await db.tasks.add(makeTask({ id: "real-task", projectId: "real-project", synced: false }));

    const svc = new SyncService(createMockSupabase() as never);
    await svc.bootstrap("user-1");

    expect(await db.projects.get("real-project")).toBeDefined();
    expect(await db.spaces.get("real-space")).toBeDefined();
  });

  it("pushes unsynced local tasks to Supabase", async () => {
    await db.tasks.add(makeTask({ id: "pre-login-task", projectId: null, synced: false }));

    const mockSupabase = createMockSupabase();
    const svc = new SyncService(mockSupabase as never);
    await svc.bootstrap("user-1");

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "pre-login-task", user_id: "user-1" }),
      ]),
      expect.objectContaining({ onConflict: "id" }),
    );
  });

  it("marks pushed pre-login tasks as synced", async () => {
    await db.tasks.add(makeTask({ id: "pre-login-task", projectId: null, synced: false }));

    const svc = new SyncService(createMockSupabase() as never);
    await svc.bootstrap("user-1");

    const stored = await db.tasks.get("pre-login-task");
    expect(stored!.synced).toBe(true);
  });

  it("sets speedy_last_synced_at after bootstrap", async () => {
    const svc = new SyncService(createMockSupabase() as never);
    await svc.bootstrap("user-1");
    expect(localStorage.getItem("speedy_last_synced_at")).not.toBeNull();
  });
});
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
npx vitest run apps/web/src/__tests__/SyncService.test.ts --reporter=verbose 2>&1 | grep -E "(FAIL|PASS|bootstrap)" | head -20
```

Expected: all `bootstrap()` tests fail with `svc.bootstrap is not a function`.

- [ ] **Step 5: Implement `bootstrap()` in `SyncService.ts`**

Add this method to the `SyncService` class, after the `sync()` method and before `subscribe()`:

```ts
async bootstrap(userId: string): Promise<void> {
  const syncStartedAt = new Date();

  // Full pull — no updated_at filter, get everything for this user
  const [spacesRes, projectsRes, tasksRes] = await Promise.all([
    this.supabase.from("spaces").select("*").eq("user_id", userId),
    this.supabase.from("projects").select("*").eq("user_id", userId),
    this.supabase.from("tasks").select("*").eq("user_id", userId),
  ]);

  // Write cloud data to Dexie
  const cloudSpaces = spacesRes.data
    ? (spacesRes.data as Record<string, unknown>[]).map(rowToSpace)
    : [];
  const cloudProjects = projectsRes.data
    ? (projectsRes.data as Record<string, unknown>[]).map(rowToProject)
    : [];
  const cloudTasks = tasksRes.data
    ? (tasksRes.data as Record<string, unknown>[]).map(rowToTask)
    : [];

  if (cloudSpaces.length > 0) await db.spaces.bulkPut(cloudSpaces);
  if (cloudProjects.length > 0) await db.projects.bulkPut(cloudProjects);
  if (cloudTasks.length > 0) await db.tasks.bulkPut(cloudTasks);

  // Prune orphan seeds: unsynced projects with no tasks
  const unsyncedProjects = await db.projects.filter((p) => !p.synced).toArray();
  for (const project of unsyncedProjects) {
    const taskCount = await db.tasks
      .where("projectId")
      .equals(project.id)
      .count();
    if (taskCount === 0) await db.projects.delete(project.id);
  }

  // Prune orphan seeds: unsynced spaces with no remaining projects
  const unsyncedSpaces = await db.spaces.filter((s) => !s.synced).toArray();
  for (const space of unsyncedSpaces) {
    const projectCount = await db.projects
      .where("spaceId")
      .equals(space.id)
      .count();
    if (projectCount === 0) await db.spaces.delete(space.id);
  }

  // Push unsynced local tasks (created before sign-in)
  const unsyncedTasks = await db.tasks.filter((t) => !t.synced).toArray();
  if (unsyncedTasks.length > 0) {
    const { error } = await this.supabase
      .from("tasks")
      .upsert(unsyncedTasks.map((t) => taskToRow(t, userId)), {
        onConflict: "id",
      });
    if (!error) {
      await db.tasks.bulkPut(
        unsyncedTasks.map((t) => ({ ...t, synced: true })),
      );
    }
  }

  setLastSyncedAt(syncStartedAt);
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx vitest run apps/web/src/__tests__/SyncService.test.ts --reporter=verbose 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/services/SyncService.ts apps/web/src/__tests__/SyncService.test.ts
git commit -m "feat: add SyncService.bootstrap() for cloud-first initial sync"
```

---

## Task 3: Expand `SyncService.subscribe()` to all three tables

**Files:**
- Modify: `apps/web/src/services/SyncService.ts`
- Modify: `apps/web/src/__tests__/SyncService.test.ts`

- [ ] **Step 1: Write failing tests**

Replace the existing `describe("subscribe()")` block in `SyncService.test.ts` with:

```ts
describe("subscribe()", () => {
  function makeMockSupabaseWithCapture() {
    const capturedHandlers: (() => void)[] = [];
    const mockChannelObj = {
      on: vi.fn(),
      subscribe: vi.fn(),
    };
    mockChannelObj.on.mockImplementation(
      (_event: string, _filter: unknown, handler: () => void) => {
        capturedHandlers.push(handler);
        return mockChannelObj;
      },
    );
    const mockSupabase = {
      from: vi.fn(),
      channel: vi.fn(() => mockChannelObj),
      removeChannel: vi.fn(),
    };
    return { mockSupabase, mockChannelObj, capturedHandlers };
  }

  it("returns an unsubscribe function", () => {
    const { mockSupabase } = makeMockSupabaseWithCapture();
    const svc = new SyncService(mockSupabase as never);
    const unsub = svc.subscribe("user-1", vi.fn());
    expect(typeof unsub).toBe("function");
  });

  it("subscribes to spaces, projects, and tasks tables", () => {
    const { mockSupabase, mockChannelObj } = makeMockSupabaseWithCapture();
    const svc = new SyncService(mockSupabase as never);
    svc.subscribe("user-1", vi.fn());

    expect(mockChannelObj.on).toHaveBeenCalledTimes(3);
    const tables = mockChannelObj.on.mock.calls.map(
      (c) => (c[1] as { table: string }).table,
    );
    expect(tables).toEqual(expect.arrayContaining(["spaces", "projects", "tasks"]));
  });

  it("calls onChange when any table fires a Realtime event", () => {
    const onChange = vi.fn();
    const { mockSupabase, capturedHandlers } = makeMockSupabaseWithCapture();

    const svc = new SyncService(mockSupabase as never);
    svc.subscribe("user-1", onChange);

    expect(capturedHandlers).toHaveLength(3);
    capturedHandlers[0]();
    expect(onChange).toHaveBeenCalledTimes(1);
    capturedHandlers[1]();
    expect(onChange).toHaveBeenCalledTimes(2);
    capturedHandlers[2]();
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run apps/web/src/__tests__/SyncService.test.ts --reporter=verbose 2>&1 | grep -E "(FAIL|subscribe)" | head -10
```

Expected: the new "subscribes to spaces, projects, and tasks tables" test fails.

- [ ] **Step 3: Implement expanded `subscribe()` in `SyncService.ts`**

Replace the existing `subscribe` method with:

```ts
subscribe(userId: string, onChange: () => void): () => void {
  const channel = this.supabase
    .channel(`sift:user:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "spaces", filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "projects", filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
      onChange,
    )
    .subscribe();

  return () => {
    void this.supabase.removeChannel(channel);
  };
}
```

- [ ] **Step 4: Run all SyncService tests**

```bash
npx vitest run apps/web/src/__tests__/SyncService.test.ts --reporter=verbose 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/SyncService.ts apps/web/src/__tests__/SyncService.test.ts
git commit -m "feat: subscribe to spaces/projects/tasks for real-time cross-device updates"
```

---

## Task 4: Update `useSync` with initialize logic and sign-out wipe

**Files:**
- Modify: `apps/web/src/hooks/useSync.ts`
- Modify: `apps/web/src/__tests__/useSync.test.ts`

### Background

`useSync` needs to:
1. On mount with a user: check `sift_user_id` in localStorage vs current `userId`.
   - If different (user switch) → `clearLocalDB()` + `bootstrap()`
   - If same but no `speedy_last_synced_at` (fresh device) → `bootstrap()`
   - If same with cursor → `sync()` (incremental)
2. On sign-out (user → null, `sift_user_id` present) → `clearLocalDB()` + remove both keys.
3. On initial load with no user and no `sift_user_id` → do nothing (offline-only mode, keep seeds).

The test file currently mocks `SyncService` without `bootstrap` and doesn't mock `clearLocalDB`. Both need updating.

- [ ] **Step 1: Update mocks in `useSync.test.ts`**

Replace the entire file with:

```ts
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
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run apps/web/src/__tests__/useSync.test.ts --reporter=verbose 2>&1 | tail -30
```

Expected: tests for `bootstrap`, `clearDB on sign-out`, and `userId changes` fail.

- [ ] **Step 3: Implement new `useSync.ts`**

Replace the entire file:

```ts
import { useState, useEffect } from "react";
import { SyncService } from "../services/SyncService";
import { supabase } from "../lib/supabase";
import { clearLocalDB } from "../lib/db";
import { registerSyncRunner } from "../lib/requestSync";
import type { User } from "@supabase/supabase-js";

export type SyncStatus = "local" | "syncing" | "synced";

const SIFT_USER_ID_KEY = "sift_user_id";
const LAST_SYNC_KEY = "speedy_last_synced_at";

export function useSync(user: User | null): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("local");

  useEffect(() => {
    if (!supabase) {
      setStatus("local");
      return;
    }

    if (!user) {
      // Only wipe if a previous user session existed on this device
      if (localStorage.getItem(SIFT_USER_ID_KEY) !== null) {
        void clearLocalDB().then(() => {
          localStorage.removeItem(SIFT_USER_ID_KEY);
          localStorage.removeItem(LAST_SYNC_KEY);
        });
      }
      setStatus("local");
      return;
    }

    const userId = user.id;
    const syncService = new SyncService(supabase);
    let unsubscribeRealtime: (() => void) | undefined;

    async function runSync() {
      setStatus("syncing");
      try {
        await syncService.sync(userId);
        setStatus("synced");
      } catch {
        setStatus("local");
      }
    }

    async function initialize() {
      setStatus("syncing");
      try {
        const storedUserId = localStorage.getItem(SIFT_USER_ID_KEY);
        const isFirstSync = localStorage.getItem(LAST_SYNC_KEY) === null;
        const userChanged = storedUserId !== null && storedUserId !== userId;

        if (userChanged) {
          await clearLocalDB();
          localStorage.removeItem(LAST_SYNC_KEY);
        }

        if (userChanged || isFirstSync) {
          localStorage.setItem(SIFT_USER_ID_KEY, userId);
          await syncService.bootstrap(userId);
        } else {
          await syncService.sync(userId);
        }
        setStatus("synced");
      } catch {
        setStatus("local");
      }
    }

    void initialize();
    registerSyncRunner(() => void runSync());

    function handleOnline() {
      void runSync();
    }
    window.addEventListener("online", handleOnline);

    unsubscribeRealtime = syncService.subscribe(userId, () => {
      void runSync();
    });

    return () => {
      registerSyncRunner(null);
      window.removeEventListener("online", handleOnline);
      unsubscribeRealtime?.();
    };
  }, [user]);

  return status;
}
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run apps/web/src/__tests__/useSync.test.ts --reporter=verbose 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 5: Run the full test suite**

```bash
npm run test 2>&1 | tail -30
```

Expected: all tests pass across all packages.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/useSync.ts apps/web/src/__tests__/useSync.test.ts
git commit -m "feat: bootstrap on first login, wipe DB on sign-out and user switch"
```
