# Week overview — design spec

**Date:** 2026-04-22  
**Status:** Approved  
**Scope:** Web app (`apps/web`), local-first Dexie data (existing `Task` model).

## Goals

1. **Dedicated route** `/week` — calendar week as the primary lens.
2. **Per day:** show **all** tasks that belong to that day for the active grouping (no hiding completed items).
3. **Within each day:** **active** tasks first (not `done` / not terminal), **completed** second (`status === "done"` or archived-with-completion per existing `taskCountsAsDone` semantics in `useTasks.ts`).
4. **Mode toggle:** switch grouping between `**workingDate`** and `**dueDate**` — toggle switch UI with `#FF4F00` knob and laser-focus glow; `M` key cycles it.
5. **Week boundaries:** **Monday–Sunday**, local timezone, using the same local-day spirit as `useTodayTasks` (`startOfDay` / `date-fns`).
6. **Keyboard:** full vertical spine — Topbar nav ↕ week header ↕ task grid; `T` jumps to current week.
7. **Navigation:** user can move to **any** week via header arrows; `/week` is part of the global view cycle.

## Non-goals (v1)

- Historical "what was true last week if I moved dates" — cohorts reflect **current** DB fields only.
- Sync/schema changes — reuse existing `Task` fields.
- Extension / mobile-specific layouts beyond horizontal scroll on narrow viewports.

## Data rules

### Week window

- `weekStart = startOfWeek(anchorMonday, { weekStartsOn: 1 })` (Monday).
- `weekEnd = endOfWeek(anchorMonday, { weekStartsOn: 1 })` (Sunday end of day).
- **Anchor:** the Monday 00:00 local of the week being viewed (state in `WeekView`).

### Grouping mode

- **Working mode:** task appears on day `D` iff `task.workingDate != null` and `startOfDay(task.workingDate)` equals `D`.
- **Due mode:** task appears on day `D` iff `task.dueDate != null` and `startOfDay(task.dueDate)` equals `D`.

### Tasks without a date for the active mode

- Tasks with no date for the active mode are **not shown** in week view (v1).

### Terminal / completed

- **Active bucket:** `status === "inbox"` or `status === "todo"`.
- **Completed bucket:** `status === "done"`.
- **Archived tasks (`status === "archived"`):** excluded entirely from week view — not shown in any bucket.

## UI structure

### Top bar (within view)

- **Week range header** (focusable div): e.g. `Mon Apr 14 – Sun Apr 20, 2026`.
- **Mode toggle:** toggle switch — `#FF4F00` knob with `box-shadow: 0 0 6px rgba(255,79,0,0.4)` glow. Labels **WORKING** / **DUE** flank the switch. Left = Working (knob left), Right = Due (knob right).
- **No "This week" button** — `T` key serves this purpose.

### Grid

- **Seven columns** Mon → Sun.
- Desktop: equal-height columns (all stretch to tallest), whole page scrolls vertically.
- Narrow viewports: horizontal scroll to preserve the 7-column division.
- Each column: **day label** (weekday + date), then **active** tasks, then **completed** tasks (spacing separator only — no new tokens).
- **Today's column:** day label in `#FF4F00` with a 4×4px dot (`box-shadow: 0 0 4px rgba(255,79,0,0.5)`) + column background `#111` (vs default `#0a0a0a`).

### Reuse

`TaskRow`, project line, late-due styling, focus ring / laser-focus rules from `CLAUDE.md`.

## Component tree

```
WeekView                          apps/web/src/views/WeekView.tsx
  data-week-view-root             ← boundary for capture listener
  │
  ├─ WeekTopBar                   components/week/WeekTopBar.tsx
  │    ├─ WeekRangeHeader         focusable div — ←/→ change week, ↑ → Topbar nav, ↓ → first task
  │    └─ ModeToggle              toggle switch, M key cycles
  │
  ├─ WeekGrid                     components/week/WeekGrid.tsx
  │    └─ DayColumn ×7            components/week/DayColumn.tsx
  │         ├─ DayHeader          date label; orange dot + #111 bg if today
  │         ├─ active TaskRow ×n
  │         └─ completed TaskRow ×n
  │
```

