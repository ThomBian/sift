# Favicon Today-Count Badge — Design

**Date:** 2026-06-19
**Scope:** `apps/web` only. No browser extension.

## Goal

Show the number of "today" tasks as a live badge on the Sift browser tab's
favicon (the pin in Chrome), and mirror the count in the tab title. Both update
reactively as tasks change — no page reload.

## Count definition

The count is the length of the **Today** set, identical to `TodayView`:
`useTodayTasks()` — tasks where `workingDate <= today` (local calendar day) and
`status` is not `done` or `archived`.

- When count is `0`: **no badge** is rendered (plain favicon), and the title is
  the plain `"Sift"`.
- When count `>= 1`: badge shown, title prefixed `"(N) Sift"`.
- When count `>= 100`: badge text renders as `"99+"` to stay legible at 16px;
  the title still shows the true number, e.g. `"(123) Sift"`.

## Approach

SVG data-URI favicon (chosen over canvas/PNG): crisp at any DPI, pure string
construction, trivially unit-testable, no jsdom canvas shims.

## Components

### `src/lib/faviconBadge.ts`
Pure, no DOM access. One responsibility each:

- `buildFaviconSvg(count: number): string`
  Returns SVG markup. For `count <= 0`, returns the base favicon markup
  unchanged. For `count >= 1`, overlays a **round** badge (filled circle) in the
  top-right corner using the laser accent `#FF4F00` with white digits. Badge
  text is `count` for 1–99, `"99+"` for `>= 100`.
- `buildTabTitle(count: number): string`
  Returns `"Sift"` for `count <= 0`, else `"(${count}) Sift"`.
- `svgToDataUri(svg: string): string`
  Returns `data:image/svg+xml,<encoded>` for use as a `<link rel="icon">` href.

The base favicon markup (dark rounded square + `#5E6AD2` checkmark, viewBox
`0 0 32 32`) is duplicated as a constant in this module so the favicon is
self-contained and not coupled to the static `public/favicon.svg` file. A code
comment notes the two should stay visually in sync.

Badge geometry (within the 32×32 viewBox): circle centered near `(24, 8)`,
radius `7`, white text centered, font ~`11px` bold, system sans. Tuned during
implementation against a real 16px tab render.

### `src/hooks/useFaviconBadge.ts`
- `useFaviconBadge(): void`
  Reads `useTodayTasks().length`. On each change:
  1. Sets the `<link rel="icon">` href to `svgToDataUri(buildFaviconSvg(count))`,
     creating the link element if absent.
  2. Sets `document.title = buildTabTitle(count)`.
  On unmount, restores `href="/favicon.svg"` and `document.title = "Sift"`.

  The hook is the only piece that touches the DOM, keeping the builders pure.

### `src/App.tsx`
Call `useFaviconBadge()` once at the app root so the badge tracks the count for
the whole session regardless of the active view.

## Data flow

`db.tasks` (Dexie) → `useTodayTasks()` (Dexie `useLiveQuery`, already reactive)
→ `useFaviconBadge()` → `<link rel="icon">` href + `document.title`.

Writes anywhere (create/complete/archive/sync pull) already invalidate the live
query, so the badge updates with no extra wiring.

## Error handling

- No tasks / count 0 → plain favicon + plain title (explicit, not an error).
- Missing `<link rel="icon">` → hook creates one.
- Builders are total functions over any integer (negatives clamp to the 0 case);
  no throw paths.

## Testing

Vitest + jsdom (existing setup).

- `faviconBadge.test.ts` (pure, no DB):
  - `buildTabTitle`: `0 → "Sift"`, `3 → "(3) Sift"`, `150 → "(150) Sift"`.
  - `buildFaviconSvg`: count 0 contains no badge circle / no digits; count 5
    contains `5`; count 100 contains `99+`; output is valid `<svg>` markup.
  - `svgToDataUri`: starts with `data:image/svg+xml,`.
- `useFaviconBadge.test.tsx`: seed Dexie with N today-tasks, render a probe
  component, assert `document.title` and the `link[rel=icon]` href reflect N;
  assert restore on unmount.

## Out of scope

- Browser extension of any kind.
- Inbox count, overdue styling, or per-project badges.
- Animating the badge.
