# Project Emoji Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an emoji field to projects so users can visually identify which project a task belongs to in flat views (Today, Inbox).

**Architecture:** Add `emoji: string | null` to the `Project` type with a Dexie v3 migration. Create a curated emoji pool with keyword search, an `EmojiPicker` grid component in `packages/shared`, integrate it into `ProjectEditPalette` as a `@c` chip, show emoji + italic project name in `TaskRow` for flat views, and add a `C` shortcut in ProjectsView.

**Tech Stack:** React, TypeScript, Dexie.js, Vitest, Testing Library, CSS Modules

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `packages/shared/src/types.ts` | Modify | Add `emoji` field to `Project` |
| `packages/shared/src/db.ts` | Modify | Dexie v3 migration, seed update |
| `packages/shared/src/emojiPool.ts` | Create | Curated emoji data, random picker, keyword map |
| `packages/shared/src/EmojiPicker/EmojiPicker.tsx` | Create | Grid-based emoji picker component |
| `packages/shared/src/EmojiPicker/EmojiPicker.module.css` | Create | Styles for emoji picker grid |
| `packages/shared/src/index.ts` | Modify | Export new modules |
| `apps/web/src/components/ProjectEditPalette.tsx` | Modify | Add `@c` chip + EmojiPicker integration |
| `apps/web/src/components/TaskRow.tsx` | Modify | Show emoji + italic project name |
| `apps/web/src/components/TaskList.tsx` | Modify | Pass `showProject` prop through |
| `apps/web/src/views/ProjectsView.tsx` | Modify | `C` shortcut, emoji in header, `showProject={false}` |
| `apps/web/src/components/layout/AppLayout.tsx` | Modify | Widen `initialField` type to include `'emoji'` |
| `packages/shared/src/__tests__/emojiPool.test.ts` | Create | Tests for emoji pool + random picker |
| `packages/shared/src/__tests__/EmojiPicker.test.tsx` | Create | Tests for emoji picker component |
| `apps/web/src/__tests__/TaskRow.test.tsx` | Modify | Add tests for project name display |

---

### Task 1: Emoji Pool Data Module

**Files:**
- Create: `packages/shared/src/emojiPool.ts`
- Create: `packages/shared/src/__tests__/emojiPool.test.ts`

- [ ] **Step 1: Write failing tests for emoji pool**

Create `packages/shared/src/__tests__/emojiPool.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { EMOJI_POOL, ALL_EMOJIS, getRandomEmoji, searchEmojis } from '../emojiPool';

describe('emojiPool', () => {
  it('EMOJI_POOL has at least 6 categories', () => {
    expect(EMOJI_POOL.length).toBeGreaterThanOrEqual(6);
  });

  it('every category has a name and at least 3 emojis', () => {
    for (const cat of EMOJI_POOL) {
      expect(cat.category).toBeTruthy();
      expect(cat.emojis.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('ALL_EMOJIS is a flat array of every emoji', () => {
    const total = EMOJI_POOL.reduce((sum, c) => sum + c.emojis.length, 0);
    expect(ALL_EMOJIS).toHaveLength(total);
  });

  it('getRandomEmoji returns a string from the pool', () => {
    const emoji = getRandomEmoji();
    expect(typeof emoji).toBe('string');
    expect(ALL_EMOJIS).toContain(emoji);
  });

  it('searchEmojis filters by keyword', () => {
    const results = searchEmojis('rocket');
    expect(results).toContain('🚀');
  });

  it('searchEmojis returns all emojis for empty query', () => {
    const results = searchEmojis('');
    expect(results).toEqual(ALL_EMOJIS);
  });

  it('searchEmojis returns empty array for no match', () => {
    const results = searchEmojis('xyznonexistent');
    expect(results).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/shared/src/__tests__/emojiPool.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement emoji pool module**

Create `packages/shared/src/emojiPool.ts`:

```ts
// packages/shared/src/emojiPool.ts

export interface EmojiCategory {
  category: string;
  emojis: string[];
}

