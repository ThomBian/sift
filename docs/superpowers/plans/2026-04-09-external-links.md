# External Links for Tasks and Projects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to attach a single URL to any Task or Project, editable via an `@u` chip and openable with `Cmd+O`.

**Architecture:** Rename `Task.sourceUrl` → `Task.url` and add `Project.url` via a Dexie v5 migration. Each view renders `TaskEditPalette` conditionally when `urlEditTask` is set. Project URL editing goes through the existing `sift:edit-project` event pipeline into `ProjectEditPalette`.

**Tech Stack:** Dexie.js (IndexedDB), React, TypeScript, Vitest + Testing Library

---

## File Map

| File | Change |
|------|--------|
| `packages/shared/src/types.ts` | Rename `sourceUrl?` → `url: string \| null` on Task; add `url` to Project |
| `packages/shared/src/db.ts` | Add Dexie v5 migration |
| `apps/web/src/services/SyncService.ts` | Update task/project serializers |
| `apps/web/src/components/TaskRow.tsx` | Swap `sourceUrl` → `url`, rename testid |
| `apps/web/src/__tests__/TaskRow.test.tsx` | Update baseTask + url tests |
| `apps/web/src/components/TaskEditPalette.tsx` | Add `'url'` to EditField/EditPatch + `@u` chip |
| `apps/web/src/__tests__/TaskEditPalette.test.tsx` | Update baseTask + add @u chip tests |
| `apps/web/src/components/CommandPalette.tsx` | Add `url: null` to createTask |
| `apps/web/src/views/InboxView.tsx` | U hotkey, Cmd+O, render TaskEditPalette |
| `apps/web/src/views/TodayView.tsx` | U hotkey, Cmd+O, render TaskEditPalette |
| `apps/web/src/views/ProjectsView.tsx` | U/Cmd+O for tasks + projects; link icon on project row |
| `apps/web/src/components/ProjectEditPalette.tsx` | Add `@u` chip |
| `apps/web/src/components/layout/AppLayout.tsx` | Extend `sift:edit-project` event type to include `'url'` |
| `apps/web/src/components/layout/HintBar.tsx` | Add U and ⌘O to task and project hints |
| `apps/web/src/components/layout/Sidebar.tsx` | Link icon on project rows |

---

## Task 1: Data Model — Rename Task.sourceUrl → url, add Project.url

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/db.ts`

- [ ] **Step 1: Update types.ts**

In `packages/shared/src/types.ts`, replace `sourceUrl?: string;` with `url: string | null;` on Task, and add `url: string | null;` to Project:

```typescript
export interface Project {
  id: string;
  name: string;
  emoji: string | null;
  spaceId: string;
  dueDate: Date | null;
  archived: boolean;
  url: string | null;   // ← add this line
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  status: TaskStatus;
  workingDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  url: string | null;   // ← was: sourceUrl?: string;
  synced: boolean;
}
```

- [ ] **Step 2: Add Dexie v5 migration to db.ts**

Append after the `version(4)` block in `packages/shared/src/db.ts`:

```typescript
this.version(5).stores({
  tasks:    'id, projectId, status, workingDate, dueDate, updatedAt, synced',
  projects: 'id, spaceId, dueDate, archived, updatedAt, synced',
}).upgrade(tx => {
  return Promise.all([
    tx.table('tasks').toCollection().modify((task: any) => {
      task.url = task.sourceUrl ?? null;
      delete task.sourceUrl;
    }),
    tx.table('projects').toCollection().modify((project: any) => {
      project.url = null;
    }),
  ]);
});
```

- [ ] **Step 3: Build shared package**

```bash
npm run build --workspace=@sift/shared
```

Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/db.ts
git commit -m "feat: rename Task.sourceUrl→url, add Project.url with db migration v5"
```

---

## Task 2: SyncService — Update Serializers

**Files:**
- Modify: `apps/web/src/services/SyncService.ts`

- [ ] **Step 1: Update taskToRow and rowToTask**

In `apps/web/src/services/SyncService.ts`, replace the `taskToRow` function:

```typescript
function taskToRow(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    project_id: task.projectId,
    status: task.status,
    working_date: task.workingDate?.toISOString() ?? null,
    due_date: task.dueDate?.toISOString() ?? null,
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
    completed_at: task.completedAt?.toISOString() ?? null,
    url: task.url ?? null,
    synced: true,
  };
}
```

