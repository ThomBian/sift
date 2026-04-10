# Spec: Date Picker with Calendar & Task Counts

**Date:** 2026-04-10
**Status:** Draft

## Background
The current date selection in Sift relies on a text-based "Quick Picks" list or freeform typing. Users need a more visual way to see their schedule, understand their "busy-ness" per day, and navigate dates easily using both keyboard and mouse.

## Requirements
- **Visual Calendar:** A full month-view calendar (Day/Month) replacing the current "Quick Picks" list.
- **Smart Selection:** Typing in the input field should "search" and highlight dates.
    - "to" / "today" -> Today
    - "tom" -> Tomorrow
    - "mo" / "monday" -> Next Monday (and similarly for other weekdays)
    - "Apr 15" / "4/15" -> Specific date parsing.
- **Task Counts:** Display the number of "not done" tasks planned for each day directly on the calendar cells.
- **Keyboard Navigation:** 
    - Arrow keys (Up/Down/Left/Right) move the selection within the calendar grid.
    - Enter confirms the selected date.
- **Ubiquity:** Available in Task creation/edit (Command Palette, Input Bar) and Project creation/edit (Project Edit Palette).
- **Aesthetic:** Minimal, mono, and consistent with the "laser-focus" design system.

## Architecture

### 1. Library Selection
- **`react-day-picker` (v8+):** Used in `@sift/shared`. It provides the headless calendar logic and accessibility, while we provide the custom CSS/Tailwind styling.

### 2. Data Flow
- **`useTaskCounts` Hook:** A new hook in `apps/web` that queries the Dexie `tasks` table for all tasks where `status !== 'done'`.
    - Returns a map: `{ [isoDate: string]: number }`.
- **Prop Injection:**
    - `SmartInput` and `ProjectEditPalette` will fetch the task counts and pass them down to `Dropdown`.
    - `Dropdown` passes these counts to `react-day-picker` as "modifiers" or custom components for the Day cell.

### 3. Smart Parsing Logic
- Update `parseLooseDateQuery` or create a new `matchBestDate(query, referenceDate)` utility.
- It will prioritize:
    1. Exact keyword matches (Today, Tomorrow).
    2. Weekday prefix matches (Next [Weekday]).
    3. Standard date parsing (Month Day).

### 4. Components
- **`Calendar.tsx` (New):** A wrapper around `react-day-picker` in `@sift/shared/src/Calendar`.
- **`Dropdown.tsx` (Update):** Host the new `Calendar` component instead of the `QuickPicks` list.
- **`useSmartInput.ts` (Update):** Handle the orchestration between input typing, calendar highlighting, and grid keyboard navigation.

## Interaction Design
1. User focuses a date chip (e.g., `@d` or `@w`).
2. The calendar appears (inline or floating).
3. As the user types "mo", the calendar highlights the next Monday and scrolls/pans to that month if necessary.
4. User can use Arrow keys to move the selection to Tuesday, then press Enter.
5. Task counts appear as a small number in the corner of each day cell, helping the user avoid over-scheduling.

## Testing Strategy
- **Unit Tests:** Verify `matchBestDate` logic with various queries.
- **Component Tests:** Ensure `react-day-picker` renders correctly with our custom styles and task counts.
- **Integration Tests:** Verify keyboard navigation (Arrows/Enter) in the `SmartInput` with the calendar open.