## Data hook

New file: `apps/web/src/hooks/useWeekTasks.ts`

```ts
type WeekMode = "working" | "due";

interface DayBucket {
  date: Date;        // midnight local, Mon–Sun
  active: Task[];
  completed: Task[];
}

interface WeekTasksResult {
  days: DayBucket[];  // always 7, Mon → Sun
}

function useWeekTasks(anchorMonday: Date, mode: WeekMode): WeekTasksResult
```

- Single `useLiveQuery` over `db.tasks` + `db.projects` (for sort tie-breaking).
- Active: `status === "inbox" | "todo"`. Completed: `status === "done"`. Archived excluded entirely.
- Sort within each bucket: `compareByDueDateThenProject`.

## Keyboard model


| Context                              | Key                    | Action                                                                              |
| ------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------- |
| Topbar nav focused                   | `↓`                    | Focus week range header                                                             |
| Week header focused                  | `↑`                    | Focus Topbar nav                                                                    |
| Week header focused                  | `↓`                    | Focus first task in first non-empty day                                             |
| Week header focused                  | `←` / `→`              | Previous / next week (`anchorMonday ± 7 days`)                                      |
| First task of any day focused        | `↑`                    | Focus week range header                                                             |
| 2nd+ task of any day focused         | `↑`                    | Move up within current day's list                                                   |
| Any task focused                     | `↓`                    | Move down within current day's list (active first, completed after)                 |
| Task focused                         | `Tab` / `Shift+Tab`    | Next / previous day column (first task, or day header if empty)                     |
| Task focused                         | `Enter`                | Toggle done                                                                         |
| Task focused                         | `Backspace` / `Delete` | Archive                                                                             |
| Task focused                         | `D/W/P/E`              | Open CommandPalette pre-focused on that chip                                        |
| Anywhere (not input, palette closed) | `M`                    | Cycle Working → Due → Working                                                       |
| Anywhere (not input, palette closed) | `T`                    | Reset `anchorMonday` to current week                                                |
| Conflict guard                       | `←/→` capture          | `WeekView` stops propagation when `activeElement` is inside `[data-week-view-root]` |


## AppLayout changes

- `VIEWS` becomes `["/inbox", "/today", "/week", "/projects"]`.
- `Topbar` gets a `Week` `NavTab` (no count badge).
- `Topbar` `↓` handler: when a tab inside the main nav is focused and `location.pathname === "/week"`, dispatch focus to `[data-week-header]`.

## HintBar

New `focusState: "week"` variant — shows: `← → week · M mode · T today`.

## Testing

- Unit: week boundary (Monday start), task in both modes, unscheduled bucket, active-before-completed ordering, `completedAt` archived case.
- Keyboard: header `←/→` does not navigate route; `T` resets anchor to current week; `↑` from header reaches Topbar nav; `↓` from header reaches first task; `↑` from first task of any day reaches header.

## Implementation touchpoints

- `apps/web/src/App.tsx` — register `/week` route + `WeekView`.
- `apps/web/src/components/layout/AppLayout.tsx` — add `/week` to `VIEWS`.
- `apps/web/src/components/layout/Topbar.tsx` — add `Week` `NavTab`; add `↓` keydown handler to nav.
- `apps/web/src/hooks/useWeekTasks.ts` — new hook.
- `apps/web/src/views/WeekView.tsx` — new view.
- `apps/web/src/components/week/` — `WeekTopBar`, `WeekGrid`, `DayColumn`, `UnscheduledSection`.

---

**Self-review:** No TBD placeholders. Keyboard model complete with bidirectional vertical nav. Grid layout, toggle style, today highlight all explicit. Cross-column Left/Right dropped in favour of Tab/Shift+Tab. `/week` in global route cycle confirmed.