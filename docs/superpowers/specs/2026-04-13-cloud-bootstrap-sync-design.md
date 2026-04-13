# Cloud Bootstrap Sync Design

**Date:** 2026-04-13  
**Status:** Approved

## Problem

After signing in to the same Supabase user, reloading in a new tab or browser context does not reliably show the same data. Root causes:

1. `_seed()` in `db.ts` runs on every fresh IndexedDB, creating new random-id "Personal"/"General" rows (`synced: false`). These push to cloud on first sync, polluting it with duplicate default data.
2. Pull is always incremental (`updated_at > speedy_last_synced_at`). A fresh context starts with cursor = epoch, so it pulls all cloud data — but the seed rows are already in Dexie and co-exist with real cloud data.
3. `speedy_last_synced_at` is per-device localStorage; diverges across contexts.
4. No DB ownership check: user switching silently merges data from two accounts.

## Goals

- After sign-in, any fresh context shows the same spaces/projects/tasks as cloud.
- Local tasks created before sign-in are reconciled (pushed to cloud).
- Empty seed rows (no tasks) are discarded on bootstrap.
- Signing in as a different user wipes the previous user's local data.

## Out of Scope

- Changing the DB schema or Dexie version.
- Changing offline UX (seeding still runs for offline-only use).
- Conflict resolution beyond existing last-write-wins on `updatedAt`.

## Design

### 1. Auth lifecycle & DB ownership

Two keys in `localStorage`:

| Key | Purpose |
|-----|---------|
| `speedy_last_synced_at` | Incremental sync cursor (existing) |
| `sift_user_id` | Tracks which user owns current IndexedDB |

On every auth state change in `useSync`:

- **`user` is null (sign-out):** call `clearLocalDB()` + remove both keys.
- **`userId` changed:** call `clearLocalDB()` (wipes all tables + clears cursor), set new `sift_user_id`, run bootstrap.
- **`userId` same, cursor = epoch:** no prior sync on this device → run bootstrap.
- **`userId` same, cursor set:** normal incremental sync.

`clearLocalDB()` added to `db.ts`: truncates `spaces`, `projects`, `tasks` in a single Dexie transaction.

### 2. Bootstrap sequence

New `SyncService.bootstrap(userId)`:

1. **Full pull** — fetch all spaces/projects/tasks for user with no `updated_at` filter.
2. **Write cloud data** to Dexie via `bulkPut`.
3. **Prune orphan seeds** — delete local spaces/projects where `synced: false` AND no tasks reference them. These are guaranteed to be DB-generated seeds since bootstrap runs before any user interaction on fresh contexts.
4. **Push unsynced local tasks** — tasks with `synced: false` upserted to Supabase (tasks created before sign-in).
5. **Set `speedy_last_synced_at`** to now.

Pull-before-prune ensures cloud data is in Dexie before we decide what to delete.

### 3. `useSync` changes

```ts
const SIFT_USER_ID_KEY = "sift_user_id";

async function initialize() {
  const storedUserId = localStorage.getItem(SIFT_USER_ID_KEY);
  const isFirstSync = getLastSyncedAt().getTime() === 0;
  const userChanged = storedUserId !== userId;

  if (userChanged || isFirstSync) {
    if (userChanged) await clearLocalDB();
    localStorage.setItem(SIFT_USER_ID_KEY, userId);
    await syncService.bootstrap(userId);
  } else {
    await syncService.sync(userId);
  }
}
```

- `initialize()` replaces the initial `runSync()` call.
- Realtime `onChange` callback and `window.online` handler both call `syncService.sync(userId)` — bootstrap is one-shot only.
- On sign-out (`user` becomes null): `clearLocalDB()` + `localStorage.removeItem(SIFT_USER_ID_KEY)`.

### 5. Realtime subscription expansion

`SyncService.subscribe` currently only watches the `tasks` table. Expand to subscribe to all three tables (`spaces`, `projects`, `tasks`) using the same `onChange` handler. This ensures project and space changes on Device A propagate immediately to Device B without waiting for the next task-triggered sync.

```ts
subscribe(userId: string, onChange: () => void): () => void {
  const channel = this.supabase
    .channel(`sift:user:${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "spaces",   filter: `user_id=eq.${userId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `user_id=eq.${userId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks",    filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();

  return () => { void this.supabase.removeChannel(channel); };
}
```

All three listeners share one channel and one `onChange` → one incremental sync per batch of changes.

### 4. Files changed

| File | Change |
|------|--------|
| `packages/shared/src/db.ts` | Add `clearLocalDB()` export |
| `apps/web/src/services/SyncService.ts` | Add `bootstrap(userId)` method |
| `apps/web/src/hooks/useSync.ts` | Replace initial sync with `initialize()`, handle sign-out wipe |
| `apps/web/src/services/SyncService.ts` | Expand `subscribe()` to watch spaces, projects, tasks |

No new Dexie version needed. No DB schema changes. No UI changes.

## Behavior After This Change

| Scenario | Before | After |
|----------|--------|-------|
| Sign in on fresh device | Seed rows + cloud rows coexist | Full pull, seeds pruned if empty |
| Reload same tab | Incremental sync | Incremental sync (unchanged) |
| Sign in, different user | Previous user's data leaks | DB wiped, fresh bootstrap |
| Sign out | Data stays in IndexedDB | DB wiped |
| Task created before sign-in | May push, may not | Pushed during bootstrap |
| Offline with no account | Seed works as before | Unchanged |
| New project on Device A | Device B misses it until task changes | Device B gets it immediately via realtime |
