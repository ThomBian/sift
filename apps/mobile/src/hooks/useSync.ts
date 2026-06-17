import { useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { clearTasks } from "../lib/taskStore";
import { registerSyncRunner } from "../lib/requestSync";
import { SyncService } from "../services/SyncService";

export type SyncStatus = "local" | "syncing" | "synced";

const SIFT_USER_ID_KEY = "sift_user_id";
const LAST_SYNC_KEY = "speedy_last_synced_at";

export function useSync(user: User | null): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("local");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStatus("local");
      return;
    }

    if (!user) {
      void clearTasks().finally(() => {
        void AsyncStorage.multiRemove([SIFT_USER_ID_KEY, LAST_SYNC_KEY]);
      });
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
        const storedUserId = await AsyncStorage.getItem(SIFT_USER_ID_KEY);
        const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
        const isFirstSync = lastSync === null;
        const userChanged = storedUserId !== null && storedUserId !== userId;

        if (userChanged) {
          await clearTasks();
          await AsyncStorage.removeItem(LAST_SYNC_KEY);
        }

        if (userChanged || isFirstSync) await syncService.bootstrap(userId);
        else await syncService.sync(userId);

        await AsyncStorage.setItem(SIFT_USER_ID_KEY, userId);
        setStatus("synced");
      } catch {
        setStatus("local");
      }
    }

    void initialize();
    registerSyncRunner(() => void runSync());

    const unsubscribeOnline = NetInfo.addEventListener((state) => {
      if (state.isConnected) void runSync();
    });

    unsubscribeRealtime = syncService.subscribe(userId, () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void runSync(), 200);
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      registerSyncRunner(null);
      unsubscribeOnline();
      unsubscribeRealtime?.();
    };
  }, [user]);

  return status;
}
