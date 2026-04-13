/** Registered from App when the user is signed in and Supabase is configured. */
type SyncRunner = () => void;

let runner: SyncRunner | null = null;

export function registerSyncRunner(fn: SyncRunner | null): void {
  runner = fn;
}

/** Queue a background push/pull after a local write (no-op if offline auth / no runner). */
export function requestSync(): void {
  runner?.();
}