export const EMOJI_POOL: EmojiCategory[] = [
  {
    category: 'Work',
    emojis: ['💼', '📊', '📈', '🎯', '💡', '⚡', '🔧', '📋'],
  },
  {
    category: 'Creative',
    emojis: ['🎨', '✏️', '🎬', '📷', '🎵', '🎭'],
  },
  {
    category: 'Tech',
    emojis: ['💻', '🖥️', '🤖', '🧪', '🔬', '⚙️'],
  },
  {
    category: 'Nature',
    emojis: ['🌱', '🌊', '🏔️', '🌙', '☀️', '🌿'],
  },
  {
    category: 'Objects',
    emojis: ['📚', '🏠', '✈️', '🚀', '💎', '🎁', '🔑'],
  },
  {
    category: 'Symbols',
    emojis: ['⭐', '❤️', '🔥', '✅', '🏁', '🎲', '🎈'],
  },
  {
    category: 'Animals',
    emojis: ['🐛', '🦊', '🐙', '🦋', '🐝'],
  },
];

export const ALL_EMOJIS: string[] = EMOJI_POOL.flatMap((c) => c.emojis);

/** Map each emoji to searchable keywords */
const EMOJI_KEYWORDS: Record<string, string[]> = {
  '💼': ['briefcase', 'work', 'business'],
  '📊': ['chart', 'bar', 'stats', 'analytics'],
  '📈': ['graph', 'growth', 'trending', 'up'],
  '🎯': ['target', 'goal', 'dart', 'focus'],
  '💡': ['bulb', 'idea', 'light', 'insight'],
  '⚡': ['lightning', 'bolt', 'fast', 'energy', 'power'],
  '🔧': ['wrench', 'tool', 'fix', 'repair'],
  '📋': ['clipboard', 'list', 'tasks', 'plan'],
  '🎨': ['art', 'palette', 'paint', 'design', 'creative'],
  '✏️': ['pencil', 'write', 'edit', 'draw'],
  '🎬': ['film', 'movie', 'video', 'clapper'],
  '📷': ['camera', 'photo', 'picture', 'snap'],
  '🎵': ['music', 'note', 'song', 'audio'],
  '🎭': ['theater', 'drama', 'mask', 'performance'],
  '💻': ['laptop', 'computer', 'code', 'dev'],
  '🖥️': ['desktop', 'monitor', 'screen', 'display'],
  '🤖': ['robot', 'ai', 'bot', 'automation'],
  '🧪': ['test', 'tube', 'experiment', 'lab', 'science'],
  '🔬': ['microscope', 'research', 'science', 'study'],
  '⚙️': ['gear', 'settings', 'config', 'engine'],
  '🌱': ['seedling', 'plant', 'grow', 'green', 'nature'],
  '🌊': ['wave', 'ocean', 'water', 'sea'],
  '🏔️': ['mountain', 'peak', 'summit', 'climb'],
  '🌙': ['moon', 'night', 'crescent', 'sleep'],
  '☀️': ['sun', 'sunny', 'bright', 'day'],
  '🌿': ['herb', 'leaf', 'green', 'nature'],
  '📚': ['books', 'library', 'read', 'study', 'docs'],
  '🏠': ['house', 'home', 'building'],
  '✈️': ['plane', 'travel', 'flight', 'trip'],
  '🚀': ['rocket', 'launch', 'ship', 'fast', 'startup'],
  '💎': ['gem', 'diamond', 'precious', 'quality'],
  '🎁': ['gift', 'present', 'surprise', 'reward'],
  '🔑': ['key', 'lock', 'access', 'secret', 'auth'],
  '⭐': ['star', 'favorite', 'rating', 'important'],
  '❤️': ['heart', 'love', 'favorite', 'health'],
  '🔥': ['fire', 'hot', 'trending', 'popular', 'urgent'],
  '✅': ['check', 'done', 'complete', 'approved'],
  '🏁': ['flag', 'finish', 'race', 'milestone', 'end'],
  '🎲': ['dice', 'game', 'random', 'luck'],
  '🎈': ['balloon', 'party', 'celebration', 'fun'],
  '🐛': ['bug', 'insect', 'debug', 'issue'],
  '🦊': ['fox', 'clever', 'cunning'],
  '🐙': ['octopus', 'tentacle', 'github'],
  '🦋': ['butterfly', 'transform', 'change', 'pretty'],
  '🐝': ['bee', 'busy', 'honey', 'buzz'],
};

export function getRandomEmoji(): string {
  return ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
}

