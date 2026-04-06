# Speedy Tasks — Plan 1: Monorepo Foundation & Shared Package

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Turborepo monorepo and build `packages/shared` — the TypeScript types, Dexie database, and SmartInput React component used by both the web app and Chrome extension.

**Architecture:** npm workspaces root with `apps/` and `packages/` directories. `packages/shared` builds as a Vite library. SmartInput uses CSS Modules (not Tailwind) so it renders correctly inside Chrome extension Shadow DOMs. The hook (`useSmartInput`) is tested independently from the component.

**Tech Stack:** Node 20+, npm workspaces, Turborepo 2, TypeScript 5, Vite 5, React 18, Dexie 4, dexie-react-hooks 4, nanoid 5, CSS Modules, Vitest 1, @testing-library/react 14, @testing-library/user-event 14, fake-indexeddb 5

---

## File Map

### Monorepo root
| File | Responsibility |
|------|----------------|
| `package.json` | Workspace root — workspaces, shared dev deps |
| `turbo.json` | Turborepo pipeline (build, test, dev) |
| `tsconfig.base.json` | Base TypeScript config extended by all packages |
| `.gitignore` | Node + Vite ignores |

### packages/shared
| File | Responsibility |
|------|----------------|
| `package.json` | Manifest, exports map, peer deps |
| `vite.config.ts` | Vite lib build + Vitest config |
| `tsconfig.json` | Extends base config |
| `src/types.ts` | Space, Project, Task TypeScript interfaces |
| `src/db.ts` | AppDatabase (Dexie) — tables, indexes, first-launch seed |
| `src/SmartInput/useSmartInput.ts` | Hook: chip focus, tab rotation, @x detection, value state |
| `src/SmartInput/Dropdown.tsx` | Project list or date quick-picks based on active chip |
| `src/SmartInput/Dropdown.module.css` | Dropdown scoped styles |
| `src/SmartInput/SmartInput.tsx` | Assembles hook + chips + dropdown; fires onTaskReady on ⌘+Enter |
| `src/SmartInput/SmartInput.module.css` | Input bar and chip scoped styles |
| `src/index.ts` | Public exports |
| `src/__tests__/setup.ts` | fake-indexeddb auto-import |
| `src/__tests__/db.test.ts` | AppDatabase seeding and CRUD |
| `src/__tests__/useSmartInput.test.ts` | Tab rotation, @x detection, value selection, save |
| `src/__tests__/SmartInput.test.tsx` | Component render, chip interaction, save callback |

---

## Task 1: Initialize monorepo root

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

- [ ] **Step 1: Create workspace package.json**

```json
{
  "name": "speedy-tasks",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.turbo/
*.local
.env
.env.*
!.env.example
.DS_Store
.superpowers/
```

- [ ] **Step 5: Create workspace directories**

```bash
mkdir -p apps/web apps/extension packages/shared
```

- [ ] **Step 6: Install root deps**

```bash
npm install
```

Expected: `node_modules/.bin/turbo` exists.

- [ ] **Step 7: Init git and commit**

```bash
git init
git add package.json turbo.json tsconfig.base.json .gitignore
git commit -m "chore: initialize Turborepo monorepo"
```

---

## Task 2: Bootstrap packages/shared

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/vite.config.ts`
- Create: `packages/shared/src/__tests__/setup.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@sift/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch",
    "test": "vitest run"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "dependencies": {
    "dexie": "^4.0.0",
    "dexie-react-hooks": "^1.1.7",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@types/react": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "fake-indexeddb": "^5.0.0",
    "jsdom": "^24.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/shared/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'dexie', 'dexie-react-hooks', 'nanoid'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/__tests__/setup.ts'],
  },
});
```

- [ ] **Step 4: Create test setup file**

```typescript
// packages/shared/src/__tests__/setup.ts
import 'fake-indexeddb/auto';
```

- [ ] **Step 5: Create src directories**

```bash
mkdir -p packages/shared/src/SmartInput packages/shared/src/__tests__
```

- [ ] **Step 6: Install deps**

```bash
cd packages/shared && npm install
```

- [ ] **Step 7: Commit**

```bash
cd ../..
git add packages/shared/
git commit -m "chore: bootstrap packages/shared"
```

---

## Task 3: Define TypeScript types

**Files:**
- Create: `packages/shared/src/types.ts`

- [ ] **Step 1: Write types**

```typescript
// packages/shared/src/types.ts

