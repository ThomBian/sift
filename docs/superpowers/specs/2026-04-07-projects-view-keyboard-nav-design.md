# Projects View — Keyboard Navigation & Project Management

**Date:** 2026-04-07  
**Status:** Approved

## Overview

Extend `ProjectsView` with project-level keyboard navigation and CRUD shortcuts mirroring the task-view UX. Projects become first-class navigable items: arrows select them, dedicated keys create/edit/open them, and Cmd+K pre-fills the selected project when creating tasks.

---

## 1. Data Model Changes

**File:** `packages/shared/src/types.ts`

Add `dueDate: Date | null` to the `Project` interface:

```ts
export interface Project {
  id: string;
  name: string;
  spaceId: string;
  dueDate: Date | null;   // NEW
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}
```

**File:** `packages/shared/src/db.ts`

Bump to schema version 2, adding `dueDate` to the projects index:

```ts
this.version(2).stores({
  projects: 'id, spaceId, dueDate, updatedAt, synced',
});
```

No migration transform needed — Dexie fills missing fields with `undefined`, which the app treats as `null`.

---

## 2. `useProjectNav` Hook

**File:** `apps/web/src/hooks/useProjectNav.ts`

New hook for project-level arrow navigation, parallel to `useKeyboardNav`.

```ts
export function useProjectNav(): {
  focusedProjectId: string | null;
  setFocusedProjectId: (id: string | null) => void;
  handleProjectKeyDown: (e: KeyboardEvent, projects: Project[]) => void;
}
```

