# Task Edit Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a task is focused via keyboard nav, pressing D/W/P/E opens a full-width editing palette anchored at the bottom of the view; the HintBar switches to context-aware shortcuts.

**Architecture:** D/W/P/E shortcuts open the existing `CommandPalette` pre-populated with the focused task and pre-focused on the relevant chip — no new component. Views track an `editField` state; the existing keydown listener is extended with D/W/P/E handlers. `CommandPalette` gains `editTask` and `editChip` props. HintBar gains a `taskFocused` prop and renders two distinct hint sets.

**Tech Stack:** React, TypeScript, Tailwind CSS, Dexie.js (for task updates), Vitest + Testing Library

---

## File Map

| Action | File |
|--------|------|
| **Modify** | `apps/web/src/components/CommandPalette.tsx` (add `editTask` / `editChip` props) |
| **Modify** | `apps/web/src/components/layout/HintBar.tsx` |
| **Modify** | `apps/web/src/components/layout/AppLayout.tsx` (remove HintBar) |
| **Modify** | `apps/web/src/views/InboxView.tsx` |
| **Modify** | `apps/web/src/views/TodayView.tsx` |
| **Modify** | `apps/web/src/views/ProjectsView.tsx` |
| **Create** | `apps/web/src/__tests__/HintBar.test.tsx` |
| **Modify** | `apps/web/src/__tests__/CommandPalette.test.tsx` (add edit-mode tests) |

---

## Task 1: Context-aware HintBar

**Files:**
- Modify: `apps/web/src/components/layout/HintBar.tsx`
- Modify: `apps/web/src/components/layout/AppLayout.tsx`
- Create: `apps/web/src/__tests__/HintBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/__tests__/HintBar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HintBar from '../components/layout/HintBar';

describe('HintBar', () => {
  it('shows default hints when taskFocused is false', () => {
    render(<HintBar />);
    expect(screen.getByText('New task')).toBeInTheDocument();
    expect(screen.getByText('Navigate')).toBeInTheDocument();
    expect(screen.queryByText('Due date')).toBeNull();
    expect(screen.queryByText('Project')).toBeNull();
  });

  it('shows task-focused hints when taskFocused is true', () => {
    render(<HintBar taskFocused />);
    expect(screen.getByText('Due date')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.queryByText('New task')).toBeNull();
  });

  it('renders hot keys with accent class when taskFocused', () => {
    const { container } = render(<HintBar taskFocused />);
    const kbds = container.querySelectorAll('kbd');
    const enterKbd = [...kbds].find(k => k.textContent === 'Enter');
    expect(enterKbd?.className).toMatch(/accent/);
  });

  it('default keys do not have accent class', () => {
    const { container } = render(<HintBar />);
    const kbds = container.querySelectorAll('kbd');
    kbds.forEach(k => expect(k.className).not.toMatch(/accent/));
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run apps/web/src/__tests__/HintBar.test.tsx
```