Replace the `rowToTask` function:

```typescript
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    projectId: row.project_id as string,
    status: row.status as Task['status'],
    workingDate: row.working_date ? new Date(row.working_date as string) : null,
    dueDate: row.due_date ? new Date(row.due_date as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    url: (row.url as string | null | undefined) ?? null,
    synced: true,
  };
}
```

- [ ] **Step 2: Update projectToRow and rowToProject**

Replace the `projectToRow` function:

```typescript
function projectToRow(project: Project, userId: string) {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    emoji: project.emoji,
    space_id: project.spaceId,
    archived: project.archived,
    url: project.url,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
    synced: true,
  };
}
```

Replace the `rowToProject` function:

```typescript
function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    emoji: (row.emoji as string | null | undefined) ?? null,
    spaceId: row.space_id as string,
    dueDate: row.due_date ? new Date(row.due_date as string) : null,
    archived: (row.archived as boolean | undefined) ?? false,
    url: (row.url as string | null | undefined) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    synced: true,
  };
}
```

- [ ] **Step 3: Fix CommandPalette createTask (url now required)**

In `apps/web/src/components/CommandPalette.tsx`, add `url: null` to the `createTask` db call:

```typescript
await db.tasks.add({
  id: nanoid(),
  title: partial.title,
  projectId: partial.projectId ?? defaultProjectId,
  status: partial.workingDate ? "todo" : "inbox",
  workingDate: partial.workingDate ?? null,
  dueDate: partial.dueDate ?? null,
  url: null,
  createdAt: now,
  updatedAt: now,
  completedAt: null,
  synced: false,
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/services/SyncService.ts apps/web/src/components/CommandPalette.tsx
git commit -m "feat: update sync serializers for url rename and project url"
```

---

## Task 3: TaskRow — Swap sourceUrl → url

**Files:**
- Modify: `apps/web/src/__tests__/TaskRow.test.tsx`
- Modify: `apps/web/src/components/TaskRow.tsx`

- [ ] **Step 1: Update tests (write failing tests first)**

In `apps/web/src/__tests__/TaskRow.test.tsx`:

1. Add `url: null` to `baseTask` (url is now required):
```typescript
const baseTask: Task = {
  id: 'task-1',
  title: 'Write unit tests',
  projectId: 'project-1',
  status: 'inbox',
  workingDate: null,
  dueDate: null,
  url: null,          // ← add
  createdAt: now,
  updatedAt: now,
  completedAt: null,
  synced: true,
};
```

2. Update the link icon test (rename field and testid):
```typescript
it('shows a link icon when task has url', () => {
  const taskWithUrl: Task = { ...baseTask, url: 'https://example.com' };

  render(
    <TaskRow
      task={taskWithUrl}
      project={project}
      space={space}
      isFocused={false}
      onFocus={vi.fn()}
    />
  );

  expect(screen.getByTestId('url-icon')).toBeInTheDocument();
});

it('does not show link icon when task has no url', () => {
  render(
    <TaskRow
      task={baseTask}
      project={project}
      space={space}
      isFocused={false}
      onFocus={vi.fn()}
    />
  );

  expect(screen.queryByTestId('url-icon')).toBeNull();
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run apps/web/src/__tests__/TaskRow.test.tsx
```

Expected: FAIL — `sourceUrl` references and `source-url-icon` testid not found.

- [ ] **Step 3: Update TaskRow.tsx**

In `apps/web/src/components/TaskRow.tsx`, replace the `task.sourceUrl` block:

```typescript
{task.url && (
  <a
    href={task.url}
    target="_blank"
    rel="noopener noreferrer"
    data-testid="url-icon"
    onClick={(e) => e.stopPropagation()}
    className="shrink-0 transition-colors text-muted hover:text-accent"
    title={task.url}
    aria-label="Visit link"
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M7 1h4m0 0v4m0-4L5 7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </a>
)}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run apps/web/src/__tests__/TaskRow.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/TaskRow.tsx apps/web/src/__tests__/TaskRow.test.tsx
git commit -m "feat: swap Task.sourceUrl→url in TaskRow and tests"
```

---

## Task 4: TaskEditPalette — Add @u Chip

