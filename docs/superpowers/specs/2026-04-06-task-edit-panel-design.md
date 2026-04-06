# Task Edit Panel Design

**Date:** 2026-04-06  
**Status:** Approved

## Overview

When a task is focused via keyboard navigation, the user can trigger contextual editing actions via single keystrokes. An editing palette opens anchored to the bottom of the view — full width, no overlay/backdrop — showing the task's current values and a dropdown for the triggered field. The task list remains visible with the focused row still highlighted.

## Keyboard Shortcuts (task focused)

| Key | Action |
|-----|--------|
| `D` | Open edit palette, focus due date chip |
| `W` | Open edit palette, focus working date chip |
| `P` | Open edit palette, focus project chip |
| `E` | Open edit palette, focus title input |
| `Enter` | Toggle done (existing) |
| `Backspace` | Archive (existing) |
| `Esc` | Close palette if open, else deselect task |

## Edit Palette

The palette **replaces the HintBar** when open. It consists of two rows anchored at the bottom of the view:

**Context row** (thin, muted):
- Left: `EDITING · <task title>` (monospace, uppercase, muted)
- Right: `esc to cancel · ⌘↩ to save`

**Input row** (full-width, 44px tall):
- Title input (pre-populated, always editable)
- Vertical 1px divider
- Chips: `@p <project>`, `@d <due date>`, `@w <working date>` — same chip UI as SmartInput
- The chip matching the triggered key is auto-focused (orange border)

**Dropdown row** (below input row, full width):
- Appears only for `D`, `W`, `P` (not `E`)
- For `D`/`W`: quick-select list — Today, Tomorrow, Next week, Clear
- For `P`: project list with space color dots, filterable by typing in the input
- Arrow keys navigate the dropdown; Enter selects and saves; Esc cancels

**Save behaviour:**
- Selecting a dropdown item immediately saves that field and closes the palette
- `⌘↩` saves all edited fields at once
- `Esc` discards all changes and closes

## HintBar — Context-Aware States

The HintBar renders two distinct hint sets based on whether a task is focused:

**Default state** (no task focused):
```
⌘K New task   ↑↓ Navigate   ←→ Switch view
```

**Task focused state:**
```
Enter Done   D Due date   W Today   P Project   E Edit   ⌫ Archive   Esc Deselect
```

`Enter`, `D`, `W`, `P`, `E` render with orange-tinted kbd styling to signal they are active.

## Component Architecture

### New: `TaskEditPalette`
- Props: `task: Task`, `defaultField: 'title' | 'dueDate' | 'workingDate' | 'project'`, `onSave(patch)`, `onCancel()`
- Renders context row + input row + conditional dropdown
- Internally reuses the chip UI from `SmartInput` for visual consistency
- Manages its own local state (edits are not committed until save)

### Modified: `HintBar`
- Accept an optional `taskFocused: boolean` prop
- Render the task-focused hint set when true

### Modified: views (`InboxView`, `TodayView`, `ProjectsView`)
- Listen for `D`, `W`, `P`, `E` keydown when `focusedId !== null` and palette is not already open
- Track `editField: 'title' | 'dueDate' | 'workingDate' | 'project' | null` in local state
- When `editField !== null`, render `<TaskEditPalette>` in place of the bottom bar
- Pass `taskFocused={focusedId !== null && editField === null}` to HintBar

### Modified: `AppLayout`
- Listen for `sift:task-focused` (dispatched by views when `focusedId` changes) and pass the boolean to `HintBar`
- Views dispatch `window.dispatchEvent(new CustomEvent('sift:task-focused', { detail: { focused: true/false } }))` alongside setting `focusedId`

## Data Flow

```
keydown (D/W/P/E)
  → view sets editField
    → TaskEditPalette renders at bottom
      → user selects/types
        → onSave(patch) → db.tasks.update() [optimistic, synced: false]
          → palette closes, focusedId retained
```

Escape at any point: `editField → null` (palette closes, task stays focused).

## Out of Scope

- Mouse/click interaction to open the edit palette (keyboard-only for now)
- Bulk editing multiple tasks
- Reordering fields in the chip row
