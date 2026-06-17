type SyncRunner = () => void;

let runner: SyncRunner | null = null;

export function registerSyncRunner(fn: SyncRunner | null): void {
  runner = fn;
}

export function requestSync(): void {
  runner?.();
}