export interface Space {
  id: string;
  name: string;
  color: string;      // hex, e.g. "#5E6AD2"
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;    // false = pending push to Supabase
}

export interface Project {
  id: string;
  name: string;
  spaceId: string;    // FK → Space
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export type TaskStatus = 'inbox' | 'todo' | 'done' | 'archived';
// inbox = no workingDate assigned yet
// todo  = triaged (has workingDate)

export interface Task {
  id: string;
  title: string;
  projectId: string;          // FK → Project; space derived via project.spaceId
  status: TaskStatus;
  workingDate: Date | null;   // drives Today view (workingDate <= today)
  dueDate: Date | null;       // shows red when past + not done
  createdAt: Date;
  updatedAt: Date;            // last-write-wins sync key
  completedAt: Date | null;
  sourceUrl?: string;         // URL captured by extension
  synced: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat(shared): define Space, Project, Task types"
```

---

## Task 4: Write failing tests for AppDatabase

**Files:**
- Create: `packages/shared/src/__tests__/db.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/shared/src/__tests__/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AppDatabase } from '../db';

describe('AppDatabase', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    // fake-indexeddb gives a fresh store each time (via setup.ts)
    db = new AppDatabase(`test-${Math.random()}`);
    await db.open();
  });

  it('seeds a default Personal space on first open', async () => {
    const spaces = await db.spaces.toArray();
    expect(spaces).toHaveLength(1);
    expect(spaces[0].name).toBe('Personal');
    expect(spaces[0].color).toBe('#5E6AD2');
    expect(spaces[0].synced).toBe(false);
  });

  it('seeds a default General project under the Personal space', async () => {
    const spaces = await db.spaces.toArray();
    const projects = await db.projects.toArray();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('General');
    expect(projects[0].spaceId).toBe(spaces[0].id);
    expect(projects[0].synced).toBe(false);
  });

  it('does not re-seed when spaces already exist', async () => {
    const db2 = new AppDatabase(db.name);
    await db2.open();
    const spaces = await db2.spaces.toArray();
    expect(spaces).toHaveLength(1);
    await db2.close();
  });

  it('can add and retrieve a task', async () => {
    const [project] = await db.projects.toArray();
    const task: import('../types').Task = {
      id: 'task-1',
      title: 'Buy milk',
      projectId: project.id,
      status: 'inbox',
      workingDate: null,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      synced: false,
    };
    await db.tasks.add(task);
    const found = await db.tasks.get('task-1');
    expect(found?.title).toBe('Buy milk');
    expect(found?.projectId).toBe(project.id);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/shared && npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../db'`

---

## Task 5: Implement AppDatabase

**Files:**
- Create: `packages/shared/src/db.ts`

- [ ] **Step 1: Write implementation**

```typescript
// packages/shared/src/db.ts
import Dexie, { type Table } from 'dexie';
import { nanoid } from 'nanoid';
import type { Space, Project, Task } from './types';

export class AppDatabase extends Dexie {
  spaces!: Table<Space>;
  projects!: Table<Project>;
  tasks!: Table<Task>;

  constructor(name = 'speedy-tasks') {
    super(name);
    this.version(1).stores({
      spaces:   'id, updatedAt, synced',
      projects: 'id, spaceId, updatedAt, synced',
      tasks:    'id, projectId, status, workingDate, dueDate, updatedAt, synced',
    });
    this.on('ready', () => this._seed());
  }

  private async _seed(): Promise<void> {
    const count = await this.spaces.count();
    if (count > 0) return;

    const now = new Date();
    const spaceId = nanoid();

    await this.spaces.add({
      id: spaceId,
      name: 'Personal',
      color: '#5E6AD2',
      createdAt: now,
      updatedAt: now,
      synced: false,
    });

    await this.projects.add({
      id: nanoid(),
      name: 'General',
      spaceId,
      createdAt: now,
      updatedAt: now,
      synced: false,
    });
  }
}

// Singleton for the web app (extension uses its own instance)
export const db = new AppDatabase();
```

- [ ] **Step 2: Run tests**

```bash
cd packages/shared && npm test -- --reporter=verbose
```

Expected: All 4 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/db.ts packages/shared/src/__tests__/db.test.ts
git commit -m "feat(shared): AppDatabase with Dexie and first-launch seed"
```

---

## Task 6: Write failing tests for useSmartInput

**Files:**
- Create: `packages/shared/src/__tests__/useSmartInput.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/shared/src/__tests__/useSmartInput.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSmartInput } from '../SmartInput/useSmartInput';

const tab       = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
const shiftTab  = { key: 'Tab', shiftKey: true,  preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
const esc       = { key: 'Escape', shiftKey: false, preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
const cmdEnter  = { key: 'Enter', metaKey: true, ctrlKey: false, preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>;

function make() {
  const onTaskReady = vi.fn();
  const hook = renderHook(() => useSmartInput(onTaskReady));
  return { hook, onTaskReady };
}

describe('useSmartInput — initial state', () => {
  it('starts with focus on text and empty values', () => {
    const { hook } = make();
    expect(hook.result.current.focus).toBe('text');
    expect(hook.result.current.values.title).toBe('');
    expect(hook.result.current.values.projectId).toBeNull();
    expect(hook.result.current.values.dueDate).toBeNull();
    expect(hook.result.current.values.workingDate).toBeNull();
  });
});

describe('useSmartInput — Tab rotation', () => {
  it('Tab cycles text → project → dueDate → workingDate → text', () => {
    const { hook } = make();

    act(() => hook.result.current.handleTitleKeyDown(tab as any));
    expect(hook.result.current.focus).toBe('project');

    act(() => hook.result.current.handleChipKeyDown('project', tab));
    expect(hook.result.current.focus).toBe('dueDate');

    act(() => hook.result.current.handleChipKeyDown('dueDate', tab));
    expect(hook.result.current.focus).toBe('workingDate');

    act(() => hook.result.current.handleChipKeyDown('workingDate', tab));
    expect(hook.result.current.focus).toBe('text');
  });

  it('Shift+Tab cycles in reverse (text → workingDate)', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleKeyDown(shiftTab as any));
    expect(hook.result.current.focus).toBe('workingDate');
  });
});

describe('useSmartInput — @x trigger detection', () => {
  it('typing @p jumps focus to project and strips trigger from title', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'Buy milk @p' } } as any));
    expect(hook.result.current.focus).toBe('project');
    expect(hook.result.current.values.title).toBe('Buy milk ');
  });

  it('typing @d jumps focus to dueDate', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'Task @d' } } as any));
    expect(hook.result.current.focus).toBe('dueDate');
    expect(hook.result.current.values.title).toBe('Task ');
  });

  it('typing @w jumps focus to workingDate', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'Task @w' } } as any));
    expect(hook.result.current.focus).toBe('workingDate');
  });

  it('normal text change updates title without changing focus', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'Hello' } } as any));
    expect(hook.result.current.values.title).toBe('Hello');
    expect(hook.result.current.focus).toBe('text');
  });
});

