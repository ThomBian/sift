# Pass Task Counts from App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up `useTaskCounts` hook from the web app to the `SmartInput` and `Dropdown` components to show busy-ness in the calendar.

**Architecture:** The `useTaskCounts` hook provides a mapping of date strings to task counts. This data is passed through `SmartInput` and directly to `Dropdown` (in `ProjectEditPalette`) which then provides it to the `Calendar` component.

**Tech Stack:** React, TypeScript, Dexie (via `useTaskCounts`).

---

### Task 1: Update `SmartInput` to accept `taskCounts`

**Files:**
- Modify: `packages/shared/src/SmartInput/SmartInput.tsx`

- [ ] **Step 1: Update `SmartInputProps` interface**

```typescript
interface SmartInputProps {
  projects: ProjectWithSpace[];
  onTaskReady: (task: Pick<Task, 'title' | 'dueDate' | 'workingDate' | 'url'> & { projectId?: string }) => void;
  placeholder?: string;
  className?: string;
  /** Optional external ref to the underlying <input> for programmatic focus from the parent. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Pre-fill the input with existing values (edit mode). */
  initialValues?: Partial<import('./useSmartInput').SmartInputValues>;
  /** Auto-open this chip's dropdown on mount (edit mode). */
  initialFocus?: import('./useSmartInput').ChipFocus;
  /** Whether the chip dropdown floats absolutely or expands inline below the bar. Default: 'floating'. */
  dropdownPosition?: 'floating' | 'inline';
  /** Task counts per day for the calendar. */
  taskCounts?: Record<string, number>;
}
```

- [ ] **Step 2: Destructure `taskCounts` and pass it to `Dropdown` calls**

In the return statement, find both `Dropdown` usages (floating and inline) and pass `taskCounts={taskCounts}`.

- [ ] **Step 3: Verify build**

Run: `npm run build -w packages/shared`
Expected: Success

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/SmartInput/SmartInput.tsx
git commit -m "feat(shared): add taskCounts prop to SmartInput"
```

### Task 2: Wire up `taskCounts` in Web App Components

**Files:**
- Modify: `apps/web/src/components/InputBar.tsx`
- Modify: `apps/web/src/components/CommandPalette.tsx`
- Modify: `apps/web/src/components/ProjectEditPalette.tsx`

- [ ] **Step 1: Update `InputBar.tsx`**

Import `useTaskCounts` from `../hooks/useTasks` and pass it to `SmartInput`.

```typescript
import { useTaskCounts } from '../hooks/useTasks';
// ... inside InputBar component
const taskCounts = useTaskCounts();
// ...
<SmartInput
  // ...
  taskCounts={taskCounts}
/>
```

- [ ] **Step 2: Update `CommandPalette.tsx`**

Import `useTaskCounts` from `../hooks/useTasks` and pass it to `SmartInput`.

```typescript
import { useTaskCounts } from '../hooks/useTasks';
// ... inside CommandPalette component
const taskCounts = useTaskCounts();
// ...
<SmartInput
  // ...
  taskCounts={taskCounts}
/>
```

- [ ] **Step 3: Update `ProjectEditPalette.tsx`**

Import `useTaskCounts` from `../hooks/useTasks` and pass it to `Dropdown`.

```typescript
import { useTaskCounts } from '../hooks/useTasks';
// ... inside ProjectEditPalette component
const taskCounts = useTaskCounts();
// ...
<Dropdown
  // ...
  taskCounts={taskCounts}
/>
```

- [ ] **Step 4: Verify web app build**

Run: `npm run build -w apps/web`
Expected: Success

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat(web): pass task counts to SmartInput and Dropdown"
```
