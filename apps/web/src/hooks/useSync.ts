import { useState, useEffect } from "react";
import { SyncService } from "../services/SyncService";
import { supabase } from "../lib/supabase";
import { registerSyncRunner } from "../lib/requestSync";
import type { User } from "@supabase/supabase-js";

export function useSync(user: User | null): boolean {
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!user || !supabase) {
      setIsSynced(false);
      return;
    }

    const userId = user.id;
    const syncService = new SyncService(supabase);
    let unsubscribeRealtime: (() => void) | undefined;

    async function runSync() {
      try {
        await syncService.sync(userId);
        setIsSynced(true);
      } catch {
        setIsSynced(false);
      }
    }

    void runSync();
    registerSyncRunner(() => void runSync());

    function handleOnline() {
      void runSync();
    }
    window.addEventListener("online", handleOnline);

    unsubscribeRealtime = syncService.subscribe(userId, () => {
      void runSync();
    });

    return () => {
      registerSyncRunner(null);
      window.removeEventListener("online", handleOnline);
      unsubscribeRealtime?.();
    };
  }, [user]);

  return isSynced;
}