**Files:**
- Modify: `apps/web/src/__tests__/TaskEditPalette.test.tsx`
- Modify: `apps/web/src/components/TaskEditPalette.tsx`

- [ ] **Step 1: Write failing tests**

In `apps/web/src/__tests__/TaskEditPalette.test.tsx`:

1. Add `url: null` to `baseTask`:
```typescript
const baseTask: Task = {
  id: 'task-1',
  title: 'Fix the bug',
  projectId: 'p1',
  status: 'inbox',
  workingDate: null,
  dueDate: null,
  url: null,        // ← add
  createdAt: now,
  updatedAt: now,
  completedAt: null,
  synced: true,
};
```

2. Add two new tests at the end of the `describe` block:
```typescript
it('renders the @u chip', () => {
  render(
    <TaskEditPalette
      task={baseTask}
      defaultField="title"
      projects={projects}
      onSave={vi.fn()}
      onCancel={vi.fn()}
    />
  );
  expect(screen.getByRole('button', { name: /@u/i })).toBeInTheDocument();
});

it('calls onSave with url when Enter is pressed in url mode', () => {
  const onSave = vi.fn();
  render(
    <TaskEditPalette
      task={baseTask}
      defaultField="url"
      projects={projects}
      onSave={onSave}
      onCancel={vi.fn()}
    />
  );
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'https://example.com' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'https://example.com' })
  );
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run apps/web/src/__tests__/TaskEditPalette.test.tsx
```

Expected: FAIL — `@u` chip not found, url field not in EditField.

- [ ] **Step 3: Update TaskEditPalette.tsx**

Replace the full file content of `apps/web/src/components/TaskEditPalette.tsx`:

