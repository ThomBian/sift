# Project Archive — Design Spec

**Date:** 2026-04-09

## Goal

Allow users to archive projects (and their tasks) from ProjectsView to reduce noise, while preserving all data for future recovery.

---

## Data Layer

### Type change — `packages/shared/src/types.ts`

Add `archived: boolean` to the `Project` interface (default `false`).

### Dexie migration — `packages/shared/src/db.ts`

Version 4: add `archived` to the projects index string and set `archived = false` on all existing records via `.upgrade()`.

```
projects: 'id, spaceId, dueDate, archived, updatedAt, synced'
```

### Helper functions — `packages/shared/src/db.ts`

**`archiveProject(projectId: string)`**
1. Set `project.archived = true`, `updatedAt = now`, `synced = false`
2. Set all project tasks → `status = 'archived'`, `updatedAt = now`, `synced = false`

**`unarchiveProject(projectId: string)`**
1. Set `project.archived = false`, `updatedAt = now`, `synced = false`
2. Restore each task: `status = task.workingDate ? 'todo' : 'inbox'`, `updatedAt = now`, `synced = false`
   (Same pattern as task un-done in ProjectsView.)

### Supabase

The `projects` table needs an `archived boolean default false` column for sync round-trip. Offline-only use needs no migration there.

---

## Keyboard & UI

### `A` key in ProjectsView

When a project is focused:
- Active project → `archiveProject(id)`. Project leaves the visible list; focus advances to the next project (or clears if none).
- Archived project (when visible via toggle) → `unarchiveProject(id)`. Project returns to normal.

No dedicated keyboard shortcut for the show/hide toggle.

### "Show archived" toggle

A focusable element rendered at the bottom of the scrollable project list, below all space groups. Label: `Show archived (N)` where `N` is the count of archived projects across all spaces. Hidden when `N === 0`.

**Keyboard:**
- Arrow navigation flows naturally into it after the last project row.
- `Space` toggles `showArchived` state on/off.

**Display when `showArchived = true`:**
- Archived projects appear at the bottom of their respective space group, below active projects.
- Rendered at `opacity-50`, dimmed name, no focus accent glow.
- Still arrow-navigable and focusable so `A` can unarchive them.

### HintBar

`project` focus state gains an `A` hint:
- Focused project is active → `A archive`
- Focused project is archived → `A unarchive`

---

## Nav model extension

`useProjectNav` / `handleProjectKeyDown` must treat the "Show archived" toggle as a terminal nav target (below the last project). When it receives focus, `Space` fires the toggle. `ArrowUp` from it returns to the last project.

---

## What is NOT in scope

- Per-task unarchive (tasks are only restored via project unarchive)
- Bulk archive / archive entire space
- Archived projects appearing in Inbox or Today views
- Any visual change to tasks' appearance inside an archived project context
