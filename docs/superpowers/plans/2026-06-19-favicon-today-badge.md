# Favicon Today-Count Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the live Today-task count as a round badge on the browser tab's favicon and as a `(N) Sift` prefix in the tab title.

**Architecture:** A pure module (`faviconBadge.ts`) builds the favicon SVG markup, its data URI, and the tab title from a count. A hook (`useFaviconBadge`) reads `useTodayTasks().length` and is the only piece that touches the DOM — it swaps the `<link rel="icon">` href and `document.title`, restoring both on unmount. The hook is mounted once in `App.tsx`.

**Tech Stack:** React, TypeScript, Vite, Dexie (`useLiveQuery`), Vitest + jsdom + fake-indexeddb + Testing Library.

---

## File Structure

- Create: `apps/web/src/lib/faviconBadge.ts` — pure builders (no DOM): `buildFaviconSvg`, `buildTabTitle`, `svgToDataUri`.
- Create: `apps/web/src/hooks/useFaviconBadge.ts` — hook that reads the count and mutates the DOM.
- Create: `apps/web/src/__tests__/faviconBadge.test.ts` — unit tests for pure builders.
- Create: `apps/web/src/__tests__/useFaviconBadge.test.tsx` — integration test against seeded Dexie.
- Modify: `apps/web/src/App.tsx` — call `useFaviconBadge()` once at app root.

Run all commands from `apps/web` unless stated otherwise.

---

### Task 1: Pure builders in `faviconBadge.ts`

**Files:**
- Create: `apps/web/src/lib/faviconBadge.ts`
- Test: `apps/web/src/__tests__/faviconBadge.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/faviconBadge.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  buildTabTitle,
  buildFaviconSvg,
  svgToDataUri,
} from "../lib/faviconBadge";

describe("buildTabTitle", () => {
  it("is plain Sift at zero", () => {
    expect(buildTabTitle(0)).toBe("Sift");
  });
  it("clamps negatives to plain Sift", () => {
    expect(buildTabTitle(-3)).toBe("Sift");
  });
  it("prefixes the count when positive", () => {
    expect(buildTabTitle(3)).toBe("(3) Sift");
  });
  it("shows the true number past 99", () => {
    expect(buildTabTitle(150)).toBe("(150) Sift");
  });
});

describe("buildFaviconSvg", () => {
  it("renders no badge at zero", () => {
    const svg = buildFaviconSvg(0);
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<circle");
  });
  it("renders the count for 1-99", () => {
    const svg = buildFaviconSvg(5);
    expect(svg).toContain("<circle");
    expect(svg).toContain(">5<");
  });
  it("caps the badge text at 99+", () => {
    const svg = buildFaviconSvg(100);
    expect(svg).toContain("99+");
  });
});

describe("svgToDataUri", () => {
  it("produces an svg data uri", () => {
    expect(svgToDataUri("<svg></svg>")).toMatch(/^data:image\/svg\+xml,/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/faviconBadge.test.ts`
Expected: FAIL — cannot resolve `../lib/faviconBadge`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/lib/faviconBadge.ts`:

```typescript
// Base mark kept in sync with public/favicon.svg (dark rounded square +
// #5E6AD2 checkmark). Duplicated here so the generated favicon is
// self-contained and does not depend on fetching the static asset.
const BASE_MARK = `
  <rect width="32" height="32" rx="6" fill="#080808" stroke="#222" />
  <path d="M9 16.5l4.5 4L23 11" stroke="#5E6AD2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
`;

function badgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/** SVG markup for the favicon. No badge when count <= 0. */
export function buildFaviconSvg(count: number): string {
  if (count <= 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">${BASE_MARK}</svg>`;
  }
  const text = badgeText(count);
  // Wider badge text (99+) gets a slightly smaller font to stay legible at 16px.
  const fontSize = text.length > 2 ? 9 : 11;
  const badge = `
    <circle cx="24" cy="8" r="7" fill="#FF4F00" />
    <text x="24" y="8" fill="#FFFFFF" font-size="${fontSize}"
      font-family="-apple-system, system-ui, sans-serif" font-weight="700"
      text-anchor="middle" dominant-baseline="central">${text}</text>
  `;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">${BASE_MARK}${badge}</svg>`;
}

/** Tab title. Plain "Sift" when count <= 0, else "(N) Sift". */
export function buildTabTitle(count: number): string {
  return count > 0 ? `(${count}) Sift` : "Sift";
}

/** Encode SVG markup as a data URI usable as a <link rel="icon"> href. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/faviconBadge.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/faviconBadge.ts apps/web/src/__tests__/faviconBadge.test.ts
git commit -m "feat: add pure favicon badge builders"
```

---

### Task 2: `useFaviconBadge` hook

**Files:**
- Create: `apps/web/src/hooks/useFaviconBadge.ts`
- Test: `apps/web/src/__tests__/useFaviconBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/useFaviconBadge.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/useFaviconBadge.test.tsx`
Expected: FAIL — cannot resolve `../hooks/useFaviconBadge`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/hooks/useFaviconBadge.ts`:

```typescript
import { useEffect } from "react";
import { useTodayTasks } from "./useTasks";
import {
  buildFaviconSvg,
  buildTabTitle,
  svgToDataUri,
} from "../lib/faviconBadge";

function ensureIconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  return link;
}

/** Live-updates the tab favicon + title with the Today task count. */
export function useFaviconBadge(): void {
  const count = useTodayTasks().length;

  useEffect(() => {
    const link = ensureIconLink();
    link.setAttribute("type", "image/svg+xml");
    link.setAttribute("href", svgToDataUri(buildFaviconSvg(count)));
    document.title = buildTabTitle(count);

    return () => {
      link.setAttribute("href", "/favicon.svg");
      document.title = "Sift";
    };
  }, [count]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/useFaviconBadge.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useFaviconBadge.ts apps/web/src/__tests__/useFaviconBadge.test.tsx
git commit -m "feat: add useFaviconBadge hook"
```

---

### Task 3: Mount the hook in `App.tsx`

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add the import**

Add alongside the existing hook imports near the top of `apps/web/src/App.tsx`:

```typescript
import { useFaviconBadge } from './hooks/useFaviconBadge';
```

- [ ] **Step 2: Call the hook in the component body**

In `App()`, immediately after `const syncStatus = useSync(user);`, add:

```typescript
  useFaviconBadge();
```

- [ ] **Step 3: Verify the full suite and typecheck pass**

Run: `npx vitest run`
Expected: PASS — including the two new test files, no regressions.

Run (from repo root): `npm run build --workspace=web`
Expected: TypeScript build succeeds.

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev --workspace=web`, open the app, ensure at least one task has a working date of today. Expected: the browser tab title reads `(N) Sift` and the favicon shows an orange badge with `N`; marking all today tasks done returns the tab to a plain `Sift` title and badge-free favicon.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat: show today-count badge on tab favicon and title"
```

---

## Self-Review Notes

- **Spec coverage:** count definition via `useTodayTasks` (Task 2); hide-at-0 favicon + plain title (Tasks 1–2); `99+` cap with true number in title (Task 1); round `#FF4F00` badge (Task 1); mount once in `App.tsx` (Task 3); restore on unmount (Task 2). All covered.
- **No placeholders:** every code step shows complete code; commands have expected output.
- **Type consistency:** `buildFaviconSvg`, `buildTabTitle`, `svgToDataUri` signatures match across Tasks 1–2; hook returns `void` and is called for effect only.