```typescript
import { useState, useEffect, useRef, useMemo } from 'react';
import type { Task, ProjectWithSpace } from '@sift/shared';

export type EditField = 'title' | 'dueDate' | 'workingDate' | 'project' | 'url';
export type EditPatch = Partial<Pick<Task, 'title' | 'dueDate' | 'workingDate' | 'projectId' | 'url'>>;

interface TaskEditPaletteProps {
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

function truncateUrl(url: string): string {
  const bare = url.replace(/^https?:\/\//, '');
  return bare.length > 18 ? bare.slice(0, 18) + '…' : bare;
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

export default function TaskEditPalette({
  task,
  defaultField,
  projects,
  onSave,
  onCancel,
}: TaskEditPaletteProps) {
  const [title, setTitle] = useState(task.title);
  const [projectId, setProjectId] = useState(task.projectId);
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate);
  const [workingDate, setWorkingDate] = useState<Date | null>(task.workingDate);
  const [url, setUrl] = useState<string | null>(task.url ?? null);
  const [activeChip, setActiveChip] = useState<EditField>(defaultField);
  const [search, setSearch] = useState('');
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const dateOptions = getDateOptions();

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [projects, search]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // url chip acts like title: direct value input, no dropdown
  const inChipMode = activeChip !== 'title' && activeChip !== 'url';
  const showDropdown = activeChip === 'dueDate' || activeChip === 'workingDate' || activeChip === 'project';

  function buildPatch(): EditPatch {
    return { title, projectId, dueDate, workingDate, url };
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
    if (e.key === 'Tab') {
      e.preventDefault();
      const chipOrder = ['project', 'dueDate', 'workingDate', 'url'] as const;
      const isFilled = (chip: (typeof chipOrder)[number]) => {
        if (chip === 'dueDate') return dueDate !== null;
        if (chip === 'workingDate') return workingDate !== null;
        if (chip === 'url') return url !== null;
        return false;
      };
      const currentIndex = chipOrder.indexOf(activeChip as (typeof chipOrder)[number]);
      const startIndex = currentIndex === -1 ? 0 : currentIndex;
      let next: (typeof chipOrder)[number] | null = null;
      for (let i = 1; i <= chipOrder.length; i++) {
        const candidate = chipOrder[(startIndex + i) % chipOrder.length];
        if (!isFilled(candidate)) { next = candidate; break; }
      }
      handleChipClick(next ?? chipOrder[(startIndex + 1) % chipOrder.length]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    // URL mode: Enter saves immediately
    if (e.key === 'Enter' && activeChip === 'url') {
      e.preventDefault();
      onSave({ ...buildPatch(), url });
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
      setDropdownIndex((i) => Math.min(i + 1, Math.max(itemCount - 1, 0)));
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
  const inputValue = activeChip === 'url' ? (url ?? '') : inChipMode ? search : title;
  const inputPlaceholder = activeChip === 'url'
    ? 'Add a link…'
    : inChipMode
      ? (activeChip === 'project' ? 'Filter projects…' : 'Pick a date…')
      : '';

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (activeChip === 'url') {
      setUrl(e.target.value || null);
    } else if (inChipMode) {
      setSearch(e.target.value);
      setDropdownIndex(0);
    } else {
      setTitle(e.target.value);
    }
  }

  const chipBase =
    'inline-flex items-center gap-1 px-2 py-0.5 border-[0.5px] text-[11px] font-mono cursor-pointer transition-all duration-150';
  const chipIdle = 'border-border-2 text-muted hover:border-accent hover:text-accent';
  const chipActive = 'border-accent text-accent bg-accent/5';

  return (
    <div className="border-t border-[0.5px] border-border bg-surface shrink-0">
      {/* Context row */}
      <div className="flex items-center px-4 py-1 border-b border-[0.5px] border-border bg-surface-2">
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
          placeholder={inputPlaceholder}
          className="flex-1 bg-transparent border-none outline-none text-sm text-text font-sans min-w-0"
        />
        <div className="w-[0.5px] min-w-[0.5px] h-4 bg-border shrink-0" />
        <button
          type="button"
          aria-label="@p project"
          onClick={() => handleChipClick('project')}
          className={`${chipBase} ${activeChip === 'project' ? chipActive : chipIdle}`}
        >
          {activeChip === 'project' ? (
            '@p'
          ) : currentProject ? (
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
          aria-label="@d due date"
          onClick={() => handleChipClick('dueDate')}
          className={`${chipBase} ${activeChip === 'dueDate' ? chipActive : chipIdle}`}
        >
          @d {dueDate ? formatDate(dueDate) : '—'}
        </button>
        <button
          type="button"
          aria-label="@w working date"
          onClick={() => handleChipClick('workingDate')}
          className={`${chipBase} ${activeChip === 'workingDate' ? chipActive : chipIdle}`}
        >
          @w {workingDate ? formatDate(workingDate) : '—'}
        </button>
        <button
          type="button"
          aria-label="@u url"
          onClick={() => handleChipClick('url')}
          className={`${chipBase} ${activeChip === 'url' ? chipActive : chipIdle}`}
        >
          @u {url ? truncateUrl(url) : '—'}
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="border-t border-[0.5px] border-border">
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

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run apps/web/src/__tests__/TaskEditPalette.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/TaskEditPalette.tsx apps/web/src/__tests__/TaskEditPalette.test.tsx
git commit -m "feat: add @u chip to TaskEditPalette"
```

---

## Task 5: InboxView + TodayView — U Hotkey, Cmd+O, TaskEditPalette

**Files:**
- Modify: `apps/web/src/views/InboxView.tsx`
- Modify: `apps/web/src/views/TodayView.tsx`

### InboxView

- [ ] **Step 1: Update InboxView.tsx**

Replace the full file content of `apps/web/src/views/InboxView.tsx`:

