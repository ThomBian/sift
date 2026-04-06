# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root (runs all packages via Turborepo)
npm run dev        # start all packages in watch/dev mode
npm run build      # build all packages (shared first, then apps)
npm run test       # run all tests

# Per-package
npm run test --workspace=web
npm run test --workspace=@speedy/shared

# Single test file
cd apps/web && npx vitest run src/__tests__/SyncService.test.ts
cd packages/shared && npx vitest run src/__tests__/SmartInput.test.tsx
```

The build order matters: `@speedy/shared` must build before `apps/web` consumes it from `dist/`. Turborepo handles this via `"dependsOn": ["^build"]`.

## Architecture

This is a **Turborepo + npm workspaces** monorepo with two apps and one shared package.

### Packages

- **`packages/shared`** — the foundation everything else depends on:
  - `src/types.ts` — canonical TypeScript types (`Space`, `Project`, `Task`, `TaskStatus`)
  - `src/db.ts` — Dexie.js `AppDatabase` class + singleton `db`; auto-seeds a "Personal" space and "General" project on first run
  - `src/SmartInput/` — reusable `SmartInput` component + `useSmartInput` hook (handles `@p`/`@w`/`@d` triggers with inline chip UI)
  - Publishes from `dist/` — must be built before consumers

- **`apps/web`** — React SPA (Vite + TypeScript + Tailwind)
  - `src/lib/db.ts` — re-exports `db` from `@speedy/shared`
  - `src/lib/supabase.ts` — Supabase client (nullable; disabled if env vars missing)
  - `src/contexts/AuthContext.tsx` — Supabase auth state
  - `src/services/SyncService.ts` — bidirectional sync logic (see below)
  - `src/views/` — InboxView, TodayView, ProjectsView
  - `src/hooks/` — `useTasks`, `useSpacesProjects`, `useKeyboardNav`
  - Routes: `/inbox`, `/today`, `/projects`, `/auth`

- **`apps/extension`** — Chromium MV3 extension (planned, not yet implemented)

### Data Model

```
Space (id, name, color)
  └─ Project (id, name, spaceId)
       └─ Task (id, title, projectId, status, workingDate, dueDate, ...)
```

`status` is `'inbox' | 'todo' | 'done' | 'archived'`. Inbox view shows tasks with no `workingDate`; Today view shows tasks where `workingDate <= today`.

### Local-First + Sync

**IndexedDB (Dexie.js) is the source of truth.** All writes go there immediately for <50ms UI response.

Every record has a `synced: boolean` field. `SyncService` (web only):
1. Pushes all `synced: false` records to Supabase via `upsert`
2. Pulls records with `updated_at > speedy_last_synced_at` (stored in `localStorage`)
3. Conflict resolution: **last-write-wins** on `updatedAt`
4. Subscribes to Supabase realtime for live updates

Supabase is optional — the app works fully offline without env vars.

### Environment

Create `apps/web/.env` from `.env.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Vitest injects stub values for these automatically via `vite.config.ts`.

### Testing

Tests use **Vitest + Testing Library + jsdom + fake-indexeddb**. The setup file in each package (`src/__tests__/setup.ts`) configures `fake-indexeddb` so Dexie works in Node without a real browser.

### Design
Background: #FFFFFF (Pure White)
Text: #111111 (Ink)
Accent: #FF4F00 (International Orange) - Used for focus and action.
Warning: #E60000 (Surgical Red) - Used for 'Late' task background.
Borders: 1px solid #E2E2E2.
Radius: 0px (Hard edges only).
Typography: Geist Sans (Interface), JetBrains Mono (Technical Metadata).


# AI Coding Rules for Sift

1. **Absolute Sharpness:** Never use `border-radius`. All corners must be 0px.
2. **No Shadows:** Use 1px borders (#E2E2E2) to define depth and sections. No `box-shadow`.
3. **Keyboard-First:** Every functional UI element must be reachable and triggerable via keyboard.
4. **Local-First Performance:** All data transactions must be optimistic. UI updates must happen in <10ms.
5. **Color Discipline:** Strictly use #FFFFFF, #111111, and #FF4F00. 
6. **Surgical Red Policy:** If a task is 'Late' (dueDate < today), the entire row background becomes #E60000 with white text. This is a "Strong Opinion" and must not be softened.
7. **Typography:** Use 'Geist Sans' for primary UI and 'JetBrains Mono' for all dates, projects, and shortcuts.
