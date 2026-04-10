# Date Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-based "Quick Picks" with a full `react-day-picker` calendar that supports smart parsing (e.g., "to" for today), keyboard grid navigation, and displays "not done" task counts per day.

**Architecture:** A new `useTaskCounts` hook provides "busy-ness" data from Dexie. The `@sift/shared` package gets a `Calendar` component wrapping `react-day-picker`, which the `Dropdown` uses to provide a visual, searchable date selection experience.

**Tech Stack:** React, Tailwind, `react-day-picker`, Dexie.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `apps/web/package.json`
- Modify: `packages/shared/package.json`

- [ ] **Step 1: Add `react-day-picker` to `apps/web`**
Run: `npm install react-day-picker date-fns` (date-fns is a peer dep for some parts of day-picker) in `apps/web`.

- [ ] **Step 2: Add `react-day-picker` to `packages/shared`**
Run: `npm install react-day-picker date-fns` in `packages/shared`.

- [ ] **Step 3: Commit**
```bash
git add apps/web/package.json packages/shared/package.json
git commit -m "chore: add react-day-picker and date-fns dependencies"
```

---

### Task 2: Implement `useTaskCounts` Hook

**Files:**
- Modify: `apps/web/src/hooks/useTasks.ts`

- [ ] **Step 1: Add `useTaskCounts` hook**
```typescript
// apps/web/src/hooks/useTasks.ts
// ... imports
import { useLiveQuery } from 'dexie-react-hooks';

export function useTaskCounts() {
  return useLiveQuery(async () => {
    const tasks = await db.tasks.where('status').notEqual('done').toArray();
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      const d = t.dueDate || t.workingDate;
      if (!d) continue;
      const key = d.toISOString().split('T')[0];
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, []) ?? {};
}
```

- [ ] **Step 2: Commit**
```bash
git add apps/web/src/hooks/useTasks.ts
git commit -m "feat: add useTaskCounts hook to fetch busy-ness per day"
```

---

### Task 3: Smart Date Parsing Utility

**Files:**
- Modify: `packages/shared/src/parseLooseDate.ts`

- [ ] **Step 1: Implement `matchBestDate`**
```typescript
// packages/shared/src/parseLooseDate.ts

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function matchBestDate(query: string, reference: Date = new Date()): Date | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  const d = new Date(reference);
  d.setHours(0, 0, 0, 0);

  if ('today'.startsWith(q)) return d;
  if ('tomorrow'.startsWith(q)) {
    d.setDate(d.getDate() + 1);
    return d;
  }

  for (let i = 0; i < 7; i++) {
    const dayName = WEEKDAYS[i];
    if (dayName.startsWith(q)) {
      const today = reference.getDay();
      const diff = (i - today + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d;
    }
  }

  return parseLooseDateQuery(query, reference);
}
```

- [ ] **Step 2: Update `parseLooseDateQuery` to handle basic formats**
Ensure it doesn't conflict.

- [ ] **Step 3: Commit**
```bash
git add packages/shared/src/parseLooseDate.ts
git commit -m "feat: add matchBestDate for smart prefix parsing"
```

---

### Task 4: Base `Calendar` Component

**Files:**
- Create: `packages/shared/src/Calendar/Calendar.tsx`
- Create: `packages/shared/src/Calendar/Calendar.module.css`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `Calendar` component**
Wrap `DayPicker` with Sift styling and task count display.
```tsx
// packages/shared/src/Calendar/Calendar.tsx
import { DayPicker } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import styles from './Calendar.module.css';

export interface CalendarProps {
  selected?: Date;
  onSelect: (date: Date) => void;
  taskCounts?: Record<string, number>;
  month?: Date;
  onMonthChange?: (month: Date) => void;
}

export function Calendar({ selected, onSelect, taskCounts = {}, month, onMonthChange }: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={(d) => d && onSelect(d)}
      month={month}
      onMonthChange={onMonthChange}
      locale={fr}
      className={styles.rdp}
      modifiers={{ hasTasks: (date) => !!taskCounts[date.toISOString().split('T')[0]] }}
      modifiersClassNames={{ hasTasks: styles.hasTasks }}
      components={{
        DayContent: ({ date }) => {
          const count = taskCounts[date.toISOString().split('T')[0]];
          return (
            <div className={styles.dayCell}>
              <span>{date.getDate()}</span>
              {count > 0 && <span className={styles.count}>{count}</span>}
            </div>
          );
        }
      }}
    />
  );
}
```