export function searchEmojis(query: string): string[] {
  if (!query.trim()) return ALL_EMOJIS;
  const q = query.toLowerCase().trim();
  return ALL_EMOJIS.filter((emoji) => {
    const keywords = EMOJI_KEYWORDS[emoji] ?? [];
    return keywords.some((kw) => kw.includes(q));
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/shared/src/__tests__/emojiPool.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/emojiPool.ts packages/shared/src/__tests__/emojiPool.test.ts
git commit -m "feat(shared): add curated emoji pool with search"
```

---

### Task 2: Data Model — Add `emoji` to Project

**Files:**
- Modify: `packages/shared/src/types.ts:12-20`
- Modify: `packages/shared/src/db.ts:18-24, 26-51`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/__tests__/TaskRow.test.tsx:17-25`

- [ ] **Step 1: Add `emoji` field to Project type**

In `packages/shared/src/types.ts`, add `emoji` after `name`:

```ts
export interface Project {
  id: string;
  name: string;
  emoji: string | null;   // single emoji character
  spaceId: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}
```

- [ ] **Step 2: Add Dexie v3 migration and update seed**

In `packages/shared/src/db.ts`, add the import and version 3 migration:

Add import at the top:
```ts
import { getRandomEmoji } from './emojiPool';
```

After the existing `this.version(2)` block, add:
```ts
    this.version(3).stores({
      projects: 'id, spaceId, dueDate, updatedAt, synced',
    }).upgrade(tx => {
      return tx.table('projects').toCollection().modify((project: any) => {
        project.emoji = getRandomEmoji();
      });
    });
```

In the `_seed()` method, add `emoji` to the project creation:
```ts
    await this.projects.add({
      id: nanoid(),
      name: 'General',
      emoji: getRandomEmoji(),
      spaceId,
      dueDate: null,
      createdAt: now,
      updatedAt: now,
      synced: false,
    });
```

- [ ] **Step 3: Export new modules from index**

In `packages/shared/src/index.ts`, add:

```ts
export { EMOJI_POOL, ALL_EMOJIS, getRandomEmoji, searchEmojis } from './emojiPool';
export type { EmojiCategory } from './emojiPool';
```

- [ ] **Step 4: Update test fixtures**

In `apps/web/src/__tests__/TaskRow.test.tsx`, add `emoji` to the project fixture (line 18):

```ts
const project: Project = {
  id: 'project-1',
  name: 'General',
  emoji: '📚',
  spaceId: 'space-1',
  dueDate: null,
  createdAt: now,
  updatedAt: now,
  synced: true,
};
```

Search for any other test files that create `Project` objects and add `emoji` to each. Check these files:
- `apps/web/src/__tests__/TaskEditPalette.test.tsx`
- `apps/web/src/__tests__/useTasks.test.ts`
- `apps/web/src/__tests__/SyncService.test.ts`
- `apps/web/src/__tests__/useProjectNav.test.ts`
- `packages/shared/src/__tests__/SmartInput.test.tsx`

For each file, find every `Project` object literal and add `emoji: '📚',` (or any emoji from the pool).

- [ ] **Step 5: Build shared package and run all tests**

Run: `npm run build --workspace=@sift/shared && npm run test`
Expected: All tests PASS. Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/db.ts packages/shared/src/index.ts apps/web/src/__tests__/ packages/shared/src/__tests__/
git commit -m "feat(shared): add emoji field to Project type with Dexie v3 migration"
```

---

### Task 3: EmojiPicker Component

**Files:**
- Create: `packages/shared/src/EmojiPicker/EmojiPicker.tsx`
- Create: `packages/shared/src/EmojiPicker/EmojiPicker.module.css`
- Create: `packages/shared/src/__tests__/EmojiPicker.test.tsx`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write failing tests for EmojiPicker**

Create `packages/shared/src/__tests__/EmojiPicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmojiPicker } from '../EmojiPicker/EmojiPicker';

describe('EmojiPicker', () => {
  it('renders emoji grid with category headers', () => {
    render(<EmojiPicker query="" onSelect={vi.fn()} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Creative')).toBeInTheDocument();
    // At least one emoji button should exist
    expect(screen.getAllByRole('button').length).toBeGreaterThan(10);
  });

  it('calls onSelect when an emoji is clicked', () => {
    const onSelect = vi.fn();
    render(<EmojiPicker query="" onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(typeof onSelect.mock.calls[0][0]).toBe('string');
  });

  it('filters emojis by query', () => {
    render(<EmojiPicker query="rocket" onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    // Should show only matching emojis
    expect(buttons.length).toBeLessThan(10);
    expect(buttons[0].textContent).toBe('🚀');
  });

  it('shows empty state when no emojis match', () => {
    render(<EmojiPicker query="xyznonexistent" onSelect={vi.fn()} />);
    expect(screen.getByText('No emojis found')).toBeInTheDocument();
  });

  it('supports keyboard navigation — Enter selects focused emoji', () => {
    const onSelect = vi.fn();
    render(<EmojiPicker query="" onSelect={onSelect} />);
    // ArrowDown then Enter to select first emoji
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/shared/src/__tests__/EmojiPicker.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create EmojiPicker CSS module**

Create `packages/shared/src/EmojiPicker/EmojiPicker.module.css`:

```css
/* packages/shared/src/EmojiPicker/EmojiPicker.module.css */
.picker {
  border-top: 0.5px solid #E2E2E2;
  max-height: 260px;
  overflow-y: auto;
  padding: 8px;
}

.categoryHeader {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 600;
  color: #888888;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  padding: 8px 4px 4px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 18px;
  background: none;
  border: 1px solid transparent;
  border-radius: 0;
  cursor: pointer;
  padding: 0;
  transition: all 0.1s;
}

.cell:hover {
  background: rgba(255, 79, 0, 0.05);
  border-color: #E2E2E2;
}

.cellFocused {
  border-color: #FF4F00;
  background: rgba(255, 79, 0, 0.05);
  box-shadow: 0 0 8px rgba(255, 79, 0, 0.4);
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #888888;
}
```

- [ ] **Step 4: Implement EmojiPicker component**

Create `packages/shared/src/EmojiPicker/EmojiPicker.tsx`:

```tsx
// packages/shared/src/EmojiPicker/EmojiPicker.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { EMOJI_POOL, searchEmojis } from '../emojiPool';
import styles from './EmojiPicker.module.css';

interface EmojiPickerProps {
  query: string;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ query, onSelect }: EmojiPickerProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Build the flat list of visible emojis, preserving category structure
  const { sections, flatEmojis } = useMemo(() => {
    if (query.trim()) {
      const matched = searchEmojis(query);
      return {
        sections: matched.length > 0 ? [{ category: 'Results', emojis: matched }] : [],
        flatEmojis: matched,
      };
    }
    const flat: string[] = [];
    for (const cat of EMOJI_POOL) {
      flat.push(...cat.emojis);
    }
    return { sections: EMOJI_POOL, flatEmojis: flat };
  }, [query]);

  // Reset focus when query changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [query]);

  // Stable refs for keyboard handler
  const flatEmojisRef = useRef(flatEmojis);
  useEffect(() => { flatEmojisRef.current = flatEmojis; }, [flatEmojis]);
  const focusedIndexRef = useRef(focusedIndex);
  useEffect(() => { focusedIndexRef.current = focusedIndex; }, [focusedIndex]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // Capture-phase keyboard listener (same pattern as Dropdown)
  useEffect(() => {
    const COLS = 8;
    function onKey(e: KeyboardEvent) {
      const len = flatEmojisRef.current.length;
      if (len === 0) return;

      if (e.key === 'ArrowRight') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, len - 1));
      } else if (e.key === 'ArrowLeft') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'ArrowDown') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex((i) => {
          const next = i + COLS;
          return next < len ? next : i;
        });
      } else if (e.key === 'ArrowUp') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex((i) => {
          const next = i - COLS;
          return next >= 0 ? next : i;
        });
      } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        e.stopImmediatePropagation();
        e.preventDefault();
        const idx = focusedIndexRef.current >= 0 ? focusedIndexRef.current : 0;
        const emoji = flatEmojisRef.current[idx];
        if (emoji) onSelectRef.current(emoji);
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  if (flatEmojis.length === 0) {
    return (
      <div className={styles.picker}>
        <div className={styles.empty}>No emojis found</div>
      </div>
    );
  }

  // Track global index across categories
  let globalIndex = 0;

  return (
    <div className={styles.picker}>
      {sections.map((section) => (
        <div key={section.category}>
          <div className={styles.categoryHeader}>{section.category}</div>
          <div className={styles.grid}>
            {section.emojis.map((emoji) => {
              const idx = globalIndex++;
              return (
                <button
                  key={`${section.category}-${emoji}`}
                  type="button"
                  className={`${styles.cell} ${idx === focusedIndex ? styles.cellFocused : ''}`}
                  onClick={() => onSelect(emoji)}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Export EmojiPicker from shared index**

In `packages/shared/src/index.ts`, add:

```ts
export { EmojiPicker } from './EmojiPicker/EmojiPicker';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run build --workspace=@sift/shared && npx vitest run packages/shared/src/__tests__/EmojiPicker.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/EmojiPicker/ packages/shared/src/__tests__/EmojiPicker.test.tsx packages/shared/src/index.ts
git commit -m "feat(shared): add EmojiPicker grid component"
```

---

### Task 4: ProjectEditPalette — Add `@c` Chip

**Files:**
- Modify: `apps/web/src/components/ProjectEditPalette.tsx`
- Modify: `apps/web/src/components/layout/AppLayout.tsx:14, 66`

- [ ] **Step 1: Widen `initialField` type in AppLayout**

In `apps/web/src/components/layout/AppLayout.tsx`, change line 14:

From:
```ts
  initialField?: 'name' | 'dueDate';
```
To:
```ts
  initialField?: 'name' | 'emoji' | 'dueDate';
```

Also update the `onEditProject` handler at line 66:

From:
```ts
      const { project, field } = (e as CustomEvent<{ project: Project; field: 'name' | 'dueDate' }>).detail;
```
To:
```ts
      const { project, field } = (e as CustomEvent<{ project: Project; field: 'name' | 'emoji' | 'dueDate' }>).detail;
```

- [ ] **Step 2: Update ProjectEditPalette with emoji chip**

Replace the full content of `apps/web/src/components/ProjectEditPalette.tsx`:

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { db } from '../lib/db';
import { Dropdown, EmojiPicker, getRandomEmoji } from '@sift/shared';
import type { Project } from '@sift/shared';

interface ProjectEditPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId?: string;
  project?: Project;
  initialField?: 'name' | 'emoji' | 'dueDate';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR');
}

type ActiveChip = 'name' | 'emoji' | 'dueDate';

const TAB_ORDER: ActiveChip[] = ['name', 'emoji', 'dueDate'];

export default function ProjectEditPalette({
  isOpen,
  onClose,
  spaceId,
  project,
  initialField = 'name',
}: ProjectEditPaletteProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [activeChip, setActiveChip] = useState<ActiveChip>(initialField);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(project?.name ?? '');
    setEmoji(project?.emoji ?? null);
    setDueDate(project?.dueDate ?? null);
    setActiveChip(initialField);
    setQuery('');
  }, [isOpen, project, initialField]);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  async function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date();
    if (project) {
      await db.projects.update(project.id, {
        name: trimmed,
        emoji,
        dueDate,
        updatedAt: now,
        synced: false,
      });
    } else {
      await db.projects.add({
        id: nanoid(),
        name: trimmed,
        emoji: emoji ?? getRandomEmoji(),
        spaceId: spaceId!,
        dueDate,
        createdAt: now,
        updatedAt: now,
        synced: false,
      });
    }
    onClose();
  }

  function handleChipClick(chip: ActiveChip) {
    setActiveChip(chip);
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleTabNext() {
    const idx = TAB_ORDER.indexOf(activeChip);
    const next = TAB_ORDER[(idx + 1) % TAB_ORDER.length];
    handleChipClick(next);
  }

  function handleEmojiSelect(selected: string) {
    setEmoji(selected);
    setActiveChip('name');
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleDateSelect(value: string | Date | null) {
    setDueDate(value instanceof Date ? value : null);
    setActiveChip('name');
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleClear() {
    if (activeChip === 'emoji') {
      setEmoji(null);
    } else {
      setDueDate(null);
    }
    setActiveChip('name');
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabNext();
      return;
    }
    if (e.key === 'Enter' && activeChip === 'name') {
      e.preventDefault();
      void handleConfirm();
    }
  }

  if (!isOpen) return null;

  const inNameMode = activeChip === 'name';

  const makeChipStyle = (chip: ActiveChip, isSet: boolean): React.CSSProperties => {
    const isActive = activeChip === chip;
    if (chip === 'emoji') {
      return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 9px',
        border: '1px solid',
        borderRadius: 0,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11.5px',
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.1s',
        ...(isActive
          ? { background: '#FFF7ED', color: '#FF4F00', borderColor: '#FF4F00' }
          : isSet
            ? { background: '#FFF7ED', color: '#FF4F00', borderColor: '#FFD4B0' }
            : { background: '#FAFAFA', color: '#888888', borderColor: '#E2E2E2' }
        ),
      };
    }
    // dueDate chip
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 9px',
      border: '1px solid',
      borderRadius: 0,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '11.5px',
      fontWeight: 500,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'all 0.1s',
      ...(isActive
        ? { background: '#FFF0F0', color: '#E60000', borderColor: '#E60000' }
        : isSet
          ? { background: '#FFF0F0', color: '#E60000', borderColor: '#FFBDBD' }
          : { background: '#FAFAFA', color: '#888888', borderColor: '#E2E2E2' }
      ),
    };
  };

  const inputValue = inNameMode ? name : query;
  const inputPlaceholder = activeChip === 'emoji'
    ? 'Search emojis…'
    : activeChip === 'dueDate'
      ? 'Pick a date…'
      : 'Project name…';

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (inNameMode) {
      const val = e.target.value;
      if (val.endsWith('@c')) {
        setName(val.slice(0, -2));
        handleChipClick('emoji');
      } else if (val.endsWith('@d')) {
        setName(val.slice(0, -2));
        handleChipClick('dueDate');
      } else {
        setName(val);
      }
    } else {
      setQuery(e.target.value);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/30 backdrop-blur-[2px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-palette-in w-full max-w-[820px] border-[0.5px] border-border bg-bg/95 floating-panel shadow-2xl">
        {/* Context row */}
        <div className="flex items-center px-3 py-1.5 border-b border-border">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
            {project ? `Editing · ${project.name}` : 'New Project'}
          </span>
          <span className="ml-auto font-mono text-[9px] text-dim">
            esc to close
          </span>
        </div>

        {/* Input row */}
        <div className="flex items-center h-11 px-3 gap-2 border border-transparent focus-within:border-accent transition-colors duration-150">
          <span className="text-dim text-[15px] shrink-0 select-none">+</span>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            className="flex-1 bg-transparent border-none text-[13.5px] text-text font-sans min-w-0"
            style={{ outline: 'none', letterSpacing: '-0.1px' }}
          />
          <button
            type="button"
            onClick={() => handleChipClick('emoji')}
            style={makeChipStyle('emoji', emoji !== null)}
          >
            {emoji ? (
              <>{emoji}</>
            ) : (
              <><span style={{ fontSize: '10px', opacity: 0.55 }}>@c</span>&nbsp;icon</>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleChipClick('dueDate')}
            style={makeChipStyle('dueDate', dueDate !== null)}
          >
            {dueDate ? (
              <><span style={{ fontSize: '10px', opacity: 0.55 }}>@d</span>&nbsp;{formatDate(dueDate)}</>
            ) : (
              <><span style={{ fontSize: '10px', opacity: 0.55 }}>@d</span>&nbsp;due</>
            )}
          </button>
        </div>

        {/* Emoji picker — inline below input */}
        {activeChip === 'emoji' && (
          <>
            <EmojiPicker query={query} onSelect={handleEmojiSelect} />
            <button
              type="button"
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '6px 16px',
                border: 'none',
                borderTop: '0.5px solid #E2E2E2',
                background: 'transparent',
                color: '#888888',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Clear
            </button>
          </>
        )}

        {/* Date dropdown — reuses shared Dropdown with inline mode */}
        {activeChip === 'dueDate' && (
          <>
            <Dropdown
              type="dueDate"
              projects={[]}
              query={query}
              onSelect={handleDateSelect}
              mode="inline"
            />
            <button
              type="button"
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '6px 16px',
                border: 'none',
                borderTop: '0.5px solid #E2E2E2',
                background: 'transparent',
                color: '#888888',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build and verify manually**

Run: `npm run build --workspace=@sift/shared && npm run build --workspace=web`
Expected: Build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ProjectEditPalette.tsx apps/web/src/components/layout/AppLayout.tsx
git commit -m "feat(web): add @c emoji chip to ProjectEditPalette"
```

---

### Task 5: TaskRow — Show Emoji + Project Name

**Files:**
- Modify: `apps/web/src/components/TaskRow.tsx:4, 27, 86-95`
- Modify: `apps/web/src/__tests__/TaskRow.test.tsx`

- [ ] **Step 1: Write failing tests for project display in TaskRow**

Add these tests to `apps/web/src/__tests__/TaskRow.test.tsx`:

```tsx
  it('shows emoji and italic project name by default', () => {
    render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    const projectLabel = screen.getByTestId('project-label');
    expect(projectLabel).toBeInTheDocument();
    expect(projectLabel.textContent).toContain('📚');
    expect(projectLabel.textContent).toContain('General');
    // Check italic styling
    const nameEl = projectLabel.querySelector('em');
    expect(nameEl).toBeInTheDocument();
  });

  it('hides project label when showProject is false', () => {
    render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
        showProject={false}
      />
    );
    expect(screen.queryByTestId('project-label')).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run apps/web/src/__tests__/TaskRow.test.tsx`
Expected: FAIL — `project-label` not found, `showProject` prop unknown

- [ ] **Step 3: Add showProject prop and project label to TaskRow**

In `apps/web/src/components/TaskRow.tsx`:

Add `showProject` to the props interface:
```ts
export interface TaskRowProps {
  task: Task;
  project: Project;
  space: Space;
  isFocused: boolean;
  onFocus: () => void;
  onToggle?: () => void;
  exiting?: boolean;
  index?: number;
  showProject?: boolean;
}
```

Update the component signature to destructure `showProject = true`:
```ts
export default function TaskRow({ task, project, space, isFocused, onFocus, onToggle, exiting = false, index = 0, showProject = true }: TaskRowProps) {
```

Add the project label JSX, right before the `{task.dueDate && (` block (around line 96):

```tsx
      {showProject && (
        <span
          data-testid="project-label"
          className="text-[10px] shrink-0 font-mono text-muted inline-flex items-center gap-1 max-w-[100px] overflow-hidden"
        >
          {project.emoji && <span className="text-[12px] shrink-0">{project.emoji}</span>}
          <em className="truncate">{project.name}</em>
        </span>
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run apps/web/src/__tests__/TaskRow.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/TaskRow.tsx apps/web/src/__tests__/TaskRow.test.tsx
git commit -m "feat(web): show emoji + italic project name in TaskRow"
```

---

### Task 6: ProjectsView — `C` Shortcut + Emoji in Header + showProject={false}

**Files:**
- Modify: `apps/web/src/views/ProjectsView.tsx:144-150, 199-215, 230-240`

- [ ] **Step 1: Add `C` shortcut for emoji editing**

In `apps/web/src/views/ProjectsView.tsx`, in the project-mode keydown handler, after the `D` shortcut block (around line 150), add:

```ts
            if (e.key === 'c' || e.key === 'C') {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('sift:edit-project', { detail: { project: focusedProject, field: 'emoji' } }));
              return;
            }
```

- [ ] **Step 2: Show emoji in project header**

In the project header JSX (around line 214), update the project name span to include the emoji:

From:
```tsx
                      <span className={`font-mono text-[11px] ${isFocusedProject ? 'text-accent' : 'text-text'}`}>
                        {project.name}
                      </span>
```
To:
```tsx
                      <span className={`font-mono text-[11px] ${isFocusedProject ? 'text-accent' : 'text-text'}`}>
                        {project.emoji && <span className="mr-1.5">{project.emoji}</span>}
                        {project.name}
                      </span>
```

- [ ] **Step 3: Pass showProject={false} to TaskRow in ProjectsView**

In the expanded tasks section (around line 232), update the TaskRow call to add `showProject={false}`:

```tsx
                        <TaskRow
                          key={task.id}
                          task={task}
                          project={project}
                          space={space}
                          isFocused={navMode === 'task' && focusedId === task.id}
                          onFocus={() => { setNavMode('task'); setFocusedId(task.id); }}
                          onToggle={() => handleToggle(task)}
                          exiting={exitingIds.has(task.id)}
                          showProject={false}
                        />
```

- [ ] **Step 4: Build and run all tests**

Run: `npm run build --workspace=@sift/shared && npm run test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/views/ProjectsView.tsx
git commit -m "feat(web): add C shortcut for emoji, show emoji in project header, hide project label in expanded tasks"
```

---

### Task 7: Final Integration Test

- [ ] **Step 1: Run the full build**

Run: `npm run build`
Expected: All packages build successfully

- [ ] **Step 2: Run all tests**

Run: `npm run test`
Expected: All tests PASS

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`

Verify:
1. Open the app — existing projects should have random emojis (migration)
2. Go to Projects view — emoji shows before project name
3. Focus a project, press `C` — ProjectEditPalette opens with emoji picker
4. Pick an emoji — it updates the project
5. Go to Today view — tasks show emoji + italic project name on the right
6. Create a new project — it gets a random emoji
7. Type `@c` in the project name field — switches to emoji picker
8. Tab cycles through name → emoji → due date

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: integration fixes for project emoji feature"
```
