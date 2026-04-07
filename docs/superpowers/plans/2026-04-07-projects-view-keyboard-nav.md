# Projects View Keyboard Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project-level keyboard navigation to ProjectsView, with shortcuts to create/edit projects and a two-mode nav model (project focus → task focus).

**Architecture:** A new `useProjectNav` hook handles project-level arrow navigation, composed with the existing `useKeyboardNav` in `ProjectsView` via a `navMode` state. Project creation/editing uses a new `ProjectEditPalette` overlay managed by `AppLayout`, following the same custom-event pattern as `sift:edit-task`.

**Tech Stack:** React 18, TypeScript, Dexie.js (IndexedDB), Vitest + Testing Library, Tailwind CSS, nanoid.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/shared/src/types.ts` | Add `dueDate` to Project |
| Modify | `packages/shared/src/db.ts` | Bump schema to v2 |
| Modify | `apps/web/src/hooks/useKeyboardNav.ts` | Remove j/k cases |
| Modify | `apps/web/src/__tests__/useKeyboardNav.test.ts` | Update j/k tests |
| **Create** | `apps/web/src/hooks/useProjectNav.ts` | Arrow nav for projects |
| **Create** | `apps/web/src/__tests__/useProjectNav.test.ts` | Tests for useProjectNav |
| Modify | `apps/web/src/components/layout/HintBar.tsx` | Add `focusState` prop, project hint set |
| Modify | `apps/web/src/__tests__/HintBar.test.tsx` | Update to new prop |
| Modify | `apps/web/src/views/InboxView.tsx` | Pass `focusState` to HintBar |
| Modify | `apps/web/src/views/TodayView.tsx` | Pass `focusState` to HintBar |
| **Create** | `apps/web/src/components/ProjectEditPalette.tsx` | Overlay for create/edit project |
| Modify | `apps/web/src/components/layout/AppLayout.tsx` | New events + ProjectEditPalette |
| Modify | `apps/web/src/views/ProjectsView.tsx` | Two-mode nav, collapsed tasks, events |

---

## Task 1: Add `dueDate` to Project type and Dexie schema

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/db.ts`

- [ ] **Step 1: Add `dueDate` to Project type**

In `packages/shared/src/types.ts`, update the `Project` interface:

```ts
export interface Project {
  id: string;
  name: string;
  spaceId: string;    // FK → Space
  dueDate: Date | null;  // ← ADD THIS LINE
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}
```

- [ ] **Step 2: Bump Dexie schema to version 2**

In `packages/shared/src/db.ts`, add a version 2 block after version 1. The existing `version(1)` block stays untouched:

```ts
this.version(1).stores({
  spaces:   'id, updatedAt, synced',
  projects: 'id, spaceId, updatedAt, synced',
  tasks:    'id, projectId, status, workingDate, dueDate, updatedAt, synced',
});

this.version(2).stores({
  projects: 'id, spaceId, dueDate, updatedAt, synced',
});
```

No `.upgrade()` needed — Dexie leaves existing rows untouched; `dueDate` will be `undefined` on old rows, which the app treats as `null`.

- [ ] **Step 3: Build shared and verify no TypeScript errors**

```bash
npm run build --workspace=@sift/shared
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/db.ts
git commit -m "feat(shared): add dueDate to Project type and bump schema to v2"
```

---

## Task 2: Remove j/k navigation from `useKeyboardNav`

**Files:**
- Modify: `apps/web/src/hooks/useKeyboardNav.ts`
- Modify: `apps/web/src/__tests__/useKeyboardNav.test.ts`

- [ ] **Step 1: Update the failing tests first**

In `apps/web/src/__tests__/useKeyboardNav.test.ts`, replace the four j/k-specific tests. The tests `'j / ArrowDown moves focus to next task'`, `'k / ArrowUp moves focus to previous task'`, `'j cycles from last task to input (null)'`, and `'k cycles from first task to input (null)'` must be updated to only use arrow keys:

