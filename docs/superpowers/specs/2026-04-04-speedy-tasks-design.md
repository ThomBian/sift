# Speedy Tasks — Design Spec
*Date: 2026-04-04*

## Overview

A keyboard-first, local-first task manager consisting of a React web app (deployed to Vercel) and a Chrome extension (published to the Chrome Web Store). Tasks are stored locally in IndexedDB via Dexie.js and optionally synced across devices via Supabase when the user is logged in.

---

## 1. Repo Structure

**Monorepo with npm workspaces + Turborepo.**

```
speedy-tasks/
├── apps/
│   ├── web/          # Vite + React — deployed to Vercel
│   └── extension/    # Vite + CRXJS — packaged for Chrome Web Store
└── packages/
    └── shared/       # Types, DB schema, SmartInput component, sync service
```

- `packages/shared` exports: TypeScript types (`Space`, `Project`, `Task`), `AppDatabase` and `db` (Dexie), `SmartInput`, `useSmartInput`, and related types. **`SyncService` lives in `apps/web`** (see Plan 2) — it is not part of `@speedy/shared`.
- `apps/web` is a standard Vite React app; Vercel deploys it from the monorepo root via `vercel.json`.
- `apps/extension` uses CRXJS Vite plugin for HMR, manifest generation, and CWS packaging. The capture overlay runs in a Shadow DOM to prevent host-page CSS bleed.
- Turborepo orchestrates builds with output caching.

---

## 2. Data Schema

```typescript
interface Space {
  id: string;       // nanoid
  name: string;     // e.g. "Work", "Personal"
  color: string;    // hex — used as dot color throughout the UI
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

interface Project {
  id: string;       // nanoid
  name: string;
  spaceId: string;  // every project belongs to a space
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

interface Task {
  id: string;           // nanoid
  title: string;
  projectId: string;    // FK → Project; space is derived via project.spaceId
  status: 'inbox' | 'todo' | 'done' | 'archived'; // inbox = no workingDate yet; todo = triaged (has workingDate)
  workingDate: Date | null;  // Planned date — drives Today view
  dueDate: Date | null;      // Deadline — shows red if past
  createdAt: Date;
  updatedAt: Date;           // Used for last-write-wins sync
  completedAt: Date | null;
  sourceUrl?: string;        // URL captured from extension
  synced: boolean;           // false = pending push to Supabase
}
```

A task's Space is always **derived** (`task → project → space`) — no redundant `spaceId` on Task.

**Dexie tables & indexes:**
- `spaces`: `'id, updatedAt, synced'`
- `projects`: `'id, spaceId, updatedAt, synced'`
- `tasks`: `'id, projectId, status, workingDate, dueDate, updatedAt, synced'`

**Supabase:** Three tables (`spaces`, `projects`, `tasks`) mirroring the schemas above, each with a `user_id` column and Row Level Security so users only access their own rows.

---

## 3. Sync Strategy — Last-Write-Wins

Triggered on: app load, network reconnect, Supabase Realtime push, extension→web message.

Sync runs for all three collections in dependency order: spaces first, then projects, then tasks.

1. Push all local records (`spaces`, `projects`, `tasks`) where `synced = false` to Supabase via upsert (keyed on `id`).
2. Pull all remote records where `updated_at > lastSyncedAt` (stored in `localStorage`).
3. Merge: for each conflict, keep the record with the newer `updatedAt`.
4. Mark all local records `synced = true`.

Supabase Realtime subscribes to the `tasks` table so changes from other devices arrive instantly without polling.

When the user is not logged in, the sync service is a no-op. The app works entirely from IndexedDB.

---

## 4. Web App — Views & Behaviour

**Navigation:** Top bar with three tabs — Inbox, Today, Projects — showing live task counts. Left sidebar has two sections: global views (Inbox, Today) at the top, then each Space as a collapsible section containing its projects.