Expected: FAIL (HintBar doesn't accept `taskFocused` yet)

- [ ] **Step 3: Rewrite HintBar**

Replace `apps/web/src/components/layout/HintBar.tsx` entirely:

```tsx
interface Hint {
  keys: string[];
  label: string;
  hot?: boolean;
}

const DEFAULT_HINTS: Hint[] = [
  { keys: ['⌘K'], label: 'New task' },
  { keys: ['↑', '↓'], label: 'Navigate' },
  { keys: ['← →'], label: 'Switch view' },
];

const TASK_HINTS: Hint[] = [
  { keys: ['Enter'], label: 'Done', hot: true },
  { keys: ['D'], label: 'Due date', hot: true },
  { keys: ['W'], label: 'Today', hot: true },
  { keys: ['P'], label: 'Project', hot: true },
  { keys: ['E'], label: 'Edit', hot: true },
  { keys: ['⌫'], label: 'Archive' },
  { keys: ['Esc'], label: 'Deselect' },
];

function Key({ label, hot }: { label: string; hot?: boolean }) {
  return (
    <kbd className={`inline-flex items-center px-1.5 py-0.5 border font-mono text-[10px] leading-none ${
      hot
        ? 'border-accent text-accent bg-accent/5'
        : 'border-border-2 bg-surface-2 text-muted'
    }`}>
      {label}
    </kbd>
  );
}

export default function HintBar({ taskFocused = false }: { taskFocused?: boolean }) {
  const hints = taskFocused ? TASK_HINTS : DEFAULT_HINTS;
  return (
    <div className="flex items-center gap-6 px-4 py-2 border-t border-border bg-surface shrink-0 overflow-x-auto">
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

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run apps/web/src/__tests__/HintBar.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Remove HintBar from AppLayout**

In `apps/web/src/components/layout/AppLayout.tsx`, remove the `HintBar` import and `<HintBar />` from the JSX:

```tsx
// Remove this line:
import HintBar from './HintBar';

// Remove <HintBar /> from inside <main>:
// Before:
//   <div className="flex-1 overflow-y-auto">
//     <Outlet />
//   </div>
//   <HintBar />
// After:
//   <div className="flex-1 overflow-y-auto">
//     <Outlet />
//   </div>
```

- [ ] **Step 6: Run all tests to confirm nothing broke**

```bash
npm run test --workspace=web
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/layout/HintBar.tsx \
        apps/web/src/components/layout/AppLayout.tsx \
        apps/web/src/__tests__/HintBar.test.tsx
git commit -m "feat(web): context-aware HintBar with task-focused hints"
```

---

## Task 2: CommandPalette edit mode

**Files:**
- Modify: `apps/web/src/components/CommandPalette.tsx`
- Modify: `apps/web/src/__tests__/CommandPalette.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/__tests__/CommandPalette.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommandPalette from '../components/CommandPalette';
import type { Task } from '@sift/shared';
import type { ProjectWithSpace } from '@sift/shared';

const now = new Date();

const baseTask: Task = {
  id: 'task-1',
  title: 'Fix the bug',
  projectId: 'p1',
  status: 'inbox',
  workingDate: null,
  dueDate: null,
  createdAt: now,
  updatedAt: now,
  completedAt: null,
  synced: true,
};

const space = { id: 's1', name: 'Work', color: '#5E6AD2', createdAt: now, updatedAt: now, synced: true };

const projects: ProjectWithSpace[] = [
  { id: 'p1', name: 'General', spaceId: 's1', createdAt: now, updatedAt: now, synced: true, space },
  { id: 'p2', name: 'Growth', spaceId: 's1', createdAt: now, updatedAt: now, synced: true, space },
];

describe('CommandPalette', () => {
  it('displays the task title in the input when defaultField is title', () => {
    render(
      <CommandPalette
        task={baseTask}
        defaultField="title"
        projects={projects}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('Fix the bug')).toBeInTheDocument();
  });

  it('shows task title in context row', () => {
    render(
      <CommandPalette
        task={baseTask}
        defaultField="title"
        projects={projects}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/Fix the bug/)).toBeInTheDocument();
  });

  it('shows project list in dropdown when defaultField is project', () => {
    render(
      <CommandPalette
        task={baseTask}
        defaultField="project"
        projects={projects}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Growth' })).toBeInTheDocument();
  });

  it('shows date options in dropdown when defaultField is dueDate', () => {
    render(
      <CommandPalette
        task={baseTask}
        defaultField="dueDate"
        projects={projects}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Today/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tomorrow/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });

  it('shows date options when defaultField is workingDate', () => {
    render(
      <CommandPalette
        task={baseTask}
        defaultField="workingDate"
        projects={projects}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Today/ })).toBeInTheDocument();
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(
      <CommandPalette
        task={baseTask}
        defaultField="title"
        projects={projects}
        onSave={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.keyDown(screen.getByDisplayValue('Fix the bug'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with updated title when ⌘↩ is pressed', () => {
    const onSave = vi.fn();
    render(
      <CommandPalette
        task={baseTask}
        defaultField="title"
        projects={projects}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByDisplayValue('Fix the bug');
    fireEvent.change(input, { target: { value: 'Fixed bug' } });
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Fixed bug' })
    );
  });

  it('calls onSave with selected project when project button is clicked', () => {
    const onSave = vi.fn();
    render(
      <CommandPalette
        task={baseTask}
        defaultField="project"
        projects={projects}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Growth' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p2' })
    );
  });

  it('calls onSave with null dueDate when Clear is clicked', () => {
    const onSave = vi.fn();
    render(
      <CommandPalette
        task={{ ...baseTask, dueDate: new Date() }}
        defaultField="dueDate"
        projects={projects}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: null })
    );
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run apps/web/src/__tests__/CommandPalette.test.tsx
```

Expected: FAIL (component doesn't exist)

- [ ] **Step 3: Create CommandPalette**

Create `apps/web/src/components/CommandPalette.tsx`:

```tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import type { Task, ProjectWithSpace } from '@sift/shared';

export type EditField = 'title' | 'dueDate' | 'workingDate' | 'project';
export type EditPatch = Partial<Pick<Task, 'title' | 'dueDate' | 'workingDate' | 'projectId'>>;

interface CommandPaletteProps {
  task: Task;
  defaultField: EditField;
  projects: ProjectWithSpace[];
  onSave: (patch: EditPatch) => void;
  onCancel: () => void;
}

interface DateOption {
  label: string;
  value: Date | null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDateOptions(): DateOption[] {
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

export default function CommandPalette({
  task,
  defaultField,
  projects,
  onSave,
  onCancel,
}: CommandPaletteProps) {
  const [title, setTitle] = useState(task.title);
  const [projectId, setProjectId] = useState(task.projectId);
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate);
  const [workingDate, setWorkingDate] = useState<Date | null>(task.workingDate);
  const [activeChip, setActiveChip] = useState<EditField>(defaultField);
  const [search, setSearch] = useState('');
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const dateOptions = useMemo(() => getDateOptions(), []);

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [projects, search]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const showDropdown =
    activeChip === 'dueDate' || activeChip === 'workingDate' || activeChip === 'project';

  function buildPatch(): EditPatch {
    return { title, projectId, dueDate, workingDate };
  }

  function selectDateOption(option: DateOption) {
    if (activeChip === 'dueDate') {
      setDueDate(option.value);
      onSave({ ...buildPatch(), dueDate: option.value });
    } else {
      setWorkingDate(option.value);
      onSave({ ...buildPatch(), workingDate: option.value });
    }
  }

  function selectProject(project: ProjectWithSpace) {
    setProjectId(project.id);
    onSave({ ...buildPatch(), projectId: project.id });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSave(buildPatch());
      return;
    }
    const itemCount =
      activeChip === 'project' ? filteredProjects.length : dateOptions.length;
    if (e.key === 'ArrowDown' && showDropdown) {
      e.preventDefault();
      setDropdownIndex((i) => Math.min(i + 1, itemCount - 1));
      return;
    }
    if (e.key === 'ArrowUp' && showDropdown) {
      e.preventDefault();
      setDropdownIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && showDropdown) {
      e.preventDefault();
      if (activeChip === 'project') {
        const project = filteredProjects[dropdownIndex];
        if (project) selectProject(project);
      } else {
        const option = dateOptions[dropdownIndex];
        if (option !== undefined) selectDateOption(option);
      }
    }
  }

  function handleChipClick(chip: EditField) {
    setActiveChip(chip);
    setDropdownIndex(0);
    setSearch('');
    inputRef.current?.focus();
  }

  const currentProject = projects.find((p) => p.id === projectId);
  const inputValue = activeChip === 'project' ? search : title;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (activeChip === 'project') {
      setSearch(e.target.value);
      setDropdownIndex(0);
    } else {
      setTitle(e.target.value);
    }
  }

  const chipBase =
    'inline-flex items-center gap-1 px-2 py-0.5 border text-[11px] font-mono cursor-pointer';
  const chipIdle = 'border-border-2 text-muted hover:border-accent hover:text-accent';
  const chipActive = 'border-accent text-accent bg-accent/5';

  return (
    <div className="border-t border-border bg-surface shrink-0">
      {/* Context row */}
      <div className="flex items-center px-4 py-1 border-b border-border bg-surface-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
          Editing · {task.title}
        </span>
        <span className="ml-auto font-mono text-[9px] text-dim">
          esc to cancel · ⌘↩ to save
        </span>
      </div>

      {/* Input row */}
      <div className="flex items-center h-11 px-4 gap-3">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={activeChip === 'project' ? 'Filter projects…' : ''}
          className="flex-1 bg-transparent border-none outline-none text-sm text-text font-sans min-w-0"
        />
        <div className="w-px h-4 bg-border shrink-0" />
        <button
          type="button"
          onClick={() => handleChipClick('project')}
          className={`${chipBase} ${activeChip === 'project' ? chipActive : chipIdle}`}
        >
          {currentProject ? (
            <>
              <span
                className="w-1.5 h-1.5 shrink-0"
                style={{ backgroundColor: currentProject.space.color }}
              />
              {currentProject.name}
            </>
          ) : (
            '@p —'
          )}
        </button>
        <button
          type="button"
          onClick={() => handleChipClick('dueDate')}
          className={`${chipBase} ${activeChip === 'dueDate' ? chipActive : chipIdle}`}
        >
          @d {dueDate ? formatDate(dueDate) : '—'}
        </button>
        <button
          type="button"
          onClick={() => handleChipClick('workingDate')}
          className={`${chipBase} ${activeChip === 'workingDate' ? chipActive : chipIdle}`}
        >
          @w {workingDate ? formatDate(workingDate) : '—'}
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="border-t border-border">
          {activeChip === 'project'
            ? filteredProjects.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProject(p)}
                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left ${
                    i === dropdownIndex ? 'bg-accent/5 text-text' : 'text-text hover:bg-surface-2'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 shrink-0"
                    style={{ backgroundColor: p.space.color }}
                  />
                  {p.name}
                </button>
              ))
            : dateOptions.map((opt, i) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => selectDateOption(opt)}
                  className={`flex items-center w-full px-4 py-2 text-sm text-left ${
                    i === dropdownIndex ? 'bg-accent/5 text-text' : 'text-text hover:bg-surface-2'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run apps/web/src/__tests__/CommandPalette.test.tsx
```

Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/CommandPalette.tsx \
        apps/web/src/__tests__/CommandPalette.test.tsx
git commit -m "feat(web): CommandPalette component"
```

---

## Task 3: Wire InboxView

**Files:**
- Modify: `apps/web/src/views/InboxView.tsx`

- [ ] **Step 1: Rewrite InboxView**

Replace the full contents of `apps/web/src/views/InboxView.tsx`:

```tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useInboxTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import TaskList from '../components/TaskList';
import HintBar from '../components/layout/HintBar';
import CommandPalette, { type EditField, type EditPatch } from '../components/CommandPalette';
import { db } from '../lib/db';
import type { Task, ProjectWithSpace } from '@sift/shared';

export default function InboxView() {
  const tasks = useInboxTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());
  const [editField, setEditField] = useState<EditField | null>(null);

  const { spacesWithProjects } = useSpacesProjects();
  const projects = useMemo<ProjectWithSpace[]>(
    () => spacesWithProjects.flatMap(({ space, projects: ps }) => ps.map((p) => ({ ...p, space }))),
    [spacesWithProjects]
  );

  const handleToggle = useCallback((task: Task) => {
    if (task.status === 'done') {
      void db.tasks.update(task.id, { status: 'inbox', completedAt: null, updatedAt: new Date(), synced: false });
    } else {
      setExitingIds((prev) => new Set([...prev, task.id]));
      setTimeout(() => {
        void db.tasks.update(task.id, { status: 'done', completedAt: new Date(), updatedAt: new Date(), synced: false });
        setExitingIds((prev) => { const n = new Set(prev); n.delete(task.id); return n; });
      }, 320);
    }
  }, []);

  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav(handleToggle);

  const focusedTask = tasks.find((t) => t.id === focusedId) ?? null;

  const handleEditSave = useCallback(
    (patch: EditPatch) => {
      if (!focusedId) return;
      void db.tasks.update(focusedId, {
        ...patch,
        updatedAt: new Date(),
        synced: false,
        ...(patch.workingDate !== undefined
          ? { status: patch.workingDate !== null ? 'todo' : 'inbox' }
          : {}),
      });
      setEditField(null);
    },
    [focusedId]
  );

  // Clear selection and palette when focused task leaves the list
  useEffect(() => {
    if (focusedId !== null && !tasks.find((t) => t.id === focusedId)) {
      setFocusedId(null);
      setEditField(null);
    }
  }, [tasks, focusedId, setFocusedId]);

  // Clear palette when task is deselected
  useEffect(() => {
    if (focusedId === null) setEditField(null);
  }, [focusedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (focusedId !== null && editField === null) {
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setEditField('dueDate'); return; }
        if (e.key === 'w' || e.key === 'W') { e.preventDefault(); setEditField('workingDate'); return; }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); setEditField('project'); return; }
        if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setEditField('title'); return; }
      }
      handleKeyDown(e, tasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tasks, handleKeyDown, focusedId, editField]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Inbox</h2>
          {tasks.length > 0 && (
            <span className="font-mono text-[10px] text-accent tabular-nums">{tasks.length}</span>
          )}
        </div>
        <p className="text-muted text-[11px]">
          Triage — assign a date or project, then move to Today.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <TaskList
          tasks={tasks}
          focusedId={focusedId}
          onFocus={setFocusedId}
          onToggle={handleToggle}
          exitingIds={exitingIds}
        />
      </div>

      {editField !== null && focusedTask !== null ? (
        <CommandPalette
          task={focusedTask}
          defaultField={editField}
          projects={projects}
          onSave={handleEditSave}
          onCancel={() => setEditField(null)}
        />
      ) : (
        <HintBar taskFocused={focusedId !== null} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npm run test --workspace=web
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/views/InboxView.tsx
git commit -m "feat(web): task edit palette wired into InboxView"
```

---

## Task 4: Wire TodayView and ProjectsView

**Files:**
- Modify: `apps/web/src/views/TodayView.tsx`
- Modify: `apps/web/src/views/ProjectsView.tsx`

- [ ] **Step 1: Rewrite TodayView**

Replace the full contents of `apps/web/src/views/TodayView.tsx`:

```tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTodayTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import TaskList from '../components/TaskList';
import HintBar from '../components/layout/HintBar';
import CommandPalette, { type EditField, type EditPatch } from '../components/CommandPalette';
import { db } from '../lib/db';
import type { Task, ProjectWithSpace } from '@sift/shared';

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function TodayView() {
  const tasks = useTodayTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());
  const [editField, setEditField] = useState<EditField | null>(null);

  const { spacesWithProjects } = useSpacesProjects();
  const projects = useMemo<ProjectWithSpace[]>(
    () => spacesWithProjects.flatMap(({ space, projects: ps }) => ps.map((p) => ({ ...p, space }))),
    [spacesWithProjects]
  );

  const handleToggle = useCallback((task: Task) => {
    if (task.status === 'done') {
      void db.tasks.update(task.id, { status: 'todo', completedAt: null, updatedAt: new Date(), synced: false });
    } else {
      setExitingIds((prev) => new Set([...prev, task.id]));
      setTimeout(() => {
        void db.tasks.update(task.id, { status: 'done', completedAt: new Date(), updatedAt: new Date(), synced: false });
        setExitingIds((prev) => { const n = new Set(prev); n.delete(task.id); return n; });
      }, 320);
    }
  }, []);

  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav(handleToggle);

  const focusedTask = tasks.find((t) => t.id === focusedId) ?? null;

  const handleEditSave = useCallback(
    (patch: EditPatch) => {
      if (!focusedId) return;
      void db.tasks.update(focusedId, {
        ...patch,
        updatedAt: new Date(),
        synced: false,
        ...(patch.workingDate !== undefined
          ? { status: patch.workingDate !== null ? 'todo' : 'inbox' }
          : {}),
      });
      setEditField(null);
    },
    [focusedId]
  );

  useEffect(() => {
    if (focusedId !== null && !tasks.find((t) => t.id === focusedId)) {
      setFocusedId(null);
      setEditField(null);
    }
  }, [tasks, focusedId, setFocusedId]);

  useEffect(() => {
    if (focusedId === null) setEditField(null);
  }, [focusedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (focusedId !== null && editField === null) {
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setEditField('dueDate'); return; }
        if (e.key === 'w' || e.key === 'W') { e.preventDefault(); setEditField('workingDate'); return; }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); setEditField('project'); return; }
        if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setEditField('title'); return; }
      }
      handleKeyDown(e, tasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tasks, handleKeyDown, focusedId, editField]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Today</h2>
          {tasks.length > 0 && (
            <span className="font-mono text-[10px] text-accent tabular-nums">{tasks.length}</span>
          )}
        </div>
        <p className="font-mono text-[11px] text-muted">{todayLabel()}</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <TaskList
          tasks={tasks}
          focusedId={focusedId}
          onFocus={setFocusedId}
          onToggle={handleToggle}
          exitingIds={exitingIds}
        />
      </div>

      {editField !== null && focusedTask !== null ? (
        <CommandPalette
          task={focusedTask}
          defaultField={editField}
          projects={projects}
          onSave={handleEditSave}
          onCancel={() => setEditField(null)}
        />
      ) : (
        <HintBar taskFocused={focusedId !== null} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite ProjectsView**

Replace the full contents of `apps/web/src/views/ProjectsView.tsx`:

```tsx
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useProjectTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import TaskRow from '../components/TaskRow';
import HintBar from '../components/layout/HintBar';
import CommandPalette, { type EditField, type EditPatch } from '../components/CommandPalette';
import { db } from '../lib/db';
import type { Task, ProjectWithSpace } from '@sift/shared';

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

export default function ProjectsView() {
  const groups = useProjectTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());
  const [editField, setEditField] = useState<EditField | null>(null);

  const { spacesWithProjects } = useSpacesProjects();
  const projects = useMemo<ProjectWithSpace[]>(
    () => spacesWithProjects.flatMap(({ space, projects: ps }) => ps.map((p) => ({ ...p, space }))),
    [spacesWithProjects]
  );

  const handleToggle = useCallback((task: Task) => {
    const now = new Date();
    if (task.status === 'done') {
      void db.tasks.update(task.id, { status: task.workingDate ? 'todo' : 'inbox', completedAt: null, updatedAt: now, synced: false });
    } else {
      setExitingIds((prev) => new Set([...prev, task.id]));
      setTimeout(() => {
        void db.tasks.update(task.id, { status: 'done', completedAt: now, updatedAt: now, synced: false });
        setExitingIds((prev) => { const n = new Set(prev); n.delete(task.id); return n; });
      }, 320);
    }
  }, []);

  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav(handleToggle);

  const allTasks: Task[] = groups.flatMap(({ projects: ps }) =>
    ps.flatMap(({ tasks }) => tasks.filter((t) => t.status !== 'done' && t.status !== 'archived'))
  );

  const focusedTask = allTasks.find((t) => t.id === focusedId) ?? null;

  const handleEditSave = useCallback(
    (patch: EditPatch) => {
      if (!focusedId) return;
      void db.tasks.update(focusedId, {
        ...patch,
        updatedAt: new Date(),
        synced: false,
        ...(patch.workingDate !== undefined
          ? { status: patch.workingDate !== null ? 'todo' : 'inbox' }
          : {}),
      });
      setEditField(null);
    },
    [focusedId]
  );

  useEffect(() => {
    if (focusedId !== null && !allTasks.find((t) => t.id === focusedId)) {
      setFocusedId(null);
      setEditField(null);
    }
  }, [allTasks, focusedId, setFocusedId]);

  useEffect(() => {
    if (focusedId === null) setEditField(null);
  }, [focusedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (focusedId !== null && editField === null) {
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setEditField('dueDate'); return; }
        if (e.key === 'w' || e.key === 'W') { e.preventDefault(); setEditField('workingDate'); return; }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); setEditField('project'); return; }
        if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setEditField('title'); return; }
      }
      handleKeyDown(e, allTasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allTasks, handleKeyDown, focusedId, editField]);

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
              return (
                <div key={project.id} className="mb-4">
                  <div className="px-4 py-2 border-b border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[11px] text-text">{project.name}</span>
                    </div>
                    <ProgressBar done={done} total={tasks.length} />
                  </div>
                  {activeTasks.length === 0 ? (
                    <p className="font-mono text-[10px] text-dim px-4 py-3 uppercase tracking-[0.1em]">All done.</p>
                  ) : (
                    activeTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        project={project}
                        space={space}
                        isFocused={focusedId === task.id}
                        onFocus={() => setFocusedId(task.id)}
                        onToggle={() => handleToggle(task)}
                        exiting={exitingIds.has(task.id)}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-muted text-sm px-4 py-8 text-center">
            No projects yet. Create a task and assign it to a project.
          </p>
        )}
      </div>

      {editField !== null && focusedTask !== null ? (
        <CommandPalette
          task={focusedTask}
          defaultField={editField}
          projects={projects}
          onSave={handleEditSave}
          onCancel={() => setEditField(null)}
        />
      ) : (
        <HintBar taskFocused={focusedId !== null} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
npm run test --workspace=web
```

Expected: all tests pass

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc -p apps/web/tsconfig.json --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/views/TodayView.tsx \
        apps/web/src/views/ProjectsView.tsx
git commit -m "feat(web): task edit palette wired into TodayView and ProjectsView"
```

---

## Task 5: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the keyboard interaction model section**

In `CLAUDE.md`, update the Keyboard Interaction Model section to add the new shortcuts:

```markdown
## Keyboard Interaction Model

- **Cmd+K** — opens `CommandPalette` (task creation)
- **↑ / ↓ / j / k** — navigate tasks; reaching the end deselects (focusedId → null)
- **← / →** — switch views (handled in `AppLayout`, always active when not in an input)
- **Enter** — toggle focused task done/undone
- **Backspace / Delete** — archive focused task
- **Escape** — close edit palette if open, else deselect focused task
- **D / W / P / E** — when a task is focused, open `CommandPalette` for due date / working date / project / title

`HintBar` renders two states: default (no task focused) and task-focused (shows D/W/P/E shortcuts with orange accent). It lives at the bottom of each view. When D/W/P/E is pressed, `CommandPalette` opens as an overlay (same as ⌘K) pre-populated with the task and pre-focused on the relevant chip.

Each view registers its own `window.keydown` listener that skips events when `e.target` is an INPUT or TEXTAREA. `AppLayout` owns the palette and view-switching listeners. When a focused task disappears from the list (marked done, archived), the view's `useEffect` clears `focusedId` and `editField`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with task edit palette keyboard shortcuts"
```
