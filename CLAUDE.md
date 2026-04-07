# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root — runs all packages via Turborepo
npm run dev        # start all packages in watch/dev mode
npm run build      # build all packages (shared first, then apps)
npm run test       # run all tests

# Per-package
npm run test --workspace=web
npm run test --workspace=@sift/shared

# Single test file
npx vitest run apps/web/src/__tests__/SyncService.test.ts
npx vitest run packages/shared/src/__tests__/SmartInput.test.tsx
```

Build order matters: `@sift/shared` must build before `apps/web` consumes it from `dist/`. Turborepo handles this via `"dependsOn": ["^build"]`. After editing anything in `packages/shared`, run `npm run build --workspace=@sift/shared` before testing the web app.

## Architecture

Turborepo + npm workspaces monorepo:

- **`packages/shared`** — consumed by all apps; publishes from `dist/`
  - `src/types.ts` — canonical types: `Space`, `Project`, `Task`, `TaskStatus`
  - `src/db.ts` — Dexie.js `AppDatabase` singleton (`db`); auto-seeds a "Personal" space + "General" project on first run
  - `src/SmartInput/` — reusable task-input component with `@p`/`@w`/`@d` inline chip triggers

- **`apps/web`** — React SPA (Vite + TypeScript + Tailwind)
  - `src/lib/db.ts` — re-exports `db` from `@sift/shared`
  - `src/lib/supabase.ts` — nullable Supabase client; app works fully offline without env vars
  - `src/contexts/AuthContext.tsx` — Supabase auth state
  - `src/services/SyncService.ts` — bidirectional sync (see below)
  - `src/views/` — InboxView, TodayView, ProjectsView (each owns its keyboard nav)
  - `src/hooks/useKeyboardNav.ts` — shared arrow-key + Enter/Backspace/Escape logic
  - `src/components/CommandPalette.tsx` — Cmd+K overlay for task creation and editing (D/W/P/E shortcuts open it pre-focused on a chip)
  - `src/components/ProjectEditPalette.tsx` — same-style overlay for project creation/editing (name + due date only)

- **`apps/extension`** — Chromium MV3 extension (planned, not yet implemented)

## Data Model

```
Space (id, name, color)
  └─ Project (id, name, spaceId)
       └─ Task (id, title, projectId, status, workingDate, dueDate, sourceUrl?, ...)
```

`status`: `'inbox' | 'todo' | 'done' | 'archived'`
- Inbox view: tasks where `workingDate === null` and status not done/archived
- Today view: tasks where `workingDate <= today` and status not done/archived

Every record has `synced: boolean`. All writes hit IndexedDB immediately; `synced: false` marks records pending push.

## Local-First + Sync

**IndexedDB (Dexie) is the source of truth.** All writes are optimistic — UI updates before any network call.

`SyncService`:
1. Pushes `synced: false` records to Supabase via upsert
2. Pulls records with `updated_at > speedy_last_synced_at` (stored in `localStorage`)
3. Conflict resolution: last-write-wins on `updatedAt`
4. Subscribes to Supabase Realtime for live updates

## Keyboard Interaction Model

- **Cmd+K** — opens `CommandPalette` (task creation)
- **↑ / ↓ / j / k** — navigate tasks; reaching the end deselects (focusedId → null)
- **← / →** — switch views (handled in `AppLayout`, always active when not in an input)
- **Enter** — toggle focused task done/undone
- **Backspace / Delete** — archive focused task
- **Escape** — close edit palette if open, else deselect focused task
- **D / W / P / E** — when a task is focused, open `CommandPalette` pre-focused on that chip (due date / working date / project / title)

`HintBar` renders two states: default (no task focused) and task-focused (shows D/W/P/E shortcuts with orange accent). It lives at the bottom of each view.

Each view registers its own `window.keydown` listener that skips events when `e.target` is an INPUT or TEXTAREA. `AppLayout` owns the palette and view-switching listeners. When a focused task disappears from the list (marked done, archived), the view's `useEffect` clears `focusedId`.

## Environment

Create `apps/web/.env` from `.env.example`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
Vitest injects stub values automatically via `vite.config.ts`.

## Testing

Vitest + Testing Library + jsdom + `fake-indexeddb`. Each package has `src/__tests__/setup.ts` which configures `fake-indexeddb` so Dexie runs in Node. Clear db tables in `beforeEach` when tests write to the db.


# Design rules

1. **Retina Borders:** Use 0.5px borders (`border-[0.5px]`) with color `#E2E2E2`.
2. **Spring Motion:** Every UI change (focus shift, modal open) must have a 150ms spring transition. Use Framer Motion or CSS transitions.
3. **The Laser Focus:** The #FF4F00 indicator must have a subtle `box-shadow: 0 0 8px rgba(255, 79, 0, 0.4)`.
4. **Typographic Hierarchy:** - Titles: `Geist Sans`, Weight 500, Tracking -0.02em.
   - Metadata: `JetBrains Mono`, Weight 400, Size 10px, Color #888888.
5. **Backdrop Blurs:** Any floating element (Modals/Overlays) must use `backdrop-filter: blur(12px)`.
6. **Zero-Radius Constraint:** NEVER use `border-radius`. Use sharpness to communicate professional precision.
7. **The Late Tax Glow:** Late tasks (#E60000 background) should have a very slow, subtle "breathing" opacity animation (90% to 100%) to indicate urgency without being annoying.