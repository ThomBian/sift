# Auth Gate + Sync Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-state animated sync icon and a soft sign-in button to the topbar, replacing the binary SyncBadge.

**Architecture:** `useSync` gains a `'syncing'` intermediate state; the `SyncStatus` type propagates through `App → AppLayout → Topbar`; `Topbar` replaces the old text-badge with an icon-only square and adds a sign-in button left of it when the user is unauthenticated.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest + Testing Library

---

## File Map

| File | Change |
|------|--------|
| `apps/web/src/hooks/useSync.ts` | Export `SyncStatus` type; return `'syncing'` while sync runs |
| `apps/web/src/__tests__/useSync.test.ts` | New — tests for all three SyncStatus states |
| `apps/web/src/App.tsx` | `isSynced: boolean` → `syncStatus: SyncStatus` |
| `apps/web/src/components/layout/AppLayout.tsx` | Prop type update |
| `apps/web/src/components/layout/Topbar.tsx` | Replace `SyncBadge` with `SyncIcon`; add sign-in button |
| `apps/web/src/__tests__/Topbar.test.tsx` | New — tests sign-in button visibility |

---

## Task 1: Update useSync to return SyncStatus

**Files:**
- Modify: `apps/web/src/hooks/useSync.ts`
- Create: `apps/web/src/__tests__/useSync.test.ts`

- [ ] **Step 1: Create the test file**

`apps/web/src/__tests__/useSync.test.ts`:

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

const mockSync = vi.fn();
const mockSubscribe = vi.fn().mockReturnValue(() => {});

