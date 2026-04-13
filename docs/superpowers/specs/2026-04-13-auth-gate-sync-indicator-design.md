# Auth Gate + Sync Indicator

**Date:** 2026-04-13  
**Status:** Approved

## Overview

Two related topbar improvements:

1. **Soft auth gate** — show a "Sign in" button in the topbar when the user is not authenticated. App continues to work offline; no hard redirect.
2. **Sync status icon** — replace the binary `SyncBadge` (Synced/Local text + dot) with an icon-only animated square that communicates three states.

## Data Layer

### SyncStatus type

`useSync` return type changes from `boolean` to `SyncStatus`:

```ts
type SyncStatus = 'local' | 'syncing' | 'synced'
```

State transitions inside `useSync`:
- Initial / no user / no supabase / error → `'local'`
- `runSync()` called, awaiting → `'syncing'`
- `syncService.sync()` resolves successfully → `'synced'`

### Prop propagation

`isSynced: boolean` renamed to `syncStatus: SyncStatus` in:
- `App.tsx` (from `useSync`)
- `AppLayout` props interface
- `Topbar` props interface

`SyncStatus` type exported from `useSync.ts`.

## Sync Icon

Replace `SyncBadge` component in `Topbar` with `SyncIcon`. No text — icon only.

| State | Visual | Tailwind classes |
|-------|--------|-----------------|
| `local` | Hollow square | `w-2 h-2 border border-dim` |
| `syncing` | Spinning hollow square | `w-2 h-2 border border-accent animate-spin` |
| `synced` | Filled green square | `w-2 h-2 bg-green` |

Sharp corners — zero border-radius per design rules. `animate-spin` from Tailwind.

## Sign-in Button

When `user === null`, render a button **left of `SyncIcon`** in the topbar right cluster:

```
... [Sign in]  [SyncIcon]  [avatar or nothing]
```

Style: `font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-text transition-colors duration-150` — no border, no background, text only. Matches topbar metadata style.

Behavior: `useNavigate` to `/auth` on click.

When `user` exists: button absent. Avatar sign-out button unchanged.

## Files Changed

| File | Change |
|------|--------|
| `apps/web/src/hooks/useSync.ts` | Return `SyncStatus` instead of `boolean`; add `'syncing'` state |
| `apps/web/src/App.tsx` | `isSynced` → `syncStatus: SyncStatus` |
| `apps/web/src/components/layout/AppLayout.tsx` | Prop type update |
| `apps/web/src/components/layout/Topbar.tsx` | Replace `SyncBadge` with `SyncIcon`; add sign-in button |

## Out of Scope

- Hard auth redirect / route guards
- Inline sign-in form in topbar
- Error state distinction (treated as `'local'`)