**Behaviour:**
- `↑` — move focus to previous project; at first → deselect (null)
- `↓` — move focus to next project; at last → deselect (null)
- `Escape` — deselect (set to null)
- All other keys are ignored (handled upstream in ProjectsView's key listener)
- Arrow keys only — `j / k` are not supported
- Skips modifier combos (metaKey / ctrlKey / altKey)

---

## 3. `ProjectsView` Refactor

**File:** `apps/web/src/views/ProjectsView.tsx`

### Navigation modes

```ts
const [navMode, setNavMode] = useState<'project' | 'task'>('project');
const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
```

- **project mode** (default): `handleProjectKeyDown` is active; task lists are collapsed.
- **task mode**: `handleKeyDown` is active, scoped to the tasks of `expandedProjectId`.

### Task list collapse

Each project row renders its task list only when `project.id === expandedProjectId`. The progress bar and name are always visible.

### Key handler (window keydown)

```
Guard: skip if target is INPUT/TEXTAREA
Guard: skip modifier combos

if navMode === 'project' && focusedProjectId !== null:
  N → dispatch sift:new-project { spaceId: focusedProject.spaceId }
  E → dispatch sift:edit-project { project: focusedProject, field: 'name' }
  D → dispatch sift:edit-project { project: focusedProject, field: 'dueDate' }
  O → setExpandedProjectId(focusedProjectId); setNavMode('task')
  else → handleProjectKeyDown(e, allProjects)

if navMode === 'project' && focusedProjectId === null:
  N → dispatch sift:new-project { spaceId: defaultSpaceId }
  else → handleProjectKeyDown(e, allProjects)

if navMode === 'task':
  Escape → setNavMode('project'); setFocusedTaskId(null)   [don't propagate to project Esc]
  else → handleKeyDown(e, expandedProjectTasks)
```

### Cmd+K prefill

Whenever `focusedProjectId` changes, dispatch:
```ts
window.dispatchEvent(new CustomEvent('sift:project-focused', {
  detail: { projectId: focusedProjectId }
}));
```

### HintBar

Pass a discriminated prop to indicate the current focus state:

```tsx
<HintBar
  focusState={
    navMode === 'task' && focusedTaskId !== null ? 'task'
    : focusedProjectId !== null ? 'project'
    : 'none'
  }
/>
```

---

## 4. `ProjectEditPalette` Component

**File:** `apps/web/src/components/ProjectEditPalette.tsx`

A fixed overlay (same layer as `CommandPalette`), managed by `AppLayout`.

### Props

```ts
interface ProjectEditPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  // create mode
  spaceId?: string;
  // edit mode
  project?: Project;
  initialField?: 'name' | 'dueDate';
}
```

### Behaviour

- **Create mode** (`project` is undefined): name input empty, space inferred from `spaceId`. On confirm → `db.projects.add(...)` with `synced: false`.
- **Edit mode** (`project` defined): name pre-filled; `initialField` controls which field receives focus. On confirm → `db.projects.update(project.id, { name, dueDate, updatedAt, synced: false })`.
- Enter confirms, Esc closes without saving.
- Backdrop: `backdrop-filter: blur(12px)`, `background: rgba(0,0,0,0.5)`.
- Panel: sharp border (`border-[0.5px] border-border`), no border-radius.

### Fields

| Field | Control | Notes |
|-------|---------|-------|
| Name | Text input | Geist Sans, weight 500 |
| Due date | Date chip (reuse SmartInput chip style) | Optional, clearable |

Space is not user-selectable during edit. During creation, it defaults to the dispatched `spaceId` (the focused project's space, or the first space).

---

## 5. `AppLayout` Changes

**File:** `apps/web/src/components/layout/AppLayout.tsx`

### New state

```ts
const [projectPaletteOpen, setProjectPaletteOpen] = useState(false);
const [projectPaletteProps, setProjectPaletteProps] = useState<{
  spaceId?: string;
  project?: Project;
  initialField?: 'name' | 'dueDate';
}>({});
const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
```

### New event listeners

```ts
// sift:new-project → open palette in create mode
window.addEventListener('sift:new-project', (e) => {
  const { spaceId } = e.detail;
  setProjectPaletteProps({ spaceId });
  setProjectPaletteOpen(true);
});

// sift:edit-project → open palette in edit mode
window.addEventListener('sift:edit-project', (e) => {
  const { project, field } = e.detail;
  setProjectPaletteProps({ project, initialField: field });
  setProjectPaletteOpen(true);
});

// sift:project-focused → update defaultProjectId for Cmd+K
window.addEventListener('sift:project-focused', (e) => {
  setFocusedProjectId(e.detail.projectId);
});
```

### Cmd+K prefill

Replace `useDefaultProjectId()` with: if `focusedProjectId` is set, use it; else fall back to the first project (existing behaviour).

### Render

```tsx
<ProjectEditPalette
  isOpen={projectPaletteOpen}
  onClose={() => setProjectPaletteOpen(false)}
  {...projectPaletteProps}
/>
```

---

## 6. `HintBar` Changes

**File:** `apps/web/src/components/layout/HintBar.tsx`

Replace `taskFocused: boolean` prop with `focusState: 'none' | 'project' | 'task'`.

Three hint sets:

```ts
const NONE_HINTS   = [⌘K New task, ↑↓ Navigate, ←→ Switch view]
const PROJECT_HINTS = [N New, E Edit, D Due date, O Open, Esc Deselect]  // hot: N/E/D/O
const TASK_HINTS   = [Enter Done, D Due, W Today, P Project, E Edit, ⌫ Archive, Esc Back]  // hot: Enter/D/W/P/E
```

`Esc` in task-hints is labelled **"Back"** (not "Deselect") to signal it returns to project nav.

---

## 7. Remove `j / k` Navigation

`useKeyboardNav` currently handles `j` and `k` as aliases for `↑` / `↓`. Remove those cases from the switch statement. Arrow keys are the only navigation keys going forward. This affects `InboxView`, `TodayView`, and `ProjectsView` (via `useKeyboardNav` and the new `useProjectNav`).

---

## 8. Cascading Change — `HintBar` callers

`InboxView` and `TodayView` currently pass `taskFocused={focusedId !== null}`. After the `HintBar` prop is renamed to `focusState`, both views must be updated:

```tsx
<HintBar focusState={focusedId !== null ? 'task' : 'none'} />
```

---

## 9. Out of Scope

- Deleting projects (not requested; destructive action warrants separate treatment)
- Reordering projects
- Per-project colour / icon
- Space creation from this view