**Views:**
- **Inbox:** all tasks across all spaces where `workingDate == null` and `status != done/archived`
- **Today:** all tasks across all spaces where `workingDate <= today` and `status != done/archived`
- **Projects:** tasks grouped by space, then by project, with a progress bar per project (`done / total`)

**Space indicator:** In global Inbox and Today views, each task row shows a small colored dot (the space's color) so the user can immediately see which space a task belongs to. The `@p` SmartInput dropdown groups projects by space.

**Task rows:** 36px height. One task is always focused (2px left border, accent color `#5E6AD2`). `j`/`k` move focus. Late tasks (`dueDate < today`, not done) show the date in red (`#ff4d4d`). A link icon appears on rows that have a `sourceUrl`.

**Keyboard shortcut map:**

| Key | Context | Action |
|-----|---------|--------|
| `j` / `k` | List | Move focus down / up |
| `Enter` | Task focused | Toggle done |
| `w` | Task focused | Focus @w chip |
| `p` | Task focused | Focus @p chip |
| `d` | Task focused | Focus @d chip |
| `Backspace` | Task focused | Archive task |
| `Esc` | Any modal/dropdown | Close |
| `Alt+Shift+I` | Anywhere | Open extension capture overlay (MV3 registered command) |

**Done tasks** collapse into a "Done" section below active tasks within the same view.

**Topbar right:** Sync status badge ("Synced" with green dot / "Local only") and user avatar.

**Hint bar:** Persistent keyboard shortcut reference at the bottom of the content area.

---

## 5. Smart Input Engine

Shared `SmartInput` component in `packages/shared`. Used identically in the web app input bar and the extension capture overlay.

**Structure:** A single input bar containing the title text and three always-visible inline chips — `@p` (purple), `@d` (amber), `@w` (green). Chips render inline within the text flow; once a value is set, the chip shows the value and appears between text segments.

**Tab rotation:** `Tab` cycles focus: title → @p → @d → @w → title (wraps). `Shift+Tab` reverses.

**Chip interaction:**
1. When a chip receives focus, its dropdown opens automatically.
2. The user selects a value with `Enter` (or clicks an option). Focus returns to the title text.
3. The user can continue typing in the title after any chip selection.
4. Typing `@p`, `@d`, or `@w` inline also jumps focus to the corresponding chip.

**Save:** `⌘+Enter` saves the task from anywhere in the bar. The bar resets to empty.

**Dropdowns:**
- `@p` — filterable list of existing projects + "New project…" option
- `@d` / `@w` — quick-pick chips (Today, Tomorrow, day names) + free-text date entry

**Callback:** `onTaskReady(task: Partial<Task>)` — callers don't need to know parsing internals.

---

## 6. Chrome Extension

**Manifest V3.** Published to Chrome Web Store. Works in Chrome, Brave, Arc, and all Chromium browsers.

**Trigger:** `Alt+Shift+I` (registered MV3 command) or double-Shift within 300ms (content script `keyup` listener).

**Capture overlay:**
- Centered floating bar injected via Shadow DOM — host-page CSS cannot affect it.
- Uses `SmartInput` from `packages/shared`.
- Saves to `chrome.storage.local` with `synced: false`.
- Auto-captures `sourceUrl` from the active tab.

**Sync bridge:** When the web app tab is open, the extension sends unsynced tasks via `chrome.runtime.sendMessage`. The web app's content script receives them, writes them to Dexie, and triggers a normal sync cycle. The `@p` dropdown in the capture overlay groups projects by space.

**Extension popup:** Minimal — shows the count of unsynced tasks and a "Open Speedy" button linking to the Vercel app.

---

## 7. Auth

**Supabase Auth** with Google OAuth and magic link email. Presented on first visit to the Vercel app.

**Session sharing with extension:** After login, the web app posts the Supabase session token to the extension via the message bridge. Both the web app and extension share the same user identity.

**First launch:** A "Personal" space and a "General" project are created automatically so the app is immediately usable.

**Logged-out UX:** All features work without an account. Topbar shows "Local only." A non-intrusive prompt in the sidebar invites login. No features are gated behind auth.

---

## 8. Design Tokens

| Token | Value |
|-------|-------|
| Background | `#080808` |
| Surface | `#0e0e0e` |
| Surface 2 | `#141414` |
| Border | `#1f1f1f` |
| Text | `#e2e2e2` |
| Text muted | `#666666` |
| Accent | `#5E6AD2` |
| Red (late) | `#ff4d4d` |
| Green (done) | `#4ade80` |
| Font | Inter |
| Task row height | 36px |

---

## 9. Tech Stack Summary

| Layer | Choice |
|-------|--------|
| Monorepo | npm workspaces + Turborepo |
| Web app build | Vite + React + TypeScript |
| Extension build | Vite + CRXJS |
| Styling | Tailwind CSS |
| Local DB | Dexie.js (IndexedDB) |
| Cloud sync + auth | Supabase |
| Deployment | Vercel (web), Chrome Web Store (extension) |

---

## 10. Implementation status

### Plan 1 — Complete (2026-04-04)

Delivered per [docs/superpowers/plans/2026-04-04-plan-1-foundation.md](../plans/2026-04-04-plan-1-foundation.md):

| Item | Location / notes |
|------|------------------|
| Monorepo | npm workspaces + Turborepo 2; root `packageManager` field for Turbo workspace resolution |
| Shared library | `packages/shared` (`@speedy/shared`) — Vite library build, `vite-plugin-dts`, CSS Modules for SmartInput |
| Data | `Space`, `Project`, `Task`, `TaskStatus`; `AppDatabase` Dexie schema v1; first-launch seed (Personal + General) |
| Smart Input | `useSmartInput`, `Dropdown`, `SmartInput`; `@p` / `@w` / `@d`, Tab rotation, ⌘/Ctrl+Enter save |
| Tests | Vitest + Testing Library + `fake-indexeddb`; jest-dom + `cleanup` in `src/__tests__/setup.ts` |
| Build output | `dist/index.js`, `dist/index.d.ts`, bundled `dist/style.css` (import when consuming `SmartInput` in apps) |

Turbo tasks: `npm run build`, `npm run test`, `npm run dev` from repo root orchestrate packages.

### Plan 2 — Complete (2026-04-04)

Web dashboard per [docs/superpowers/plans/2026-04-04-plan-2-web-app.md](../plans/2026-04-04-plan-2-web-app.md):

| Item | Notes |
|------|--------|
| `apps/web` | Vite 5 + React 18 + Tailwind 3 + React Router 6 |
| Data | `useLiveQuery` hooks; `db` re-exported from `@speedy/shared` |
| Views | Inbox, Today, Projects + `TaskList` / `TaskRow` / `InputBar` (`SmartInput` + `projects` prop) |
| Keyboard | `useKeyboardNav` — j/k, Enter, Backspace/Delete |
| Auth | Supabase Google + magic link when `VITE_*` env vars are set; **no route gating** — matches §7 logged-out UX |
| Sync | `SyncService` LWW push/pull + Realtime subscribe when authenticated |
| Tests | Vitest: `useTasks`, `useKeyboardNav`, `TaskRow`, `SyncService` (mocked Supabase) |
| Deploy | `vercel.json` uses `npx turbo build --filter=web` |

**Deviations from the written Plan 2 tasks:** Removed mandatory `ProtectedRoute` around the main shell so local-first use matches this spec. `supabase.ts` does not throw when env is missing. Dexie queries use `toArray()` + in-memory sort by `name` (schema indexes do not include `name`). `@speedy/shared` exposes `./style.css` for the SmartInput bundle.

**Next:** Plan 3 — Chrome extension ([docs/superpowers/plans/2026-04-04-plan-3-extension.md](../plans/2026-04-04-plan-3-extension.md)).
