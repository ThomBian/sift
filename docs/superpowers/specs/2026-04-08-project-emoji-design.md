# Project Emoji — Design Spec

## Goal

Make it easier for users to visually identify which project a task belongs to, especially in flat views (Today, Inbox) where tasks from different projects are interleaved.

## Approach

Add an `emoji` field to `Project`. Each project gets a random emoji on creation from a curated pool. Users can change it via the `@c` chip in `ProjectEditPalette` or the `C` keyboard shortcut in ProjectsView. The emoji + project name appear in TaskRow metadata in flat views (Today, Inbox) but not in ProjectsView where tasks are already nested under their project.

---

## 1. Data Model

Add `emoji` to the `Project` interface in `packages/shared/src/types.ts`:

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

- `string | null` — null means no emoji (defensive, should not happen with random default)
- Dexie schema bump to **version 3** in `packages/shared/src/db.ts` — no new index needed, just the field addition
- `_seed()` assigns a random emoji to the default "General" project
- Space keeps its `color` field unchanged

## 2. Curated Emoji Pool

A constant array of ~50 emojis organized by category, exported from a new file `packages/shared/src/emojiPool.ts`:

| Category | Emojis |
|----------|--------|
| Work | 💼 📊 📈 🎯 💡 ⚡ 🔧 📋 |
| Creative | 🎨 ✏️ 🎬 📷 🎵 🎭 |
| Tech | 💻 🖥️ 🤖 🧪 🔬 ⚙️ |
| Nature | 🌱 🌊 🏔️ 🌙 ☀️ 🌿 |
| Objects | 📚 🏠 ✈️ 🚀 💎 🎁 🔑 |
| Symbols | ⭐ ❤️ 🔥 ✅ 🏁 🎲 🎈 |
| Animals | 🐛 🦊 🐙 🦋 🐝 |

Exports:
- `EMOJI_POOL: Array<{ category: string; emojis: string[] }>` — for the picker grid
- `getRandomEmoji(): string` — picks one at random for project creation

## 3. EmojiPicker Component

New component: `packages/shared/src/EmojiPicker/EmojiPicker.tsx`

**Layout:**
- No dedicated search input — the palette's main input field acts as the filter when `@c` is active (same pattern as date chips showing "Pick a date…")
- Grid of emoji cells — ~8 columns, each cell a square button (~32px)
- Category headers (mono, 9px, uppercase, muted) separating groups
- Scrollable if content exceeds max height
- **Empty state:** when the query matches no emojis, show a centered muted message (e.g. "No emojis found") in the grid area

**Keyboard navigation:**
- Arrow keys move focus through the grid (left/right/up/down, wrapping at row boundaries)
- Enter selects the focused emoji
- Escape cancels, returns focus to previous chip
- The main input filters the grid in real-time via the `query` prop

**Styling (per design rules):**
- No border-radius (zero-radius constraint)
- Focused cell gets `#FF4F00` accent border with `box-shadow: 0 0 8px rgba(255, 79, 0, 0.4)` (laser focus)
- Category headers: `JetBrains Mono`, 9px, uppercase, tracking `0.2em`, `#888`
- Border: `0.5px solid #E2E2E2`

**Emoji name mapping:** A static map of emoji → searchable keywords (e.g., `"🚀": ["rocket", "launch", "ship"]`). Used for search filtering. Stored alongside the pool in `emojiPool.ts`.

## 4. ProjectEditPalette Changes

File: `apps/web/src/components/ProjectEditPalette.tsx`

**New `@c` chip** added alongside the existing `@d` chip:
- Chip order: `@c` (emoji) | `@d` (due date)
- When emoji is set: chip displays the emoji character
- When unset: chip shows `@c icon` in muted style
- Tab cycle: name → emoji → due date → name

**`@c` inline trigger:** Typing `@c` while in the name field switches to the emoji chip (same pattern as `@d` for due date).

**When `@c` is active:** The EmojiPicker renders inline below the input bar (same `mode="inline"` pattern as the date Dropdown).

**`initialField` prop** extended to accept `'name' | 'emoji' | 'dueDate'` (currently `'name' | 'dueDate'`).

## 5. ProjectsView — `C` Shortcut

File: `apps/web/src/views/ProjectsView.tsx`

In the project-mode keydown handler, add `C`:
- When a project is focused and `C` is pressed: dispatch `sift:edit-project` event with `{ project, field: 'emoji' }`
- `AppLayout` receives this and opens `ProjectEditPalette` with `initialField: 'emoji'`

**ProjectsView project header** — show emoji before project name:
```
🎨 Design                               Apr 10
```

## 6. TaskRow Changes

File: `apps/web/src/components/TaskRow.tsx`

**New prop:** `showProject?: boolean` (default `true`)

**When `showProject` is true** (Today view, Inbox view):
- Render emoji + italic project name on the right side, before the due date
- Style: `JetBrains Mono`, 10px, `#888` (muted), italic for the name
- Emoji at ~12px, native rendering
- Project name truncated with ellipsis, max-width ~100px
- Task title (`flex-1`) takes priority — project label shrinks first

**When `showProject` is false** (ProjectsView):
- No emoji/name rendered (tasks are already under their project header)

**Layout:**
```
[space dot] [checkbox] [task title]     [emoji name] [due date]
```

## 7. Dexie Migration

In `packages/shared/src/db.ts`, add version 3:

```ts
this.version(3).stores({
  projects: 'id, spaceId, dueDate, updatedAt, synced',
}).upgrade(tx => {
  return tx.table('projects').toCollection().modify(project => {
    project.emoji = getRandomEmoji();
  });
});
```

Existing projects get a random emoji during migration. New projects get one at creation time.

## 8. Files Changed

| File | Change |
|------|--------|
| `packages/shared/src/types.ts` | Add `emoji` to `Project` |
| `packages/shared/src/db.ts` | Version 3 migration, seed update |
| `packages/shared/src/emojiPool.ts` | **New** — curated pool, random picker, keyword map |
| `packages/shared/src/EmojiPicker/EmojiPicker.tsx` | **New** — grid picker component |
| `packages/shared/src/index.ts` | Export new modules |
| `apps/web/src/components/ProjectEditPalette.tsx` | Add `@c` chip, EmojiPicker integration |
| `apps/web/src/components/TaskRow.tsx` | Add `showProject` prop, render emoji + italic name |
| `apps/web/src/views/ProjectsView.tsx` | `C` shortcut, emoji in project header, pass `showProject={false}` |
| `apps/web/src/views/TodayView.tsx` | No change (TaskRow default shows project) |
| `apps/web/src/views/InboxView.tsx` | No change (TaskRow default shows project) |
| Test fixtures | Add `emoji` field to Project fixtures |
