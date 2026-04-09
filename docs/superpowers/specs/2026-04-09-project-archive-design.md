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

## ConfirmModal component

**`apps/web/src/components/ConfirmModal.tsx`** — reusable confirmation overlay for destructive actions.

Props:
```ts
interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

### Visual design

Matches the existing palette family exactly:
- `backdrop-filter: blur(12px)` on the modal panel
- Full-screen semi-transparent backdrop: `bg-black/20` behind the panel to dim surroundings
- Sharp edges, zero border-radius, `border-[0.5px] border-border`
- Centered on screen, fixed width (~320px), compact height
- Message text: Geist Sans, weight 500, tracking -0.02em
- Project name rendered in `text-accent` (#FF4F00) inside the message so user knows exactly what's being archived
- Keyboard hint row at the bottom: `↵ confirm` in accent, `esc cancel` in muted — JetBrains Mono 10px

### Animations

Add to `tailwind.config.ts`:
```js
'modal-in':  'modal-in 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
'modal-out': 'modal-out 120ms ease-in forwards',

keyframes: {
  'modal-in':  { from: { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
                   to: { opacity: '1', transform: 'scale(1) translateY(0)' } },
  'modal-out': { from: { opacity: '1', transform: 'scale(1) translateY(0)' },
                   to: { opacity: '0', transform: 'scale(0.96) translateY(6px)' } },
}
```

- Entrance: `animate-modal-in` — spring scale + slide up (mirrors `palette-in` but slides from below for a different feel)
- Exit: `animate-modal-out` plays for 120ms before `onCancel`/`onConfirm` actually fires (use `setTimeout` + CSS class swap)
- Backdrop fades in/out with `transition-opacity duration-150`

### Behaviour

- Traps keyboard focus while open — no other interaction possible
- `Enter` → plays exit animation → calls `onConfirm`
- `Esc` → plays exit animation → calls `onCancel`

---

## Keyboard & UI

### Project row exit animation

When a project is archived and confirmed:
- Add the project ID to an `exitingProjectIds` Set (same pattern as `exitingIds` for tasks)
- Apply `animate-task-exit` to the row immediately — slides right + fades out (250ms)
- After 250ms, call `archiveProject(id)` to write to DB (row is now gone from DOM via Dexie reactivity)
- Focus advances to the next visible project, or clears if none

### `A` key in ProjectsView

When a project is focused:
- Active project → opens `ConfirmModal` with message `Archive "Project Name"? Tasks will be archived too.`
  - `Enter` → plays project row exit animation (250ms) → `archiveProject(id)`, modal closes, focus advances
  - `Esc` → plays modal-out → modal closes, nothing changes
- Archived project (when visible via toggle) → `unarchiveProject(id)` directly, no confirmation needed (recovery action, not destructive)

No dedicated keyboard shortcut for the show/hide toggle.

### "Show archived" toggle

A focusable element rendered at the bottom of the scrollable project list, below all space groups. Label: `Show archived (N)` where `N` is the count of archived projects across all spaces. Hidden when `N === 0`.

**Keyboard:**
- Arrow navigation flows naturally into it after the last project row.
- `Space` toggles `showArchived` state on/off.

**Display when `showArchived = true`:**
- Archived projects appear at the bottom of their respective space group, below active projects.
- Rendered at `opacity-40`, dimmed name, no focus accent glow.
- Animate in with `animate-task-enter` (reuse existing keyframe) staggered at 25ms per item — same pattern as task rows.
- Still arrow-navigable and focusable so `A` can unarchive them.

**"Show archived" toggle focus style:**
When keyboard-focused (arrow nav lands on it), show the laser focus treatment: `outline: none`, left border `border-l-2 border-accent` (2px solid #FF4F00) with `box-shadow: 0 0 8px rgba(255, 79, 0, 0.4)` — consistent with the project row focus accent.

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
