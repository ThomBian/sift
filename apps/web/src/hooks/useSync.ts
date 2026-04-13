import { useState, useEffect, useRef } from "react";
import { SyncService } from "../services/SyncService";
import { supabase } from "../lib/supabase";
import { clearLocalDB } from "../lib/db";
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
        void clearLocalDB().then(() => {
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
          localStorage.removeItem(LAST_SYNC_KEY);
        }

        if (userChanged || isFirstSync) {
          localStorage.setItem(SIFT_USER_ID_KEY, userId);
          await syncService.bootstrap(userId);
        } else {
          await syncService.sync(userId);
        }
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