```typescript
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useInboxTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import TaskList from '../components/TaskList';
import TaskEditPalette, { type EditPatch } from '../components/TaskEditPalette';
import HintBar from '../components/layout/HintBar';
import { db } from '../lib/db';
import type { Task, ProjectWithSpace } from '@sift/shared';

function dispatchEditTask(task: Task, chip: 'dueDate' | 'workingDate' | 'project' | null) {
  window.dispatchEvent(new CustomEvent('sift:edit-task', { detail: { task, chip } }));
}

export default function InboxView() {
  const tasks = useInboxTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());
  const [urlEditTask, setUrlEditTask] = useState<Task | null>(null);
  const { spacesWithProjects } = useSpacesProjects();

  const allProjects = useMemo<ProjectWithSpace[]>(
    () => spacesWithProjects.flatMap(({ space, projects }) =>
      projects.map(p => ({ ...p, space }))
    ),
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
      }, 160);
    }
  }, []);

  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav(handleToggle);

  useEffect(() => {
    if (focusedId !== null && !tasks.find((t) => t.id === focusedId)) {
      setFocusedId(null);
    }
  }, [tasks, focusedId, setFocusedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const focused = focusedId !== null ? tasks.find((t) => t.id === focusedId) ?? null : null;
      if (focused) {
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); dispatchEditTask(focused, 'dueDate'); return; }
        if (e.key === 'w' || e.key === 'W') { e.preventDefault(); dispatchEditTask(focused, 'workingDate'); return; }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); dispatchEditTask(focused, 'project'); return; }
        if (e.key === 'e' || e.key === 'E') { e.preventDefault(); dispatchEditTask(focused, null); return; }
        if (e.key === 'u' || e.key === 'U') { e.preventDefault(); setUrlEditTask(focused); return; }
        if (e.metaKey && e.key === 'o') {
          e.preventDefault();
          if (focused.url) window.open(focused.url, '_blank', 'noopener,noreferrer');
          return;
        }
      }
      handleKeyDown(e, tasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tasks, handleKeyDown, focusedId]);

  async function handleUrlSave(patch: EditPatch) {
    if (!urlEditTask) return;
    await db.tasks.update(urlEditTask.id, { url: patch.url ?? null, updatedAt: new Date(), synced: false });
    setUrlEditTask(null);
  }

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
          emptyState={
            <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-16 text-center">
              <p className="font-mono text-[11px] text-muted uppercase tracking-[0.15em]">Inbox clear.</p>
              <p className="font-mono text-[10px] text-dim max-w-[260px] leading-relaxed">
                Press ⌘K to capture a task, then assign a date to move it to Today.
              </p>
            </div>
          }
        />
      </div>

      {urlEditTask && (
        <TaskEditPalette
          task={urlEditTask}
          defaultField="url"
          projects={allProjects}
          onSave={handleUrlSave}
          onCancel={() => setUrlEditTask(null)}
        />
      )}
      <HintBar focusState={focusedId !== null ? 'task' : 'none'} />
    </div>
  );
}
```

### TodayView

- [ ] **Step 2: Update TodayView.tsx**

Read the full current TodayView.tsx (to capture the rest of the component after the cut-off), then replace its content with the same pattern. The changes are:
1. Import `useMemo`, `useSpacesProjects`, `TaskEditPalette`, `type EditPatch`, `type ProjectWithSpace`
2. Add `urlEditTask` state
3. Compute `allProjects` from `spacesWithProjects`
4. Add `U` and `Cmd+O` handlers in `onKey`
5. Add `handleUrlSave` function
6. Render `<TaskEditPalette>` above `<HintBar>` when `urlEditTask` is set

Apply the same additions from InboxView. The `todayLabel()` helper and task completion logic (uses `'todo'` status instead of `'inbox'`) must be preserved exactly.

- [ ] **Step 3: Run all tests**

```bash
npm run test --workspace=web
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/views/InboxView.tsx apps/web/src/views/TodayView.tsx
git commit -m "feat: U hotkey and Cmd+O for task url in Inbox and Today views"
```

---

## Task 6: ProjectEditPalette — Add @u Chip + Update AppLayout Event Types

**Files:**
- Modify: `apps/web/src/components/ProjectEditPalette.tsx`
- Modify: `apps/web/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Update ProjectEditPalette.tsx**

Make the following changes to `apps/web/src/components/ProjectEditPalette.tsx`:

**a) Extend ActiveChip and TAB_ORDER:**
```typescript
type ActiveChip = 'name' | 'emoji' | 'dueDate' | 'url';
const TAB_ORDER: ActiveChip[] = ['name', 'emoji', 'dueDate', 'url'];
```

**b) Update initialField prop type:**
```typescript
initialField?: 'name' | 'emoji' | 'dueDate' | 'url';
```

**c) Add url state (after dueDate state):**
```typescript
const [url, setUrl] = useState<string | null>(null);
```

**d) Update the useEffect that resets state on open — add url reset:**
```typescript
setUrl(project?.url ?? null);
```
(alongside the existing setName/setEmoji/setDueDate/setActiveChip/setQuery calls)

**e) Update handleConfirm to include url in both update and add paths:**
```typescript
// update path:
await db.projects.update(project.id, {
  name: trimmed,
  emoji,
  dueDate,
  url,
  updatedAt: now,
  synced: false,
});

