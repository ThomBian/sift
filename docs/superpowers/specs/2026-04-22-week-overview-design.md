# Week overview — design spec

**Date:** 2026-04-22  
**Status:** Draft for review  
**Scope:** Web app (`apps/web`), local-first Dexie data (existing `Task` model).

## Goals

1. **Dedicated route** `/week` — calendar week as the primary lens.
2. **Per day:** show **all** tasks that belong to that day for the active grouping (no hiding completed items).
3. **Within each day:** **active** tasks first (not `done` / not terminal), **completed** second (`status === "done"` or archived-with-completion per existing `taskCountsAsDone` semantics in `useTasks.ts`).
4. **Mode toggle:** switch grouping between **`workingDate`** and **`dueDate`** (shortcut + visible control).
5. **Week boundaries:** **Monday–Sunday**, local timezone, using the same local-day spirit as `useTodayTasks` (`startOfDay` / `date-fns`).
6. **Keyboard:**
   - When **week range header** is focused: **`ArrowLeft` / `ArrowRight`** → previous / next week (same Monday-start rule).
   - When focus is in the **day grid / task rows**: arrow keys drive **task and day navigation** (see below); they **must not** trigger the global **view-switch** (←/→ between Inbox / Today / Projects / Week).
7. **Navigation:** user can move to **any** week via header arrows (increment/decrement by 7 days from current week start); no requirement for “today only” lock.

## Non-goals (v1)

- Historical “what was true last week if I moved dates” — cohorts reflect **current** DB fields only.
- Sync/schema changes — reuse existing `Task` fields.
- Extension / mobile-specific layouts beyond responsive stacking if needed.

## Data rules

### Week window

- `weekStart = startOfWeek(todayOrAnchor, { weekStartsOn: 1 })` (Monday).
- `weekEnd = endOfWeek(anchor, { weekStartsOn: 1 })` (Sunday end of day).
- **Anchor:** the Monday 00:00 local of the week being viewed (state in `WeekView`).

### Grouping mode

- **Working mode:** task appears on day `D` iff `task.workingDate != null` and `startOfDay(task.workingDate)` equals `D`.
- **Due mode:** task appears on day `D` iff `task.dueDate != null` and `startOfDay(task.dueDate)` equals `D`.

### Tasks without a date for the active mode

- **`workingDate === null`** in Working mode, or **`dueDate === null`** in Due mode: show in a single **“Unscheduled”** (Working) or **“No due date”** (Due) section **below** the 7-day grid (full width), same **active-then-completed** ordering inside that section.

### Terminal / completed

- **Active bucket:** `status` not in `done` / `archived` (align with other views).
- **Completed bucket:** `status === "done"` **or** (`status === "archived"` && `completedAt != null`) — match `taskCountsAsDone` / product consistency.

### Archived without completion

- Treat as **active** for ordering unless product elsewhere treats them as done; if ambiguous, match **Projects** list behavior for archived tasks. (Implementation: follow the same rule as `taskCountsAsDone` inverse for “active” lists.)

## UI structure

1. **Top bar (within view):**
   - **Week range header** (focusable): e.g. `Mon Apr 14 – Sun Apr 20, 2026` (locale-formatted).
   - **Mode control:** segmented or toggle — labels **Working** / **Due**.
   - Optional: subtle **“This week”** jump control (button or `T`) — nice-to-have; not required for v1 if week arrows suffice.

2. **Grid:**
   - **Seven columns** Mon → Sun (responsive: horizontal scroll on narrow viewports, or stacked days — implementation chooses minimal viable **scroll horizontally** to preserve “divided by days”).
   - Each column: **day label** (weekday + date), then **active** tasks, then **completed** tasks (visual separator optional: hairline or spacing only; no new border-radius tokens).

3. **Reuse:** `TaskRow`, project line, late-due styling, focus ring / laser-focus rules from `CLAUDE.md`.

## Keyboard model

### Conflicts with global `AppLayout`

- Today, **`ArrowLeft` / `ArrowRight`** switch routes. **Week view** must **take precedence** when:
  - focus is on the **week header**, or
  - focus is inside the **week grid** (task list / day column).
- Mechanism (implementation detail): e.g. `WeekView` registers a capture listener, or `AppLayout` excludes `/week` when `document.activeElement` is inside a marked container `[data-week-view-root]` — pick one pattern and use consistently.

### Week header (focused)

- **`ArrowLeft`:** previous week (`anchorMonday -= 7 days`).
- **`ArrowRight`:** next week (`anchorMonday += 7 days`).
- **`Tab`:** move focus into the day grid (first focusable task or first day column per defined order).

### Day grid / tasks (focused)

- **`ArrowUp` / `ArrowDown`** (and **`j` / `k`** if other views use them): move **within** the current day’s list order — **all active tasks** (top to bottom), then **completed** (top to bottom).
- **`ArrowLeft` / `ArrowRight`:** move focus to the **same logical index** in the **previous / next day’s** column (Mon ↔ Tue ↔ … ↔ Sun). If the target day has **fewer** tasks, clamp to **last** task or **no focus** fallback (implementation: clamp to last index; if column empty, skip to next day with tasks or land on day header — choose **clamp to nearest task in that direction** for predictability).
- **`Enter` / `Backspace` / `Delete` / `D` / `W` / `P` / `E`:** match **Today** / **Inbox** task row behavior (dispatch `sift:edit-task`, toggle done, archive).

### Mode shortcut

- **`M`** (when not typing in an input): cycle **Working → Due → Working** (only when Week view is active and palette closed). Document in `HintBar` for Week view.

## Data loading

- New hook e.g. `useWeekTasks(anchorMonday, mode)`:
  - `useLiveQuery` on `db.tasks` (and projects if sort needs names), filter tasks that intersect the week **or** the unscheduled bucket for the mode.
  - Derive seven day keys + one overflow list client-side; sort inside buckets: existing `compareByDueDateThenProject` or day-local variant.

## Testing

- Unit tests: week boundary (Monday start), task in both modes, unscheduled bucket, ordering active-before-done, `completedAt` archived case.
- Keyboard: header week change does not navigate route; grid arrows do not navigate route.

## Open decisions (resolved for v1)

| Topic | Decision |
|--------|-----------|
| Week start | Monday (`weekStartsOn: 1`) |
| Duplicate task in week | Same task appears **once** per day for the **active** date field only; mode switch changes placement |
| “Last week” retrospective block | **Removed** in favor of header navigation to any week |

## Implementation touchpoints (reference)

- `apps/web/src/components/layout/AppLayout.tsx` — `VIEWS` + global arrow handling interaction.
- `apps/web/src/components/layout/Sidebar.tsx` — add **Week** link.
- `apps/web/src/hooks/useTasks.ts` — patterns for `useLiveQuery`, sorting, terminal statuses.
- Router: register `/week` route + `WeekView` component.

---

**Self-review:** No TBD placeholders left for v1 scope; global ←/→ conflict explicitly addressed; null-date bucket specified; Monday week start explicit.