```ts
it('ArrowDown moves focus to next task', () => {
  const { result } = renderHook(() => useKeyboardNav());
  act(() => { result.current.setFocusedId('a'); });
  act(() => { result.current.handleKeyDown(makeKeyEvent('ArrowDown'), TASKS); });
  expect(result.current.focusedId).toBe('b');
});

it('ArrowUp moves focus to previous task', () => {
  const { result } = renderHook(() => useKeyboardNav());
  act(() => { result.current.setFocusedId('c'); });
  act(() => { result.current.handleKeyDown(makeKeyEvent('ArrowUp'), TASKS); });
  expect(result.current.focusedId).toBe('b');
});

it('ArrowDown from last task deselects (null)', () => {
  const { result } = renderHook(() => useKeyboardNav());
  act(() => { result.current.setFocusedId('c'); });
  act(() => { result.current.handleKeyDown(makeKeyEvent('ArrowDown'), TASKS); });
  expect(result.current.focusedId).toBeNull();
});

it('ArrowUp from first task deselects (null)', () => {
  const { result } = renderHook(() => useKeyboardNav());
  act(() => { result.current.setFocusedId('a'); });
  act(() => { result.current.handleKeyDown(makeKeyEvent('ArrowUp'), TASKS); });
  expect(result.current.focusedId).toBeNull();
});
```

Also delete the now-redundant tests `'ArrowDown works like j'` and `'ArrowUp works like k'` — arrow key behaviour is already covered above.

- [ ] **Step 2: Run tests to verify they fail (j/k still in hook)**

```bash
npx vitest run apps/web/src/__tests__/useKeyboardNav.test.ts
```

Expected: the new test names pass (ArrowDown/ArrowUp already work), old j/k tests are removed — all should pass. If any fail, check the test file structure.

- [ ] **Step 3: Remove j/k cases from `useKeyboardNav`**

In `apps/web/src/hooks/useKeyboardNav.ts`, change the switch cases:

```ts
// BEFORE:
case 'j':
case 'ArrowDown': {

// AFTER:
case 'ArrowDown': {
```

```ts
// BEFORE:
case 'k':
case 'ArrowUp': {

// AFTER:
case 'ArrowUp': {
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run apps/web/src/__tests__/useKeyboardNav.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useKeyboardNav.ts apps/web/src/__tests__/useKeyboardNav.test.ts
git commit -m "feat(web): remove j/k nav aliases — arrow keys only"
```

---

## Task 3: Create `useProjectNav` hook

**Files:**
- Create: `apps/web/src/hooks/useProjectNav.ts`
- Create: `apps/web/src/__tests__/useProjectNav.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/__tests__/useProjectNav.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { db } from '../lib/db';
import { useProjectNav } from '../hooks/useProjectNav';
import type { Project } from '@sift/shared';

function makeProject(overrides?: Partial<Project>): Project {
  const now = new Date();
  return {
    id: 'p-1',
    name: 'Test Project',
    spaceId: 'space-1',
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    synced: true,
    ...overrides,
  };
}

const PROJECTS: Project[] = [
  makeProject({ id: 'p-a', name: 'Alpha' }),
  makeProject({ id: 'p-b', name: 'Beta' }),
  makeProject({ id: 'p-c', name: 'Gamma' }),
];

function makeKeyEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true });
}

beforeEach(async () => {
  await db.tasks.clear();
  await db.projects.clear();
  await db.spaces.clear();
});

describe('useProjectNav', () => {
  it('starts with focusedProjectId null', () => {
    const { result } = renderHook(() => useProjectNav());
    expect(result.current.focusedProjectId).toBeNull();
  });

  it('ArrowDown focuses first project when none selected', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowDown'), PROJECTS); });
    expect(result.current.focusedProjectId).toBe('p-a');
  });

  it('ArrowDown moves to next project', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-a'); });
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowDown'), PROJECTS); });
    expect(result.current.focusedProjectId).toBe('p-b');
  });

  it('ArrowDown from last project deselects (null)', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-c'); });
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowDown'), PROJECTS); });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it('ArrowUp focuses last project when none selected', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowUp'), PROJECTS); });
    expect(result.current.focusedProjectId).toBe('p-c');
  });

  it('ArrowUp moves to previous project', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-c'); });
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowUp'), PROJECTS); });
    expect(result.current.focusedProjectId).toBe('p-b');
  });

  it('ArrowUp from first project deselects (null)', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-a'); });
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowUp'), PROJECTS); });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it('Escape deselects', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-b'); });
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('Escape'), PROJECTS); });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it('ignores modifier combos', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-a'); });
    const e = new KeyboardEvent('keydown', { key: 'ArrowDown', metaKey: true, bubbles: true });
    act(() => { result.current.handleProjectKeyDown(e, PROJECTS); });
    expect(result.current.focusedProjectId).toBe('p-a');
  });

  it('does nothing when project list is empty', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowDown'), []); });
    expect(result.current.focusedProjectId).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run apps/web/src/__tests__/useProjectNav.test.ts
```