// add path:
await db.projects.add({
  id: nanoid(),
  name: trimmed,
  emoji: emoji ?? getRandomEmoji(),
  spaceId: spaceId!,
  dueDate,
  url: null,
  archived: false,
  createdAt: now,
  updatedAt: now,
  synced: false,
});
```

**f) Update handleClear to handle url:**
```typescript
function handleClear() {
  if (activeChip === 'emoji') {
    setEmoji(null);
  } else if (activeChip === 'url') {
    setUrl(null);
  } else {
    setDueDate(null);
  }
  setActiveChip('name');
  setQuery('');
  requestAnimationFrame(() => inputRef.current?.focus());
}
```

**g) Update handleKeyDown Enter condition:**
```typescript
if (e.key === 'Enter' && (activeChip === 'name' || activeChip === 'url')) {
  e.preventDefault();
  void handleConfirm();
}
```

**h) Update chipClass to handle url:**
```typescript
function chipClass(chip: ActiveChip, activeChip: ActiveChip, isSet: boolean): string {
  const isActive = activeChip === chip;
  if (chip === 'emoji') {
    if (isActive) return `${CHIP_BASE} border-accent text-accent bg-accent/5`;
    if (isSet)    return `${CHIP_BASE} border-accent/30 text-accent bg-accent/5`;
    return              `${CHIP_BASE} border-border text-muted bg-surface`;
  }
  if (chip === 'url') {
    if (isActive) return `${CHIP_BASE} border-accent text-accent bg-accent/5`;
    if (isSet)    return `${CHIP_BASE} border-accent/30 text-accent bg-accent/5`;
    return              `${CHIP_BASE} border-border text-muted bg-surface`;
  }
  // dueDate
  if (isActive) return `${CHIP_BASE} border-red text-red bg-red/5`;
  if (isSet)    return `${CHIP_BASE} border-red/30 text-red bg-red/5`;
  return              `${CHIP_BASE} border-border text-muted bg-surface`;
}
```

**i) Update inputValue and inputPlaceholder computation:**
```typescript
const inputValue = activeChip === 'name' ? name : activeChip === 'url' ? (url ?? '') : query;
const inputPlaceholder = activeChip === 'emoji'
  ? 'Search emojis…'
  : activeChip === 'dueDate'
    ? 'Pick a date…'
    : activeChip === 'url'
      ? 'Add a link…'
      : 'Project name…';
```

**j) Update handleInputChange to handle url mode and @u trigger:**
```typescript
function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
  if (activeChip === 'url') {
    setUrl(e.target.value || null);
    return;
  }
  if (activeChip !== 'name') {
    setQuery(e.target.value);
    return;
  }
  const val = e.target.value;
  if (val.endsWith('@c')) {
    setName(val.slice(0, -2));
    handleChipClick('emoji');
  } else if (val.endsWith('@d')) {
    setName(val.slice(0, -2));
    handleChipClick('dueDate');
  } else if (val.endsWith('@u')) {
    setName(val.slice(0, -2));
    handleChipClick('url');
  } else {
    setName(val);
  }
}
```

**k) Add @u chip button after the dueDate chip button:**
```typescript
<button
  type="button"
  onClick={() => handleChipClick('url')}
  className={chipClass('url', activeChip, url !== null)}
