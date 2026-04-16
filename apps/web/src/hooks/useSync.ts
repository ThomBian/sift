import { useState, useEffect, useRef } from "react";
import { SyncService } from "../services/SyncService";
import { supabase } from "../lib/supabase";
import { clearLocalDB } from "../lib/db";
import { clearPendingProjectDeletes } from "../lib/syncDeletionOutbox";
import { registerSyncRunner } from "../lib/requestSync";
import type { User } from "@supabase/supabase-js";

export type SyncStatus = "local" | "syncing" | "synced";

const SIFT_USER_ID_KEY = "sift_user_id";
const LAST_SYNC_KEY = "speedy_last_synced_at";

export function useSync(user: User | null): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("local");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!supabase) {
      setStatus("local");
      return;
    }

    if (!user) {
      // Only wipe if a previous user session existed on this device
      if (localStorage.getItem(SIFT_USER_ID_KEY) !== null) {
        // Always remove keys regardless of DB success — stale keys cause
        // incorrect sync-path selection on next sign-in
        void clearLocalDB()
          .catch(console.error)
          .finally(() => {
            clearPendingProjectDeletes();
            localStorage.removeItem(SIFT_USER_ID_KEY);
            localStorage.removeItem(LAST_SYNC_KEY);
          });
      }
      setStatus("local");
      return;
    }

    const userId = user.id;
    const syncService = new SyncService(supabase);
    let unsubscribeRealtime: (() => void) | undefined;

    async function runSync() {
      setStatus("syncing");
      try {
        await syncService.sync(userId);
        setStatus("synced");
      } catch {
        setStatus("local");
      }
    }

    async function initialize() {
      setStatus("syncing");
      try {
        const storedUserId = localStorage.getItem(SIFT_USER_ID_KEY);
        const isFirstSync = localStorage.getItem(LAST_SYNC_KEY) === null;
        const userChanged = storedUserId !== null && storedUserId !== userId;

        if (userChanged) {
          await clearLocalDB();
          clearPendingProjectDeletes();
          localStorage.removeItem(LAST_SYNC_KEY);
          // sift_user_id still holds the old userId here; it is overwritten on
          // success below. A refresh during bootstrap sees storedUserId !== userId
          // which triggers another bootstrap — fully recoverable.
        }

        if (userChanged || isFirstSync) {
          await syncService.bootstrap(userId);
        } else {
          await syncService.sync(userId);
        }
        localStorage.setItem(SIFT_USER_ID_KEY, userId);
        setStatus("synced");
      } catch {
        setStatus("local");
      }
    }

    void initialize();
    registerSyncRunner(() => void runSync());

    function handleOnline() {
      void runSync();
    }
    window.addEventListener("online", handleOnline);

    unsubscribeRealtime = syncService.subscribe(userId, () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void runSync(), 150);
    });

    return () => {
      clearTimeout(debounceRef.current);
      registerSyncRunner(null);
      window.removeEventListener("online", handleOnline);
      unsubscribeRealtime?.();
    };
  }, [user]);

  return status;
}
