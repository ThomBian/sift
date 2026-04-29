# Month View — Design Spec

**Date:** 2026-04-29
**Status:** Approved for planning

## Goal

Add a Month view as a sibling layout to Week view. Users can scan a full month at a glance with per-day task counts, select any day to see its tasks below the calendar, and toggle between Week and Month with a single key.

## Architecture

A new `MonthView.tsx` lives next to `WeekView.tsx` and shares the same shell shape: top bar, scrollable body, hint bar. Both routes (`/week`, `/month`) belong to a single Topbar tab (label: "Calendar"). The `aria-current="page"` highlight matches whichever of the two routes is active.

A new hook `useMonthTasks(anchorMonth, mode)` mirrors `useWeekTasks` and returns exactly **42** day cells (6 rows × 7 cols) so the calendar height is constant for every month. Each cell:

```ts
type MonthDay = {
  date: Date;            // local day
  isCurrentMonth: boolean;
  isToday: boolean;
  count: number;         // tasks matching `mode` for this date
  active: Task[];
  completed: Task[];
};
```

Mode (`working` / `due` / `completed`) is the same enum used by `useWeekTasks` and filters both the per-day count and the tasks panel content.

## Routing & State

- New route `/month` registered in `AppLayout`. Topbar tab "Calendar" is active for both `/week` and `/month`.
- `V` (no modifiers, not in INPUT/TEXTAREA) toggles between `/week` and `/month` via `useNavigate`. Listener lives at `AppLayout`. No-op on other routes.
- `MonthView` owns local state `anchorMonth: Date` (first of the visible month) and `selectedDate: Date`. Default `selectedDate` is today if it's in the visible month, otherwise the first of the month.
- `T` resets `anchorMonth` to the current month and `selectedDate` to today.
- `M` cycles mode (`working → due → completed`), unchanged from Week.
- No persistence across reloads (matches Week).

## Layout

```
┌─────────────────────────────────────────────┐
│ MonthTopBar:  ← April 2026 →   working ●○○  │
├─────────────────────────────────────────────┤
│ M  T  W  T  F  S  S                          │
│ 30 31  1  2  3  4  5     ← row 1             │
│  6  7 [8] 9 10 11 12     ← row 2 (today)     │
│ 13 14 15 16 17 18 19     ← row 3             │
│ 20 21 22 23 24 25 26     ← row 4             │
│ 27 28 29 30  1  2  3     ← row 5             │
│  4  5  6  7  8  9 10     ← row 6 (always)    │
├─────────────────────────────────────────────┤
│ Wed, Apr 8 · 5 tasks · 2 done                │
│ ☐ Polish keyboard nav for week view  🚀 Sift │
│ ☐ Wire month grid to live counts     🚀 Sift │
│ ☐ Reply to design feedback           📬 Inbox│
└─────────────────────────────────────────────┘
```

The grid is fixed at **6 rows × 7 columns** for every month so the view never resizes. Leading days come from the previous month, trailing days from the next month; if a 28-day month starts on Monday, two full weeks of trailing dimmed days fill the bottom.

### MonthTopBar

Mirrors `WeekTopBar`. Centered selector reads `← April 2026 →` (full month name + year). Mode RadioGroup (`working` / `due` / `completed`) stays on the right exactly as in `WeekTopBar`. Selector is a single focusable element marked `data-month-header`.

### Day cell

- Day number top-left in `JetBrains Mono`, 11px, weight 500.
- Bottom of cell: a single thin orange pip whose width scales with count (1–2 → 8px, 3–4 → 14px, 5+ → full row width) plus a numeric count in `JetBrains Mono` 9px on the right when count > 0.
- All 42 cells render their pip + count regardless of whether they are in the current month.
- Today: subtle peach background `#FFF6F0`.
- Focused day: 2px `#FF4F00` inset border + `box-shadow: 0 0 8px rgba(255,79,0,0.4)` laser-focus glow.
- Current month: text `#333`, background `#FFFFFF`.
- Sibling month: text `#BFBFBF`, background `#FAFAFA` (pip + count render the same color as current-month cells).
- 0.5px `#E2E2E2` borders between cells, zero border-radius.

### Tasks panel

- Below the calendar grid. Reuses `TaskRow` with `showProject={true}`.
- Header line: `<weekday>, <month> <day> · <n> tasks · <m> done` in `Geist Sans` 12px / mono meta.
- Empty state: `"No tasks for this day"` in muted mono.
- Calendar grid takes natural height; the tasks panel is `flex-1` with `overflow-y-auto`. The view itself never scrolls — only the panel does.

## Keyboard Navigation

```
Topbar tab "Calendar"
   ↓ ArrowDown
MonthTopBar header  ──── ←/→ prev/next month
   ↓ ArrowDown
Calendar day (today selected by default)
   ←/→  day-by-day, wraps within row
   ↑/↓  between weeks
   ↑ at first row → MonthTopBar header
   → past cell 42 → next month, focus day 1
   ← past cell 1  → prev month, focus last day
   M cycle mode · T jump today · V → /week
   Enter or Tab → descend to tasks panel
   ↓ from last row of grid → also descends to tasks panel
        ↓
Tasks panel (first task focused)
   ↑/↓ between tasks
   ↑ at first task → return to selected calendar day
   Shift+Tab     → return to selected calendar day
   D/W/P/E/U     → open CommandPalette pre-focused on chip (same as Week)
   Enter         → toggle done / undone
   Backspace/Del → archive
```

**Live focus = selection.** Whenever a calendar day is focused, the tasks panel reflects that day's tasks immediately. Descending into the panel is always an explicit gesture (`Enter`, `Tab`, or `↓` from the bottom row).

**Sibling-month focus.** Arrowing onto a sibling-month day keeps `anchorMonth` unchanged and the day stays focused with its dimmed styling. Pushing past the last (cell 42) or first (cell 1) edge advances `anchorMonth` by one and lands on day 1 / the last day of the new month.

## Hint Bar

`HintBar` extends `focusState` with `"month"` and `"month-task"`:

- `month` (calendar day focused): `↑↓←→ navigate · enter / tab open day · m mode · t today · v week`
- `month-task` (task focused in panel): same `D/W/P/E/U` set as week + `↑ back to day` hint

## Out of scope

- Drag-to-reschedule on the calendar
- Multi-day task spans (Sift tasks are single-day today)
- Mini-calendar in sidebar
- Persisting the last view across reloads
- Mobile-specific touch interactions
- Click-to-jump from sibling-month day directly to that month (only keyboard edge-overflow does this)

## Testing

- `useMonthTasks.test.ts` — produces exactly 42 days for every month (incl. Feb-non-leap-Mon-start), counts per mode, completed mode shows tasks completed on each visible date, sibling-month cells include their counts.
- `MonthView.test.tsx` — renders today selected by default, arrows move day focus and update the panel live, Enter/Tab descends to first task, ↑ from first task returns to selected day, V navigates to `/week`, M cycles mode, T resets to today, edge-overflow advances `anchorMonth`.
- `AppLayout` test — V toggles `/week` ↔ `/month` only on those routes and only outside inputs.