- [ ] **Step 2: Create CSS module**
```css
/* packages/shared/src/Calendar/Calendar.module.css */
.rdp {
  --rdp-accent-color: var(--accent);
  --rdp-background-color: var(--surface-2);
  margin: 0;
}
.dayCell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.count {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 8px;
  font-family: var(--font-mono);
  color: var(--accent);
  opacity: 0.7;
}
```

- [ ] **Step 3: Export from `shared`**
```typescript
// packages/shared/src/index.ts
export * from './Calendar/Calendar';
// ...
```

- [ ] **Step 4: Commit**
```bash
git add packages/shared/src/Calendar/ packages/shared/src/index.ts
git commit -m "feat: add Calendar component using react-day-picker"
```

---

### Task 5: Update `Dropdown` to use `Calendar`

**Files:**
- Modify: `packages/shared/src/SmartInput/Dropdown.tsx`

- [ ] **Step 1: Replace Quick Picks with `Calendar`**
```tsx
// packages/shared/src/SmartInput/Dropdown.tsx
import { Calendar } from '../Calendar/Calendar';
import { matchBestDate } from '../parseLooseDate';

// ... update DropdownProps to accept taskCounts
interface DropdownProps {
  // ...
  taskCounts?: Record<string, number>;
}

// In the Date picker section of Dropdown:
const bestMatch = useMemo(() => matchBestDate(query), [query]);
const [displayMonth, setDisplayMonth] = useState(bestMatch || new Date());

useEffect(() => {
  if (bestMatch) setDisplayMonth(bestMatch);
}, [bestMatch]);

// Render:
return (
  <div className={dropdownClass}>
    <Calendar
      selected={bestMatch || undefined}
      onSelect={onSelect}
      taskCounts={taskCounts}
      month={displayMonth}
      onMonthChange={setDisplayMonth}
    />
  </div>
);
```

- [ ] **Step 2: Commit**
```bash
git add packages/shared/src/SmartInput/Dropdown.tsx
git commit -m "feat: integrate Calendar into Dropdown"
```

---

### Task 6: Grid Keyboard Navigation

**Files:**
- Modify: `packages/shared/src/SmartInput/Dropdown.tsx`

- [ ] **Step 1: Intercept Arrow keys for Grid navigation**
Update the `onKey` listener in `Dropdown.tsx` to handle calendar movements when `type === 'dueDate' || type === 'workingDate'`.
```typescript
// packages/shared/src/SmartInput/Dropdown.tsx
// ... inside onKey
if (type === 'dueDate' || type === 'workingDate') {
  const current = bestMatchRef.current || new Date();
  if (e.key === 'ArrowDown') {
    const next = new Date(current); next.setDate(next.getDate() + 7);
    onSelectRef.current(next);
  } else if (e.key === 'ArrowUp') {
    const next = new Date(current); next.setDate(next.getDate() - 7);
    onSelectRef.current(next);
  } else if (e.key === 'ArrowRight') {
    const next = new Date(current); next.setDate(next.getDate() + 1);
    onSelectRef.current(next);
  } else if (e.key === 'ArrowLeft') {
    const next = new Date(current); next.setDate(next.getDate() - 1);
    onSelectRef.current(next);
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add packages/shared/src/SmartInput/Dropdown.tsx
git commit -m "feat: add arrow key grid navigation to calendar dropdown"
```

---

### Task 7: Pass Task Counts from App

**Files:**
- Modify: `apps/web/src/components/InputBar.tsx`
- Modify: `apps/web/src/components/CommandPalette.tsx`
- Modify: `apps/web/src/components/ProjectEditPalette.tsx`
- Modify: `packages/shared/src/SmartInput/SmartInput.tsx`

- [ ] **Step 1: Update `SmartInput` to accept `taskCounts`**
- [ ] **Step 2: Use `useTaskCounts()` in `InputBar`, `CommandPalette`, and `ProjectEditPalette` and pass it down.**
- [ ] **Step 3: Commit**
```bash
git add apps/web/src/components/ packages/shared/src/SmartInput/
git commit -m "feat: wire up task counts from app to calendar"
```
