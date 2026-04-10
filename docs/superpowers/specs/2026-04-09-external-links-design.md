# External Links for Tasks and Projects

**Date:** 2026-04-09  
**Status:** Approved

## Overview

Allow users to attach a single external URL to any Task or Project. Links are editable via the existing chip palette pattern and openable via keyboard shortcut.

---

## Data Model

### Task

- Rename `sourceUrl?: string` → `url: string | null`
- Dexie migration **v5**: copy `sourceUrl` value to `url`, delete `sourceUrl` key on all existing task rows
- No index needed
- Include `url` in `SyncService` upsert payload for tasks
- Supabase `tasks` table: add `url` column (text, nullable)

### Project

- Add `url: string | null` to `Project` type
- Dexie migration **v5**: set `url = null` on all existing project rows (same version as task migration)
- No index needed
- Include `url` in `SyncService` upsert payload for projects
- Supabase `projects` table: add `url` column (text, nullable)

---

## Task UX

### Editing

- `CommandPalette` gains a `@u` chip
- Chip mode: free-text input (no dropdown), user types or pastes a URL
- `Enter` saves; `Esc` cancels
- `EditField` type gains `'url'`; `EditPatch` gains `url: string | null`

### Keyboard shortcuts (task focused)

| Key | Action |
|-----|--------|
| `U` | Open `CommandPalette` pre-focused on `@u` chip |
| `Cmd+O` | Open task's `url` in new tab (no-op if no URL set) |

### Display

- `TaskRow`: swap `sourceUrl` reference → `url`; link icon behavior unchanged (opens new tab, `stopPropagation`)
- `HintBar` task hint bar: add `U` and `⌘O` entries

---

## Project UX

### Editing

- `ProjectEditPalette` gains a `@u` chip (same pattern as `@c` / `@d`)
- Chip mode: free-text input, `Enter` saves
- Project's `EditPatch`-equivalent gains `url: string | null`

### Keyboard shortcuts (project row focused)

| Key | Action |
|-----|--------|
| `U` | Open `ProjectEditPalette` pre-focused on `@u` chip |
| `Cmd+O` | Open project's `url` in new tab (no-op if no URL set) |

No conflict: only one element (task or project) can be focused at a time.

### Display

- Project row in **sidebar** and **ProjectsView**: show small link icon when `url` is set; clicking opens URL in new tab
- Icon style matches `TaskRow` link icon
- `HintBar` project hints: add `U` and `⌘O` entries

---

## Out of Scope

- Multiple links per task/project
- Link previews or metadata fetching
- URL validation (accept any string the user types)
- Extension `sourceUrl` distinction (field renamed; extension will write to `url` when built)