Expected: FAIL — `useProjectNav` module not found.

- [ ] **Step 3: Create the hook**

Create `apps/web/src/hooks/useProjectNav.ts`:

```ts
import { useState, useCallback } from 'react';
import type { Project } from '@sift/shared';

export interface UseProjectNavReturn {
  focusedProjectId: string | null;
  setFocusedProjectId: (id: string | null) => void;
  handleProjectKeyDown: (e: KeyboardEvent, projects: Project[]) => void;
}

export function useProjectNav(): UseProjectNavReturn {
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);

  const handleProjectKeyDown = useCallback((e: KeyboardEvent, projects: Project[]) => {
    if (!projects.length) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const currentIndex = projects.findIndex((p) => p.id === focusedProjectId);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (currentIndex === -1) {
          setFocusedProjectId(projects[0].id);
        } else if (currentIndex === projects.length - 1) {
          setFocusedProjectId(null);
        } else {
          setFocusedProjectId(projects[currentIndex + 1].id);
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (currentIndex === -1) {
          setFocusedProjectId(projects[projects.length - 1].id);
        } else if (currentIndex === 0) {
          setFocusedProjectId(null);
        } else {
          setFocusedProjectId(projects[currentIndex - 1].id);
        }
        break;
      }
      case 'Escape': {
        setFocusedProjectId(null);
        break;
      }
      default:
        break;
    }
  }, [focusedProjectId]);

  return { focusedProjectId, setFocusedProjectId, handleProjectKeyDown };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run apps/web/src/__tests__/useProjectNav.test.ts
```

Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useProjectNav.ts apps/web/src/__tests__/useProjectNav.test.ts
git commit -m "feat(web): add useProjectNav hook for project-level arrow navigation"
```

---

## Task 4: Update `HintBar` with `focusState` prop

**Files:**
- Modify: `apps/web/src/components/layout/HintBar.tsx`
- Modify: `apps/web/src/__tests__/HintBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Replace the entire content of `apps/web/src/__tests__/HintBar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HintBar from '../components/layout/HintBar';

describe('HintBar', () => {
  it('shows default hints when focusState is none', () => {
    render(<HintBar focusState="none" />);
    expect(screen.getByText('New task')).toBeInTheDocument();
    expect(screen.getByText('Navigate')).toBeInTheDocument();
    expect(screen.queryByText('Done')).toBeNull();
    expect(screen.queryByText('New')).toBeNull();
  });

  it('shows task-focused hints when focusState is task', () => {
    render(<HintBar focusState="task" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Due date')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.queryByText('New task')).toBeNull();
  });

  it('shows project-focused hints when focusState is project', () => {
    render(<HintBar focusState="project" />);
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Due date')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Deselect')).toBeInTheDocument();
    expect(screen.queryByText('New task')).toBeNull();
    expect(screen.queryByText('Done')).toBeNull();
  });

  it('defaults to none hints when no prop given', () => {
    render(<HintBar />);
    expect(screen.getByText('New task')).toBeInTheDocument();
  });

  it('task-focused hot keys have accent class', () => {
    const { container } = render(<HintBar focusState="task" />);
    const kbds = container.querySelectorAll('kbd');
    const enterKbd = [...kbds].find((k) => k.textContent === 'Enter');
    expect(enterKbd?.className).toMatch(/accent/);
  });

  it('project-focused hot keys have accent class', () => {
    const { container } = render(<HintBar focusState="project" />);
    const kbds = container.querySelectorAll('kbd');
    const nKbd = [...kbds].find((k) => k.textContent === 'N');
    expect(nKbd?.className).toMatch(/accent/);
  });

  it('default keys do not have accent class', () => {
    const { container } = render(<HintBar />);
    const kbds = container.querySelectorAll('kbd');
    kbds.forEach((k) => expect(k.className).not.toMatch(/accent/));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run apps/web/src/__tests__/HintBar.test.tsx
```