>
  {url ? (
    <>
      <span className="text-[10px] opacity-55">@u</span>&nbsp;
      {url.replace(/^https?:\/\//, '').slice(0, 15)}
      {url.replace(/^https?:\/\//, '').length > 15 ? '…' : ''}
    </>
  ) : (
    <><span className="text-[10px] opacity-55">@u</span>&nbsp;link</>
  )}
</button>
```

**l) Add Clear button for url mode (after the dueDate Dropdown section):**
```typescript
{activeChip === 'url' && url && (
  <button
    type="button"
    onClick={handleClear}
    className="flex items-center w-full px-4 py-1.5 border-t border-[0.5px] border-border bg-transparent text-muted font-mono text-[12px] cursor-pointer hover:text-text transition-colors duration-150"
  >
    Clear
  </button>
)}
```

- [ ] **Step 2: Update AppLayout.tsx event types**

In `apps/web/src/components/layout/AppLayout.tsx`, update `ProjectPaletteState` and the `onEditProject` handler:

```typescript
interface ProjectPaletteState {
  spaceId?: string;
  project?: Project;
  initialField?: 'name' | 'emoji' | 'dueDate' | 'url';
}
```

```typescript
function onEditProject(e: Event) {
  const { project, field } = (e as CustomEvent<{
    project: Project;
    field: 'name' | 'emoji' | 'dueDate' | 'url';
  }>).detail;
  setProjectPaletteState({ project, initialField: field });
  setProjectPaletteOpen(true);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ProjectEditPalette.tsx apps/web/src/components/layout/AppLayout.tsx
git commit -m "feat: add @u chip to ProjectEditPalette"
```

---

## Task 7: ProjectsView — U/Cmd+O for Tasks + Projects, Link Icon on Project Rows

**Files:**
- Modify: `apps/web/src/views/ProjectsView.tsx`

- [ ] **Step 1: Add urlEditTask state and allProjects**

At the top of `ProjectsView`, add imports and state:

```typescript
import TaskEditPalette, { type EditPatch } from '../components/TaskEditPalette';
import type { ProjectWithSpace } from '@sift/shared';
// (add to existing imports, useMemo is already imported)
```

Inside the component, after the existing state declarations:
```typescript
const [urlEditTask, setUrlEditTask] = useState<Task | null>(null);

const allProjects = useMemo<ProjectWithSpace[]>(
  () => groups.flatMap(({ space, projects: ps }) =>
    ps.map(({ project }) => ({ ...project, space }))
  ),
  [groups]
);
```

- [ ] **Step 2: Add U and Cmd+O handlers in the keydown listener**

Inside the `onKey` handler in `ProjectsView`, in the `navMode === 'task'` branch, add after the `'E'` handler:

```typescript
if (focused) {
  // existing D/W/P/E...
  if (e.key === 'u' || e.key === 'U') {
    e.preventDefault();
    setUrlEditTask(focused);
    return;
  }
  if (e.metaKey && e.key === 'o') {
    e.preventDefault();
    if (focused.url) window.open(focused.url, '_blank', 'noopener,noreferrer');
    return;
  }
}
```

In the `navMode === 'project'` branch, add after the `'C'` handler (and before the `' '` handler):

```typescript
if (e.key === 'u' || e.key === 'U') {
  e.preventDefault();
  window.dispatchEvent(
    new CustomEvent('sift:edit-project', {
      detail: { project: focusedProject, field: 'url' },
    })
  );
  return;
}
if (e.metaKey && e.key === 'o') {
  e.preventDefault();
  if (focusedProject.url) window.open(focusedProject.url, '_blank', 'noopener,noreferrer');
  return;
}
```

- [ ] **Step 3: Add handleUrlSave and render TaskEditPalette**

After the `handleDeleteConfirm` callback, add:

```typescript
async function handleUrlSave(patch: EditPatch) {
  if (!urlEditTask) return;
  await db.tasks.update(urlEditTask.id, { url: patch.url ?? null, updatedAt: new Date(), synced: false });
  setUrlEditTask(null);
}
```

In the return JSX, add `<TaskEditPalette>` above `<HintBar>`:

```typescript
{urlEditTask && (
  <TaskEditPalette
    task={urlEditTask}
    defaultField="url"
    projects={allProjects}
    onSave={handleUrlSave}
    onCancel={() => setUrlEditTask(null)}
  />
)}
<HintBar focusState={focusState as 'none' | 'project' | 'task'} archiveHint={archiveHint} />
```

- [ ] **Step 4: Add link icon to project rows**

In the `renderProjectBlock` function, inside the header `<div>`, add a link icon after the project name span:

```typescript
<div className="flex items-center justify-between mb-1.5">
  <span
    className={`font-mono text-[11px] flex items-center gap-1.5 min-w-0 ${
      isFocusedProject ? 'text-accent' : 'text-text'
    }`}
  >
    {project.emoji ? (
      <span className="shrink-0 text-sm leading-none" aria-hidden="true">
        {project.emoji}
      </span>
    ) : null}
    <span className="truncate">{project.name}</span>
  </span>
  <div className="flex items-center gap-2 shrink-0">
    {project.url && (
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-dim hover:text-accent transition-colors"
        title={project.url}
        aria-label="Visit project link"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M7 1h4m0 0v4m0-4L5 7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    )}
    {project.dueDate && (
      <span className="font-mono text-[10px] text-muted">
        {project.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>
    )}
  </div>
</div>
```

- [ ] **Step 5: Run all tests**

```bash
npm run test --workspace=web
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/views/ProjectsView.tsx
git commit -m "feat: U/Cmd+O for projects and tasks in ProjectsView + link icon on project rows"
```

---

## Task 8: Sidebar — Link Icon on Project Rows

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update Sidebar.tsx project NavLink**

In `apps/web/src/components/layout/Sidebar.tsx`, replace the project `NavLink` inside the space `projects.map` block:

```typescript
{projects.map((project) => (
  <div key={project.id} className="flex items-center min-w-0">
    <NavLink
      to="/projects"
      onClick={() => onNavigate?.()}
      className="flex-1 flex items-center px-2 py-2.5 md:py-1 min-h-11 md:min-h-0 min-w-0 text-[11px] text-muted hover:text-text transition-colors truncate font-mono"
    >
      <span className="truncate">{project.name}</span>
    </NavLink>
    {project.url && (
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => { e.stopPropagation(); }}
        className="shrink-0 px-1 text-dim hover:text-accent transition-colors"
        aria-label={`Visit ${project.name} link`}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M7 1h4m0 0v4m0-4L5 7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    )}
  </div>
))}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/Sidebar.tsx
git commit -m "feat: show link icon on sidebar project rows when url is set"
```

---

## Task 9: HintBar — Add U and ⌘O Hints

**Files:**
- Modify: `apps/web/src/components/layout/HintBar.tsx`

- [ ] **Step 1: Update TASK_HINTS and buildProjectHints**

In `apps/web/src/components/layout/HintBar.tsx`, replace `TASK_HINTS`:

```typescript
const TASK_HINTS: Hint[] = [
  { keys: ['Enter'], label: 'Done', hot: true },
  { keys: ['D'], label: 'Due date', hot: true },
  { keys: ['W'], label: 'Today', hot: true },
  { keys: ['P'], label: 'Project', hot: true },
  { keys: ['E'], label: 'Edit', hot: true },
  { keys: ['U'], label: 'Link', hot: true },
  { keys: ['⌘O'], label: 'Open link', hot: true },
  { keys: ['⌫'], label: 'Archive' },
  { keys: ['Esc'], label: 'Back' },
];
```

Update `buildProjectHints` to add `U` and `⌘O` before the `X` entry:

```typescript
function buildProjectHints(archiveHint?: 'archive' | 'unarchive'): Hint[] {
  const base: Hint[] = [
    { keys: ['N'], label: 'New', hot: true },
    { keys: ['E'], label: 'Edit', hot: true },
    { keys: ['D'], label: 'Due date', hot: true },
    { keys: ['C'], label: 'Icon', hot: true },
    { keys: ['U'], label: 'Link', hot: true },
    { keys: ['⌘O'], label: 'Open link', hot: true },
    { keys: ['Space'], label: 'Open', hot: true },
  ];
  if (archiveHint) {
    base.push({ keys: ['A'], label: archiveHint, hot: true });
  }
  base.push({ keys: ['X'], label: 'delete', hot: true });
  base.push({ keys: ['Esc'], label: 'Deselect' });
  return base;
}
```

- [ ] **Step 2: Run all tests**

```bash
npm run test --workspace=web
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/HintBar.tsx
git commit -m "feat: add U and ⌘O hints to HintBar for task and project focus states"
```

---

## Self-Review Checklist (completed inline)

- [x] **Spec coverage:** All spec requirements have corresponding tasks: url on Task, url on Project, @u chip in TaskEditPalette, U hotkey for tasks, U hotkey for projects, Cmd+O for both, link icon on project rows (ProjectsView + Sidebar), HintBar updates
- [x] **No placeholders:** All code blocks are complete
- [x] **Type consistency:** `EditField` includes `'url'` in Task 4 step 3; `EditPatch` includes `url` throughout; `ProjectPaletteState.initialField` extended in Task 6 step 2; `handleUrlSave` receives `EditPatch` and writes `patch.url` everywhere
- [x] **db.projects.add** in ProjectEditPalette includes `url: null` (Task 6 step 1e)
- [x] **createTask** in CommandPalette includes `url: null` (Task 2 step 3)
- [x] **Sidebar** `project.url` is available because `useSpacesProjects` returns `Project[]` which includes `url` after the migration