describe('useSmartInput — chip interaction', () => {
  it('handleChipClick focuses the chip', () => {
    const { hook } = make();
    act(() => hook.result.current.handleChipClick('dueDate'));
    expect(hook.result.current.focus).toBe('dueDate');
  });

  it('handleSelect sets value and returns focus to text', () => {
    const { hook } = make();
    act(() => hook.result.current.handleChipClick('project'));
    act(() => hook.result.current.handleSelect('project', 'proj-123'));
    expect(hook.result.current.values.projectId).toBe('proj-123');
    expect(hook.result.current.focus).toBe('text');
  });

  it('Escape on chip returns focus to text without clearing value', () => {
    const { hook } = make();
    act(() => hook.result.current.handleSelect('project', 'proj-123'));
    act(() => hook.result.current.handleChipClick('project'));
    act(() => hook.result.current.handleChipKeyDown('project', esc));
    expect(hook.result.current.focus).toBe('text');
    expect(hook.result.current.values.projectId).toBe('proj-123');
  });
});

describe('useSmartInput — save', () => {
  it('⌘+Enter calls onTaskReady with trimmed values and resets', () => {
    const { hook, onTaskReady } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: '  My task  ' } } as any));
    act(() => hook.result.current.handleSelect('project', 'proj-abc'));
    act(() => hook.result.current.handleTitleKeyDown(cmdEnter));

    expect(onTaskReady).toHaveBeenCalledWith({
      title: 'My task',
      projectId: 'proj-abc',
      dueDate: null,
      workingDate: null,
    });
    expect(hook.result.current.values.title).toBe('');
    expect(hook.result.current.values.projectId).toBeNull();
    expect(hook.result.current.focus).toBe('text');
  });

  it('⌘+Enter does nothing when title is empty', () => {
    const { hook, onTaskReady } = make();
    act(() => hook.result.current.handleTitleKeyDown(cmdEnter));
    expect(onTaskReady).not.toHaveBeenCalled();
  });

  it('⌘+Enter also works from a chip via handleChipKeyDown', () => {
    const { hook, onTaskReady } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'My task' } } as any));
    act(() => hook.result.current.handleChipKeyDown('project', cmdEnter as unknown as React.KeyboardEvent));
    expect(onTaskReady).toHaveBeenCalledWith(expect.objectContaining({ title: 'My task' }));
  });

  it('reset clears all values and returns focus to text', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'task' } } as any));
    act(() => hook.result.current.handleSelect('project', 'proj-1'));
    act(() => hook.result.current.reset());
    expect(hook.result.current.values.title).toBe('');
    expect(hook.result.current.values.projectId).toBeNull();
    expect(hook.result.current.focus).toBe('text');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/shared && npm test -- --reporter=verbose src/__tests__/useSmartInput.test.ts