Expected: FAIL — tests reference `focusState` prop not yet on HintBar.

- [ ] **Step 3: Update HintBar**

Replace the entire content of `apps/web/src/components/layout/HintBar.tsx`:

```tsx
type FocusState = 'none' | 'project' | 'task';

interface Hint {
  keys: string[];
  label: string;
  hot?: boolean;
}

const NONE_HINTS: Hint[] = [
  { keys: ['⌘K'], label: 'New task' },
  { keys: ['↑', '↓'], label: 'Navigate' },
  { keys: ['← →'], label: 'Switch view' },
];

const PROJECT_HINTS: Hint[] = [
  { keys: ['N'], label: 'New', hot: true },
  { keys: ['E'], label: 'Edit', hot: true },
  { keys: ['D'], label: 'Due date', hot: true },
  { keys: ['O'], label: 'Open', hot: true },
  { keys: ['Esc'], label: 'Deselect' },
];

const TASK_HINTS: Hint[] = [
  { keys: ['Enter'], label: 'Done', hot: true },
  { keys: ['D'], label: 'Due date', hot: true },
  { keys: ['W'], label: 'Today', hot: true },
  { keys: ['P'], label: 'Project', hot: true },
  { keys: ['E'], label: 'Edit', hot: true },
  { keys: ['⌫'], label: 'Archive' },
  { keys: ['Esc'], label: 'Back' },
];

function Key({ label, hot }: { label: string; hot?: boolean }) {
  return (
    <kbd
      className={`inline-flex items-center px-1.5 py-0.5 border-[0.5px] font-mono text-[10px] leading-none ${
        hot
          ? 'border-accent text-accent bg-accent/5'
          : 'border-border-2 bg-surface-2 text-muted'
      }`}
      style={hot ? { boxShadow: '0 0 4px rgba(255, 79, 0, 0.2)' } : undefined}
    >
      {label}
    </kbd>
  );
}

export default function HintBar({ focusState = 'none' }: { focusState?: FocusState }) {
  const hints =
    focusState === 'task' ? TASK_HINTS
    : focusState === 'project' ? PROJECT_HINTS
    : NONE_HINTS;

  return (
    <div className="flex items-center gap-6 px-4 py-2 border-t border-[0.5px] border-border bg-surface shrink-0 overflow-x-auto">
      {hints.map((hint) => (
        <div key={hint.label} className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            {hint.keys.map((k) => (
              <Key key={k} label={k} hot={hint.hot} />
            ))}
          </div>
          <span className="text-muted text-xs">{hint.label}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run apps/web/src/__tests__/HintBar.test.tsx
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/HintBar.tsx apps/web/src/__tests__/HintBar.test.tsx
git commit -m "feat(web): add focusState prop to HintBar with project-focused hint set"
```

---

## Task 5: Update `InboxView` and `TodayView` to use new `HintBar` prop

**Files:**
- Modify: `apps/web/src/views/InboxView.tsx`
- Modify: `apps/web/src/views/TodayView.tsx`

- [ ] **Step 1: Update InboxView**

In `apps/web/src/views/InboxView.tsx`, change the `HintBar` line at the bottom of the JSX:

```tsx
// BEFORE:
<HintBar taskFocused={focusedId !== null} />

// AFTER:
<HintBar focusState={focusedId !== null ? 'task' : 'none'} />
```

- [ ] **Step 2: Update TodayView**

In `apps/web/src/views/TodayView.tsx`, make the same change:

```tsx
// BEFORE:
<HintBar taskFocused={focusedId !== null} />

// AFTER:
<HintBar focusState={focusedId !== null ? 'task' : 'none'} />
```

- [ ] **Step 3: Run all tests to verify nothing broke**

```bash
npm run test --workspace=web
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/views/InboxView.tsx apps/web/src/views/TodayView.tsx
git commit -m "feat(web): update InboxView and TodayView to use HintBar focusState prop"
```

---

## Task 6: Create `ProjectEditPalette` component