vi.mock("../services/SyncService", () => ({
  SyncService: vi.fn().mockImplementation(() => ({
    sync: mockSync,
    subscribe: mockSubscribe,
  })),
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run apps/web/src/__tests__/useSync.test.ts
```

Expected: FAIL — `'local' | 'syncing' | 'synced'` type does not exist yet.

- [ ] **Step 3: Update useSync implementation**

Replace `apps/web/src/hooks/useSync.ts` entirely:

```ts
import { useState, useEffect } from "react";
import { SyncService } from "../services/SyncService";
import { supabase } from "../lib/supabase";
import { registerSyncRunner } from "../lib/requestSync";
import type { User } from "@supabase/supabase-js";

export type SyncStatus = "local" | "syncing" | "synced";

export function useSync(user: User | null): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("local");

  useEffect(() => {
    if (!user || !supabase) {
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

    void runSync();
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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run apps/web/src/__tests__/useSync.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useSync.ts apps/web/src/__tests__/useSync.test.ts
git commit -m "feat(web): useSync returns SyncStatus with syncing intermediate state"
```

---

## Task 2: Propagate syncStatus prop

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Update App.tsx**

Replace the `isSynced` usage in `apps/web/src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useAuth } from './contexts/AuthContext';
import { useSync } from './hooks/useSync';
import AppLayout from './components/layout/AppLayout';
import AuthPage from './pages/AuthPage';
import InboxView from './views/InboxView';
import TodayView from './views/TodayView';
import ProjectsView from './views/ProjectsView';

export default function App() {
  const { user } = useAuth();
  const syncStatus = useSync(user);

  return (
    <>
      <Analytics />
      <SpeedInsights />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<AppLayout syncStatus={syncStatus} />}>
          <Route index element={<Navigate to="/inbox" replace />} />
          <Route path="inbox" element={<InboxView />} />
          <Route path="today" element={<TodayView />} />
          <Route path="projects" element={<ProjectsView />} />
        </Route>
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Routes>
    </>
  );
}
```

- [ ] **Step 2: Update AppLayout prop interface**

In `apps/web/src/components/layout/AppLayout.tsx`, change the import and interface:

```tsx
// Add import at top of file (with other imports)
import type { SyncStatus } from "../../hooks/useSync";

// Replace AppLayoutProps interface
interface AppLayoutProps {
  syncStatus: SyncStatus;
}

// Replace function signature
export default function AppLayout({ syncStatus }: AppLayoutProps) {
```

Then update the `Topbar` usage inside `AppLayout` (around line 174):

```tsx
<Topbar
  syncStatus={syncStatus}
  onMenuClick={() => setNavDrawerOpen((o) => !o)}
  menuOpen={navDrawerOpen}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build --workspace=web 2>&1 | grep -E "error|✓"
```

Expected: TypeScript will error on `Topbar` because its prop is still `isSynced: boolean`. That's expected — fixed in Task 3.

- [ ] **Step 4: Commit (after Task 3 passes build)**

Hold commit until Task 3 is done — the build won't pass until Topbar is updated too.

---

## Task 3: Replace SyncBadge with SyncIcon + sign-in button

**Files:**
- Modify: `apps/web/src/components/layout/Topbar.tsx`
- Create: `apps/web/src/__tests__/Topbar.test.tsx`

- [ ] **Step 1: Create Topbar test file**

`apps/web/src/__tests__/Topbar.test.tsx`:

```tsx
/// <reference types="vitest" />
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

function renderTopbar(user: User | null) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    session: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
  });
  return render(
    <MemoryRouter>
      <Topbar syncStatus="local" />
    </MemoryRouter>
  );
}

describe("Topbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows sign-in button when user is null", () => {
    renderTopbar(null);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("hides sign-in button when user exists", () => {
    renderTopbar({ id: "u1", email: "a@b.com" } as User);
    expect(screen.queryByRole("button", { name: /sign in/i })).toBeNull();
  });

  it("renders synced icon with no spin when syncStatus is synced", () => {
    renderTopbar(null);
    // Re-render with synced status
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
    });
    const { container } = render(
      <MemoryRouter>
        <Topbar syncStatus="synced" />
      </MemoryRouter>
    );
    const icon = container.querySelector("[data-sync-status='synced']");
    expect(icon).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run apps/web/src/__tests__/Topbar.test.tsx
```

Expected: FAIL — `syncStatus` prop doesn't exist on Topbar yet.

- [ ] **Step 3: Replace Topbar implementation**

Replace `apps/web/src/components/layout/Topbar.tsx` entirely:

```tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../hooks/useTasks";
import type { SyncStatus } from "../../hooks/useSync";

function SyncIcon({ status }: { status: SyncStatus }) {
  if (status === "synced") {
    return (
      <span
        data-sync-status="synced"
        className="w-2 h-2 shrink-0 bg-green"
        aria-label="Synced"
      />
    );
  }
  if (status === "syncing") {
    return (
      <span
        data-sync-status="syncing"
        className="w-2 h-2 shrink-0 border border-accent animate-spin"
        aria-label="Syncing"
      />
    );
  }
  return (
    <span
      data-sync-status="local"
      className="w-2 h-2 shrink-0 border border-dim"
      aria-label="Local"
    />
  );
}

function NavTab({
  to,
  label,
  count,
}: {
  to: string;
  label: string;
  count: number;
}) {
  return (
    <NavLink
      to={to}
      tabIndex={-1}
      className={({ isActive }) =>
        `flex items-center gap-2 shrink-0 px-3 min-h-11 md:min-h-0 py-2.5 md:py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] border-b-2 transition-colors duration-150 ${
          isActive
            ? "border-accent text-text"
            : "border-transparent text-muted hover:text-text hover:border-border-2"
        }`
      }
    >
      {label}
      {count > 0 && (
        <span className="text-[10px] text-accent font-mono tabular-nums">
          {count}
        </span>
      )}
    </NavLink>
  );
}

export interface TopbarProps {
  syncStatus: SyncStatus;
  onMenuClick?: () => void;
  menuOpen?: boolean;
}

export default function Topbar({
  syncStatus,
  onMenuClick,
  menuOpen,
}: TopbarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const inboxTasks = useTasks("inbox");
  const todayTasks = useTasks("today");

  return (
    <header className="flex items-center gap-2 h-12 min-h-12 px-2 sm:px-4 border-b border-[0.5px] border-border bg-surface shrink-0">
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {onMenuClick ? (
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-11 h-11 shrink-0 text-muted hover:text-text transition-colors duration-150 outline-none"
            onClick={onMenuClick}
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen ?? false}
            aria-controls="mobile-spaces-nav"
          >
            <svg
              width="18"
              height="14"
              viewBox="0 0 18 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 1h18M0 7h18M0 13h18"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="square"
              />
            </svg>
          </button>
        ) : null}
        <span className="w-2 h-2 bg-accent shrink-0 shadow-laser" />
        <span className="font-mono text-[11px] font-semibold tracking-[0.35em] uppercase text-text truncate max-w-[4.5rem] sm:max-w-none">
          Sift
        </span>
      </div>

      <nav
        className="flex-1 min-w-0 flex items-stretch justify-center overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
        aria-label="Main views"
      >
        <div className="flex items-stretch gap-0 mx-auto">
          <NavTab to="/inbox" label="Inbox" count={inboxTasks.length} />
          <NavTab to="/today" label="Today" count={todayTasks.length} />
          <NavTab to="/projects" label="Projects" count={0} />
        </div>
      </nav>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0 justify-end">
        {!user && (
          <button
            type="button"
            onClick={() => void navigate("/auth")}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-text transition-colors duration-150"
            aria-label="Sign in"
          >
            Sign in
          </button>
        )}
        <SyncIcon status={syncStatus} />
        {user ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => void signOut()}
            className="min-w-11 min-h-11 w-11 h-11 md:min-w-7 md:min-h-7 md:w-7 md:h-7 bg-accent flex items-center justify-center text-bg text-[11px] font-mono font-medium hover:bg-accent/80 transition-colors duration-150"
            title="Sign out"
            aria-label="Sign out"
          >
            {(user.email ?? "U")[0].toUpperCase()}
          </button>
        ) : null}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run Topbar tests**

```bash
npx vitest run apps/web/src/__tests__/Topbar.test.tsx
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npm run test --workspace=web
```

Expected: all tests PASS.

- [ ] **Step 6: Verify build**

```bash
npm run build --workspace=web 2>&1 | grep -E "error TS|✓ built"
```

Expected: `✓ built in Xms` — no TypeScript errors.

- [ ] **Step 7: Commit Tasks 2 + 3 together**

```bash
git add \
  apps/web/src/App.tsx \
  apps/web/src/components/layout/AppLayout.tsx \
  apps/web/src/components/layout/Topbar.tsx \
  apps/web/src/__tests__/Topbar.test.tsx
git commit -m "feat(web): replace SyncBadge with SyncIcon and add soft auth gate in topbar"
```