```

Expected: FAIL — `Cannot find module '../SmartInput/useSmartInput'`

---

## Task 7: Implement useSmartInput

**Files:**
- Create: `packages/shared/src/SmartInput/useSmartInput.ts`

- [ ] **Step 1: Write implementation**

```typescript
// packages/shared/src/SmartInput/useSmartInput.ts
import { useState, useCallback } from 'react';
import type { Task } from '../types';

export type ChipFocus = 'project' | 'dueDate' | 'workingDate';
export type FocusTarget = 'text' | ChipFocus;

const TAB_CYCLE: FocusTarget[] = ['text', 'project', 'dueDate', 'workingDate'];

const AT_TRIGGERS: Record<string, ChipFocus> = {
  '@p': 'project',
  '@d': 'dueDate',
  '@w': 'workingDate',
};

export interface SmartInputValues {
  title: string;
  projectId: string | null;
  dueDate: Date | null;
  workingDate: Date | null;
}

export interface UseSmartInputReturn {
  values: SmartInputValues;
  focus: FocusTarget;
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleChipKeyDown: (chip: ChipFocus, e: React.KeyboardEvent) => void;
  handleChipClick: (chip: ChipFocus) => void;
  handleSelect: (chip: ChipFocus, value: string | Date | null) => void;
  reset: () => void;
}

const EMPTY: SmartInputValues = {
  title: '',
  projectId: null,
  dueDate: null,
  workingDate: null,
};

function rotate(current: FocusTarget, dir: 1 | -1): FocusTarget {
  const i = TAB_CYCLE.indexOf(current);
  return TAB_CYCLE[(i + dir + TAB_CYCLE.length) % TAB_CYCLE.length];
}