**Files:**
- Create: `apps/web/src/components/ProjectEditPalette.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/ProjectEditPalette.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { db } from '../lib/db';
import type { Project } from '@sift/shared';

interface ProjectEditPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId?: string;       // create mode
  project?: Project;      // edit mode
  initialField?: 'name' | 'dueDate';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDateOptions(): { label: string; value: Date | null }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  return [
    { label: `Today · ${formatDate(today)}`, value: today },
    { label: `Tomorrow · ${formatDate(tomorrow)}`, value: tomorrow },
    { label: `Next week · ${formatDate(nextWeek)}`, value: nextWeek },
    { label: 'Clear', value: null },
  ];
}

export default function ProjectEditPalette({
  isOpen,
  onClose,
  spaceId,
  project,
  initialField = 'name',
}: ProjectEditPaletteProps) {
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [activeField, setActiveField] = useState<'name' | 'dueDate'>(initialField);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(project?.name ?? '');
    setDueDate(project?.dueDate ?? null);
    setActiveField(initialField);
  }, [isOpen, project, initialField]);

  useEffect(() => {
    if (isOpen && activeField === 'name') {
      nameRef.current?.focus();
    }
  }, [isOpen, activeField]);

  async function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date();
    if (project) {
      await db.projects.update(project.id, {
        name: trimmed,
        dueDate,
        updatedAt: now,
        synced: false,
      });
    } else {
      await db.projects.add({
        id: nanoid(),
        name: trimmed,
        spaceId: spaceId!,
        dueDate,
        createdAt: now,
        updatedAt: now,
        synced: false,
      });
    }
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && activeField === 'name') {
      e.preventDefault();
      void handleConfirm();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-surface border-[0.5px] border-border w-80 p-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted mb-3">
          {project ? 'Edit Project' : 'New Project'}
        </p>

        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="w-full bg-transparent border-b border-[0.5px] border-border pb-2 mb-3 font-sans text-sm text-text outline-none focus:border-accent"
          style={{ fontWeight: 500, letterSpacing: '-0.02em' }}
        />

        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] text-muted uppercase tracking-[0.1em]">Due</span>
          <button
            type="button"
            onClick={() =>
              setActiveField((f) => (f === 'dueDate' ? 'name' : 'dueDate'))
            }
            className={`font-mono text-[10px] px-2 py-0.5 border-[0.5px] transition-colors ${
              dueDate
                ? 'border-accent text-accent bg-accent/5'
                : 'border-border text-muted hover:text-text'
            }`}
          >
            {dueDate ? formatDate(dueDate) : 'None'}
          </button>
        </div>

        {activeField === 'dueDate' && (
          <div className="flex flex-col gap-0.5 mb-3 border-[0.5px] border-border">
            {getDateOptions().map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  setDueDate(opt.value);
                  setActiveField('name');
                  nameRef.current?.focus();
                }}
                className="text-left font-mono text-[11px] text-muted hover:text-text px-3 py-1.5 hover:bg-surface-2 transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-4 mt-3">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] text-muted hover:text-text transition-colors"
          >
            Esc · Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            className="font-mono text-[10px] text-accent hover:text-text transition-colors"
          >
            Enter · Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --workspace=web 2>&1 | head -30
```

Expected: no TypeScript errors referencing `ProjectEditPalette.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ProjectEditPalette.tsx
git commit -m "feat(web): add ProjectEditPalette overlay component"
```

---

## Task 7: Update `AppLayout` — events and `ProjectEditPalette`

**Files:**
- Modify: `apps/web/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Update AppLayout**

Replace the entire content of `apps/web/src/components/layout/AppLayout.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Topbar from './Topbar';
import CommandPalette from '../CommandPalette';
import ProjectEditPalette from '../ProjectEditPalette';
import { useSpacesProjects } from '../../hooks/useSpacesProjects';
import type { Task, ChipFocus, Project } from '@sift/shared';

const VIEWS = ['/inbox', '/today', '/projects'];

interface ProjectPaletteState {
  spaceId?: string;
  project?: Project;
  initialField?: 'name' | 'dueDate';
}

interface AppLayoutProps {
  isSynced: boolean;
}

