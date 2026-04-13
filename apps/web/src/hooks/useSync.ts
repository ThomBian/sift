import { useState, useEffect } from "react";
import { SyncService } from "../services/SyncService";
import { supabase } from "../lib/supabase";
import { registerSyncRunner } from "../lib/requestSync";
import type { User } from "@supabase/supabase-js";

export type SyncStatus = "local" | "syncing" | "synced";

export function useSync(user: User | null): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("local");

  useEffect(() => {
    if (!user || !supabase) {
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

  return status;
}