export function useSmartInput(
  onTaskReady: (task: Pick<Task, 'title' | 'dueDate' | 'workingDate'> & { projectId?: string }) => void
): UseSmartInputReturn {
  const [values, setValues] = useState<SmartInputValues>(EMPTY);
  const [focus, setFocus] = useState<FocusTarget>('text');

  const handleSave = useCallback(() => {
    if (!values.title.trim()) return;
    onTaskReady({
      title: values.title.trim(),
      ...(values.projectId ? { projectId: values.projectId } : {}),
      dueDate: values.dueDate,
      workingDate: values.workingDate,
    });
    setValues(EMPTY);
    setFocus('text');
  }, [values, onTaskReady]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    for (const [trigger, chip] of Object.entries(AT_TRIGGERS)) {
      if (val.endsWith(trigger)) {
        setValues(v => ({ ...v, title: val.slice(0, -trigger.length) }));
        setFocus(chip);
        return;
      }
    }
    setValues(v => ({ ...v, title: val }));
  }, []);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setFocus(f => rotate(f, e.shiftKey ? -1 : 1));
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  const handleChipKeyDown = useCallback((chip: ChipFocus, e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setFocus(f => rotate(f, e.shiftKey ? -1 : 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setFocus('text');
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  const handleChipClick = useCallback((chip: ChipFocus) => {
    setFocus(chip);
  }, []);

  const handleSelect = useCallback((chip: ChipFocus, value: string | Date | null) => {
    const key = chip === 'project' ? 'projectId' : chip;
    setValues(v => ({ ...v, [key]: value }));
    setFocus('text');
  }, []);

  const reset = useCallback(() => {
    setValues(EMPTY);
    setFocus('text');
  }, []);

  return {
    values,
    focus,
    handleTitleChange,
    handleTitleKeyDown,
    handleChipKeyDown,
    handleChipClick,
    handleSelect,
    reset,
  };
}
```

- [ ] **Step 2: Run tests**

```bash
cd packages/shared && npm test -- --reporter=verbose src/__tests__/useSmartInput.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/SmartInput/useSmartInput.ts packages/shared/src/__tests__/useSmartInput.test.ts
git commit -m "feat(shared): useSmartInput hook — tab rotation, @x detection, save"
```

---

## Task 8: Implement Dropdown component

**Files:**
- Create: `packages/shared/src/SmartInput/Dropdown.tsx`
- Create: `packages/shared/src/SmartInput/Dropdown.module.css`

- [ ] **Step 1: Create date parsing helper (inline in Dropdown.tsx)**

```typescript
// Helper — returns a Date for common natural language labels
function parseQuickDate(label: string): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (label === 'Today') return d;
  if (label === 'Tomorrow') { d.setDate(d.getDate() + 1); return d; }
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const target = days.indexOf(label);
  if (target !== -1) {
    const diff = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
  }
  return d;
}
```

- [ ] **Step 2: Create Dropdown.tsx**

```tsx
// packages/shared/src/SmartInput/Dropdown.tsx
import React from 'react';
import type { Project, Space } from '../types';
import type { ChipFocus } from './useSmartInput';
import styles from './Dropdown.module.css';

export interface ProjectWithSpace extends Project {
  space: Space;
}

interface DropdownProps {
  type: ChipFocus;
  projects: ProjectWithSpace[];
  query: string;
  onSelect: (value: string | Date | null) => void;
}

const DATE_QUICK_PICKS = ['Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function parseQuickDate(label: string): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (label === 'Today') return d;
  if (label === 'Tomorrow') { d.setDate(d.getDate() + 1); return d; }
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const target = days.indexOf(label);
  if (target !== -1) {
    const diff = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
  }
  return d;
}

export function Dropdown({ type, projects, query, onSelect }: DropdownProps) {
  if (type === 'project') {
    // Group by space
    const spaceMap = new Map<string, { space: Space; projects: ProjectWithSpace[] }>();
    for (const p of projects) {
      if (!spaceMap.has(p.spaceId)) spaceMap.set(p.spaceId, { space: p.space, projects: [] });
      spaceMap.get(p.spaceId)!.projects.push(p);
    }
    const filtered = query
      ? projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      : projects;

    return (
      <div className={styles.dropdown} role="listbox">
        {query
          ? filtered.map(p => (
              <button key={p.id} className={styles.item} onClick={() => onSelect(p.id)} role="option" type="button">
                <span className={styles.dot} style={{ background: p.space.color }} />
                {p.name}
              </button>
            ))
          : Array.from(spaceMap.values()).map(({ space, projects: sProjects }) => (
              <div key={space.id}>
                <div className={styles.groupLabel}>{space.name}</div>
                {sProjects.map(p => (
                  <button key={p.id} className={styles.item} onClick={() => onSelect(p.id)} role="option" type="button">
                    <span className={styles.dot} style={{ background: space.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            ))
        }
        <button className={`${styles.item} ${styles.newItem}`} onClick={() => onSelect(null)} type="button">
          + New project…
        </button>
      </div>
    );
  }

  // Date picker (dueDate or workingDate)
  return (
    <div className={styles.dropdown} role="listbox">
      <div className={styles.quickPicks}>
        {DATE_QUICK_PICKS.map(label => (
          <button
            key={label}
            className={styles.quickPick}
            onClick={() => onSelect(parseQuickDate(label))}
            role="option"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Dropdown.module.css**

```css
/* packages/shared/src/SmartInput/Dropdown.module.css */
.dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 100;
  background: #111111;
  border: 1px solid #222222;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
  padding: 4px;
  min-width: 180px;
}

.groupLabel {
  font-size: 10px;
  font-weight: 600;
  color: #3a3a3a;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 6px 10px 3px;
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border-radius: 5px;
  background: none;
  border: none;
  color: #777777;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
}

.item:hover {
  background: #1c1f3a;
  color: #e0e0e0;
}

.newItem {
  color: #444444;
  font-style: italic;
  margin-top: 2px;
  border-top: 1px solid #1a1a1a;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.quickPicks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
}

.quickPick {
  padding: 4px 10px;
  border-radius: 5px;
  background: #141414;
  border: 1px solid #1e1e1e;
  color: #666666;
  font-size: 11.5px;
  font-family: inherit;
  cursor: pointer;
}

.quickPick:hover {
  background: #2a1f0a;
  color: #e0a020;
  border-color: rgba(224, 160, 32, 0.3);
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/SmartInput/Dropdown.tsx packages/shared/src/SmartInput/Dropdown.module.css
git commit -m "feat(shared): Dropdown component for @p project list and @d/@w date picks"
```

---

## Task 9: Implement SmartInput component

**Files:**
- Create: `packages/shared/src/SmartInput/SmartInput.tsx`
- Create: `packages/shared/src/SmartInput/SmartInput.module.css`

- [ ] **Step 1: Create SmartInput.module.css**

```css
/* packages/shared/src/SmartInput/SmartInput.module.css */
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 44px;
  background: #0e0e0e;
  border: 1px solid #222222;
  border-radius: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.bar:focus-within {
  border-color: #5E6AD2;
  box-shadow: 0 0 0 3px rgba(94, 106, 210, 0.1);
}

.icon {
  color: #333333;
  font-size: 15px;
  flex-shrink: 0;
  user-select: none;
}

.input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #c8c8c8;
  font-size: 13.5px;
  font-family: inherit;
  letter-spacing: -0.1px;
  min-width: 0;
}

.input::placeholder {
  color: #444444;
}

.chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.chipWrap {
  position: relative;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 5px;
  border: 1px solid transparent;
  font-size: 11.5px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.1s;
}

.chip:focus {
  outline: none;
}

.chipLabel {
  font-size: 10px;
  opacity: 0.55;
}

/* @p — purple */
.chipProject         { background: #131320; color: #3a3a6a; border-color: #1c1c30; }
.chipProject.active  { background: #1c1f3a; color: #7c84e0; border-color: rgba(94,106,210,0.4); box-shadow: 0 0 0 2px rgba(94,106,210,0.15); }
.chipProject.set     { background: #1c1f3a; color: #5E6AD2; border-color: rgba(94,106,210,0.25); }

/* @d — amber */
.chipDue             { background: #181410; color: #4a3a1a; border-color: #221e14; }
.chipDue.active      { background: #2a1f0a; color: #e0a020; border-color: rgba(224,160,32,0.4); box-shadow: 0 0 0 2px rgba(224,160,32,0.12); }
.chipDue.set         { background: #201808; color: #c08010; border-color: rgba(192,128,16,0.25); }

/* @w — green */
.chipWorking         { background: #101814; color: #1a4a28; border-color: #141e18; }
.chipWorking.active  { background: #0f2a1a; color: #4ade80; border-color: rgba(74,222,128,0.4); box-shadow: 0 0 0 2px rgba(74,222,128,0.1); }
.chipWorking.set     { background: #0a2010; color: #3d9f5f; border-color: rgba(61,159,95,0.25); }

.chipDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Create SmartInput.tsx**

```tsx
// packages/shared/src/SmartInput/SmartInput.tsx
import React, { useRef, useEffect } from 'react';
import { useSmartInput, type ChipFocus } from './useSmartInput';
import { Dropdown, type ProjectWithSpace } from './Dropdown';
import type { Task } from '../types';
import styles from './SmartInput.module.css';

interface SmartInputProps {
  projects: ProjectWithSpace[];
  onTaskReady: (task: Pick<Task, 'title' | 'dueDate' | 'workingDate'> & { projectId?: string }) => void;
  placeholder?: string;
  className?: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SmartInput({ projects, onTaskReady, placeholder, className }: SmartInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    values,
    focus,
    handleTitleChange,
    handleTitleKeyDown,
    handleChipKeyDown,
    handleChipClick,
    handleSelect,
  } = useSmartInput(onTaskReady);

  // Return keyboard focus to the text input when focus is 'text'
  useEffect(() => {
    if (focus === 'text') inputRef.current?.focus();
  }, [focus]);

  const projectForId = (id: string | null) => id ? projects.find(p => p.id === id) : undefined;

  const chips: Array<{
    key: ChipFocus;
    chipClass: string;
    label: string;
    sublabel: string;
    value: string | null;
    dotColor?: string;
  }> = [
    {
      key: 'project',
      chipClass: styles.chipProject,
      label: '@p',
      sublabel: 'project',
      value: projectForId(values.projectId)?.name ?? null,
      dotColor: projectForId(values.projectId)?.space?.color,
    },
    {
      key: 'dueDate',
      chipClass: styles.chipDue,
      label: '@d',
      sublabel: 'due',
      value: values.dueDate ? formatDate(values.dueDate) : null,
    },
    {
      key: 'workingDate',
      chipClass: styles.chipWorking,
      label: '@w',
      sublabel: 'working',
      value: values.workingDate ? formatDate(values.workingDate) : null,
    },
  ];

  return (
    <div className={`${styles.bar} ${className ?? ''}`}>
      <span className={styles.icon} aria-hidden>+</span>
      <input
        ref={inputRef}
        className={styles.input}
        value={values.title}
        onChange={handleTitleChange}
        onKeyDown={handleTitleKeyDown}
        placeholder={placeholder ?? 'Add a task… type @p, @w, @d or use Tab'}
        aria-label="Task title"
      />
      <div className={styles.chips}>
        {chips.map(chip => (
          <div key={chip.key} className={styles.chipWrap}>
            <button
              className={[
                styles.chip,
                chip.chipClass,
                focus === chip.key ? styles.active : '',
                chip.value ? styles.set : '',
              ].join(' ')}
              onClick={() => handleChipClick(chip.key)}
              onKeyDown={e => handleChipKeyDown(chip.key, e)}
              tabIndex={-1}
              type="button"
              aria-label={chip.key}
            >
              {chip.value ? (
                <>
                  {chip.dotColor && <span className={styles.chipDot} style={{ background: chip.dotColor }} />}
                  {chip.value}
                </>
              ) : (
                <><span className={styles.chipLabel}>{chip.label}</span>&nbsp;{chip.sublabel}</>
              )}
            </button>
            {focus === chip.key && (
              <Dropdown
                type={chip.key}
                projects={projects}
                query=""
                onSelect={val => handleSelect(chip.key, val)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/SmartInput/SmartInput.tsx packages/shared/src/SmartInput/SmartInput.module.css
git commit -m "feat(shared): SmartInput component with inline chip UI"
```

---

## Task 10: Write and run SmartInput component tests

**Files:**
- Create: `packages/shared/src/__tests__/SmartInput.test.tsx`

- [ ] **Step 1: Write the tests**

```tsx
// packages/shared/src/__tests__/SmartInput.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartInput } from '../SmartInput/SmartInput';
import type { ProjectWithSpace } from '../SmartInput/Dropdown';

const mockProjects: ProjectWithSpace[] = [
  {
    id: 'proj-1',
    name: 'General',
    spaceId: 'space-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
    space: { id: 'space-1', name: 'Personal', color: '#5E6AD2', createdAt: new Date(), updatedAt: new Date(), synced: false },
  },
  {
    id: 'proj-2',
    name: 'Auth PR',
    spaceId: 'space-2',
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
    space: { id: 'space-2', name: 'Work', color: '#e05252', createdAt: new Date(), updatedAt: new Date(), synced: false },
  },
];

describe('SmartInput', () => {
  let onTaskReady: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onTaskReady = vi.fn();
  });

  it('renders the input and three chip buttons', () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    expect(screen.getByRole('textbox', { name: /task title/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'dueDate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'workingDate' })).toBeInTheDocument();
  });

  it('clicking the @p chip opens the project dropdown', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    await userEvent.click(screen.getByRole('button', { name: 'project' }));
    expect(screen.getByRole('option', { name: /General/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Auth PR/ })).toBeInTheDocument();
  });

  it('selecting a project from the dropdown updates the chip label', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    await userEvent.click(screen.getByRole('button', { name: 'project' }));
    await userEvent.click(screen.getByRole('option', { name: /General/ }));
    expect(screen.getByRole('button', { name: 'project' })).toHaveTextContent('General');
  });

  it('clicking the @d chip opens the date dropdown', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    await userEvent.click(screen.getByRole('button', { name: 'dueDate' }));
    expect(screen.getByRole('option', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tomorrow' })).toBeInTheDocument();
  });

  it('⌘+Enter calls onTaskReady with the entered title', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    const input = screen.getByRole('textbox', { name: /task title/i });
    await userEvent.type(input, 'Buy milk');
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    expect(onTaskReady).toHaveBeenCalledWith(expect.objectContaining({ title: 'Buy milk' }));
  });

  it('does not call onTaskReady when title is empty', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    const input = screen.getByRole('textbox', { name: /task title/i });
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    expect(onTaskReady).not.toHaveBeenCalled();
  });

  it('resets the input after successful save', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    const input = screen.getByRole('textbox', { name: /task title/i });
    await userEvent.type(input, 'Some task');
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    expect(input).toHaveValue('');
  });
});
```

- [ ] **Step 2: Run all tests**

```bash
cd packages/shared && npm test -- --reporter=verbose
```

Expected: All tests across db, useSmartInput, and SmartInput PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/__tests__/SmartInput.test.tsx
git commit -m "test(shared): SmartInput component tests"
```

---

## Task 11: Wire up public exports and verify build

**Files:**
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create index.ts**

```typescript
// packages/shared/src/index.ts
export type { Space, Project, Task, TaskStatus } from './types';
export { AppDatabase, db } from './db';
export { SmartInput } from './SmartInput/SmartInput';
export { useSmartInput } from './SmartInput/useSmartInput';
export type { UseSmartInputReturn, SmartInputValues, ChipFocus, FocusTarget } from './SmartInput/useSmartInput';
export type { ProjectWithSpace } from './SmartInput/Dropdown';
```

- [ ] **Step 2: Run the build**

```bash
cd packages/shared && npm run build
```

Expected: `dist/index.js` and `dist/index.d.ts` produced with no errors.

- [ ] **Step 3: Run all tests one final time**

```bash
npm test -- --reporter=verbose
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat(shared): public exports — Plan 1 complete"
```

---

## Plan 1 Complete

`packages/shared` is now a working, tested library. Plans 2 and 3 import from `@sift/shared`.

**Next:** Plan 2 — `apps/web` (Vite + React + Tailwind, views, keyboard nav, auth, Supabase sync).