export default function AppLayout({ isSynced }: AppLayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editChip, setEditChip] = useState<ChipFocus | null>(null);

  const [projectPaletteOpen, setProjectPaletteOpen] = useState(false);
  const [projectPaletteState, setProjectPaletteState] = useState<ProjectPaletteState>({});
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);

  const { spacesWithProjects } = useSpacesProjects();
  const navigate = useNavigate();
  const location = useLocation();

  // Fallback default project id when no project is keyboard-focused
  const fallbackProjectId = spacesWithProjects.flatMap((s) => s.projects)[0]?.id ?? '';
  const defaultProjectId = focusedProjectId ?? fallbackProjectId;

  function openPalette(task?: Task | null, chip?: ChipFocus | null) {
    setEditTask(task ?? null);
    setEditChip(chip ?? null);
    setPaletteOpen(true);
  }

  function closePalette() {
    setPaletteOpen(false);
    setEditTask(null);
    setEditChip(null);
  }

  function closeProjectPalette() {
    setProjectPaletteOpen(false);
    setProjectPaletteState({});
  }

  useEffect(() => {
    function onEditTask(e: Event) {
      const { task, chip } = (e as CustomEvent<{ task: Task; chip: ChipFocus | null }>).detail;
      openPalette(task, chip);
    }
    function onNewProject(e: Event) {
      const { spaceId } = (e as CustomEvent<{ spaceId: string }>).detail;
      setProjectPaletteState({ spaceId });
      setProjectPaletteOpen(true);
    }
    function onEditProject(e: Event) {
      const { project, field } = (e as CustomEvent<{ project: Project; field: 'name' | 'dueDate' }>).detail;
      setProjectPaletteState({ project, initialField: field });
      setProjectPaletteOpen(true);
    }
    function onProjectFocused(e: Event) {
      const { projectId } = (e as CustomEvent<{ projectId: string | null }>).detail;
      setFocusedProjectId(projectId);
    }

    window.addEventListener('sift:edit-task', onEditTask);
    window.addEventListener('sift:new-project', onNewProject);
    window.addEventListener('sift:edit-project', onEditProject);
    window.addEventListener('sift:project-focused', onProjectFocused);

    return () => {
      window.removeEventListener('sift:edit-task', onEditTask);
      window.removeEventListener('sift:new-project', onNewProject);
      window.removeEventListener('sift:edit-project', onEditProject);
      window.removeEventListener('sift:project-focused', onProjectFocused);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (paletteOpen) {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }

      if (e.key === 'Escape' && paletteOpen) {
        e.preventDefault();
        closePalette();
        return;
      }

      if (e.key === 'Escape' && projectPaletteOpen) {
        e.preventDefault();
        closeProjectPalette();
        return;
      }

      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (!isInput && !paletteOpen && !projectPaletteOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const curr = VIEWS.findIndex((v) => location.pathname.startsWith(v));
        if (curr === -1) return;
        const next =
          e.key === 'ArrowRight'
            ? VIEWS[(curr + 1) % VIEWS.length]
            : VIEWS[(curr - 1 + VIEWS.length) % VIEWS.length];
        void navigate(next);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, projectPaletteOpen, navigate, location.pathname]);

  return (
    <div className="flex flex-col h-full bg-bg">
      <Topbar isSynced={isSynced} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
      <CommandPalette
        isOpen={paletteOpen}
        onClose={closePalette}
        defaultProjectId={defaultProjectId}
        editTask={editTask}
        editChip={editChip}
      />
      <ProjectEditPalette
        isOpen={projectPaletteOpen}
        onClose={closeProjectPalette}
        spaceId={projectPaletteState.spaceId}
        project={projectPaletteState.project}
        initialField={projectPaletteState.initialField}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --workspace=web 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/AppLayout.tsx
git commit -m "feat(web): wire ProjectEditPalette and project-focused events into AppLayout"
```

---

## Task 8: Refactor `ProjectsView` — two-mode nav

**Files:**
- Modify: `apps/web/src/views/ProjectsView.tsx`

- [ ] **Step 1: Rewrite ProjectsView**

Replace the entire content of `apps/web/src/views/ProjectsView.tsx`:

```tsx
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useProjectTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useProjectNav } from '../hooks/useProjectNav';
import TaskRow from '../components/TaskRow';
import HintBar from '../components/layout/HintBar';
import { db } from '../lib/db';
import type { Task, Project } from '@sift/shared';

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-border overflow-hidden">
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted font-mono tabular-nums">{done}/{total}</span>
    </div>
  );
}

function dispatchEditTask(task: Task, chip: 'dueDate' | 'workingDate' | 'project' | null) {
  window.dispatchEvent(new CustomEvent('sift:edit-task', { detail: { task, chip } }));
}

export default function ProjectsView() {
  const groups = useProjectTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());
  const [navMode, setNavMode] = useState<'project' | 'task'>('project');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const { focusedProjectId, setFocusedProjectId, handleProjectKeyDown } = useProjectNav();
  const handleToggle = useCallback((task: Task) => {
    if (task.status === 'done') {
      const now = new Date();
      void db.tasks.update(task.id, { status: task.workingDate ? 'todo' : 'inbox', completedAt: null, updatedAt: now, synced: false });
    } else {
      setExitingIds((prev) => new Set([...prev, task.id]));
      setTimeout(() => {
        const now = new Date();
        void db.tasks.update(task.id, { status: 'done', completedAt: now, updatedAt: now, synced: false });
        setExitingIds((prev) => { const n = new Set(prev); n.delete(task.id); return n; });
      }, 320);
    }
  }, []);
  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav(handleToggle);

  // Flat list of all projects for project-level nav
  const allProjects = useMemo<Project[]>(
    () => groups.flatMap(({ projects: ps }) => ps.map(({ project }) => project)),
    [groups]
  );

  // Tasks for the currently expanded project (active tasks only)
  const expandedTasks = useMemo<Task[]>(() => {
    if (!expandedProjectId) return [];
    for (const { projects: ps } of groups) {
      for (const { project, tasks } of ps) {
        if (project.id === expandedProjectId) {
          return tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
        }
      }
    }
    return [];
  }, [groups, expandedProjectId]);

  // Clear focused task when it leaves the expanded project's task list
  useEffect(() => {
    if (focusedId !== null && !expandedTasks.find((t) => t.id === focusedId)) {
      setFocusedId(null);
    }
  }, [expandedTasks, focusedId, setFocusedId]);

  // Broadcast focused project to AppLayout for Cmd+K prefill
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('sift:project-focused', { detail: { projectId: focusedProjectId } })
    );
  }, [focusedProjectId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (navMode === 'task') {
        // Esc exits task mode back to project mode
        if (e.key === 'Escape') {
          e.preventDefault();
          setNavMode('project');
          setFocusedId(null);
          return;
        }
        // D/W/P/E on focused task
        const focused = focusedId !== null ? expandedTasks.find((t) => t.id === focusedId) ?? null : null;
        if (focused) {
          if (e.key === 'd' || e.key === 'D') { e.preventDefault(); dispatchEditTask(focused, 'dueDate'); return; }
          if (e.key === 'w' || e.key === 'W') { e.preventDefault(); dispatchEditTask(focused, 'workingDate'); return; }
          if (e.key === 'p' || e.key === 'P') { e.preventDefault(); dispatchEditTask(focused, 'project'); return; }
          if (e.key === 'e' || e.key === 'E') { e.preventDefault(); dispatchEditTask(focused, null); return; }
        }
        handleKeyDown(e, expandedTasks);
      } else {
        // Project nav mode
        if (focusedProjectId !== null) {
          const focusedProject = allProjects.find((p) => p.id === focusedProjectId);
          if (focusedProject) {
            if (e.key === 'n' || e.key === 'N') {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('sift:new-project', { detail: { spaceId: focusedProject.spaceId } }));
              return;
            }
            if (e.key === 'e' || e.key === 'E') {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('sift:edit-project', { detail: { project: focusedProject, field: 'name' } }));
              return;
            }
            if (e.key === 'd' || e.key === 'D') {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('sift:edit-project', { detail: { project: focusedProject, field: 'dueDate' } }));
              return;
            }
            if (e.key === 'o' || e.key === 'O') {
              e.preventDefault();
              setExpandedProjectId(focusedProjectId);
              setNavMode('task');
              return;
            }
          }
        }
        // N with no project focused → new project in first available space
        if (e.key === 'n' || e.key === 'N') {
          const firstSpaceId = allProjects[0]?.spaceId ?? groups[0]?.space.id;
          if (firstSpaceId) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('sift:new-project', { detail: { spaceId: firstSpaceId } }));
          }
          return;
        }
        handleProjectKeyDown(e, allProjects);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navMode, focusedProjectId, focusedId, allProjects, expandedTasks, handleKeyDown, handleProjectKeyDown, groups]);

  const focusState =
    navMode === 'task' && focusedId !== null ? 'task'
    : focusedProjectId !== null ? 'project'
    : 'none';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-1">Projects</h2>
        <p className="text-muted text-[11px]">Progress per project.</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {groups.map(({ space, projects: ps }) => (
          <div key={space.id} className="mb-6">
            <div className="flex items-center gap-2 px-4 py-2 mt-2">
              <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: space.color }} />
              <span className="text-[9px] text-muted font-mono uppercase tracking-[0.2em]">{space.name}</span>
            </div>

            {ps.map(({ project, tasks }) => {
              const done = tasks.filter((t) => t.status === 'done').length;
              const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
              const isFocusedProject = focusedProjectId === project.id;
              const isExpanded = expandedProjectId === project.id;

              return (
                <div
                  key={project.id}
                  className={`mb-4 border-l-2 transition-colors duration-150 ${
                    isFocusedProject ? 'border-accent' : 'border-transparent'
                  }`}
                  style={isFocusedProject ? { boxShadow: '-2px 0 8px rgba(255, 79, 0, 0.2)' } : undefined}
                  onClick={() => setFocusedProjectId(project.id)}
                >
                  <div className="px-4 py-2 border-b border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-mono text-[11px] ${isFocusedProject ? 'text-accent' : 'text-text'}`}>
                        {project.name}
                      </span>
                      {project.dueDate && (
                        <span className="font-mono text-[10px] text-muted">
                          {project.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <ProgressBar done={done} total={tasks.length} />
                  </div>

                  {isExpanded && (
                    activeTasks.length === 0 ? (
                      <p className="font-mono text-[10px] text-muted px-4 py-3 uppercase tracking-[0.1em]">All done.</p>
                    ) : (
                      activeTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          project={project}
                          space={space}
                          isFocused={navMode === 'task' && focusedId === task.id}
                          onFocus={() => setFocusedId(task.id)}
                          onToggle={() => handleToggle(task)}
                          exiting={exitingIds.has(task.id)}
                        />
                      ))
                    )
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-muted text-sm px-4 py-8 text-center">
            No projects yet. Press N to create one.
          </p>
        )}
      </div>

      <HintBar focusState={focusState as 'none' | 'project' | 'task'} />
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npm run test --workspace=web
```

Expected: all tests pass. (ProjectsView has no dedicated unit tests — its behaviour is tested manually.)

- [ ] **Step 3: Build to verify TypeScript**

```bash
npm run build --workspace=web 2>&1 | head -30
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/views/ProjectsView.tsx
git commit -m "feat(web): two-mode keyboard nav in ProjectsView — project focus + task focus via O"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|------------------|-----------|
| Arrow keys navigate projects | Task 3 (useProjectNav), Task 8 (ProjectsView) |
| N — new project | Task 8 (key handler), Task 6 (palette), Task 7 (AppLayout event) |
| E — edit project name | Task 8 (key handler), Task 6 (palette), Task 7 (AppLayout event) |
| D — edit project due date | Task 1 (schema), Task 8 (key handler), Task 6 (palette), Task 7 (AppLayout event) |
| O — expand task list inline | Task 8 (expandedProjectId + navMode='task') |
| Task nav within O | Task 8 (handleKeyDown scoped to expandedTasks) |
| Esc from task mode → project mode | Task 8 (Escape guard in task navMode) |
| Cmd+K prefills focused project | Task 7 (sift:project-focused listener + defaultProjectId) |
| HintBar project-focused state | Task 4 (PROJECT_HINTS), Task 8 (focusState prop) |
| HintBar "Back" in task mode | Task 4 (TASK_HINTS) |
| Remove j/k navigation | Task 2 |
| Update InboxView + TodayView HintBar prop | Task 5 |
| Cascading HintBar callers | Task 5 |

**Placeholder scan:** No TBDs, no vague steps. All code shown in full. ✓

**Type consistency:**
- `useProjectNav` returns `focusedProjectId`, `setFocusedProjectId`, `handleProjectKeyDown` — used identically in Task 8. ✓
- `ProjectEditPalette` props (`spaceId`, `project`, `initialField`) match the `projectPaletteState` spread in Task 7. ✓
- `HintBar` `focusState` prop type `'none' | 'project' | 'task'` used consistently in Tasks 4, 5, 8. ✓
- `Project.dueDate: Date | null` defined in Task 1, read in Task 8 (`project.dueDate`), written in Task 6. ✓
