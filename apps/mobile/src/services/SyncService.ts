import type { SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTasks, saveTasks, type MobileTask } from "../lib/taskStore";

const LAST_SYNC_KEY = "speedy_last_synced_at";

async function getLastSyncedAt(): Promise<Date> {
  const stored = await AsyncStorage.getItem(LAST_SYNC_KEY);
  return stored ? new Date(stored) : new Date(0);
}

async function setLastSyncedAt(date: Date): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, date.toISOString());
}

function taskToRow(task: MobileTask, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    project_id: task.projectId,
    status: task.status,
    working_date: task.workingDate,
    due_date: task.dueDate,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    completed_at: task.completedAt,
    url: null,
    synced: true,
  };
}

function rowToTask(row: Record<string, unknown>): MobileTask {
  return {
    id: row.id as string,
    title: row.title as string,
    status: row.status === "done" ? "done" : "inbox",
    projectId: (row.project_id as string | null | undefined) ?? null,
    workingDate: (row.working_date as string | null | undefined)?.slice(0, 10) ?? null,
    dueDate: (row.due_date as string | null | undefined)?.slice(0, 10) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null | undefined) ?? null,
    synced: true,
  };
}

export class SyncService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async sync(userId: string): Promise<void> {
    const syncStartedAt = new Date();
    const lastSyncedAt = await getLastSyncedAt();

    const localTasks = await getTasks();
    const unsynced = localTasks.filter((t) => !t.synced);
    if (unsynced.length > 0) {
      const { error } = await this.supabase
        .from("tasks")
        .upsert(unsynced.map((t) => taskToRow(t, userId)), { onConflict: "id" });
      if (!error) {
        const syncedIds = new Set(unsynced.map((t) => t.id));
        const next = localTasks.map((t) =>
          syncedIds.has(t.id) ? { ...t, synced: true } : t,
        );
        await saveTasks(next);
      }
    }

    const { data, error: pullError } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", lastSyncedAt.toISOString());

    if (!pullError && data) {
      const remote = (data as Record<string, unknown>[]).map(rowToTask);
      const byId = new Map((await getTasks()).map((t) => [t.id, t] as const));
      for (const task of remote) {
        const local = byId.get(task.id);
        if (!local || local.updatedAt < task.updatedAt) byId.set(task.id, task);
      }
      await saveTasks(Array.from(byId.values()));
    }

    await setLastSyncedAt(syncStartedAt);
  }

  async bootstrap(userId: string): Promise<void> {
    const syncStartedAt = new Date();
    const { data, error } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;

    const localTasks = await getTasks();
    const localUnsynced = localTasks.filter((t) => !t.synced);
    const remote = (data as Record<string, unknown>[]).map(rowToTask);
    const byId = new Map(remote.map((t) => [t.id, t] as const));
    for (const task of localUnsynced) byId.set(task.id, task);
    await saveTasks(Array.from(byId.values()));

    if (localUnsynced.length > 0) {
      const { error: pushError } = await this.supabase
        .from("tasks")
        .upsert(localUnsynced.map((t) => taskToRow(t, userId)), { onConflict: "id" });
      if (!pushError) {
        const reloaded = await getTasks();
        await saveTasks(reloaded.map((t) => ({ ...t, synced: true })));
      }
    }

    await setLastSyncedAt(syncStartedAt);
  }

  subscribe(userId: string, onChange: () => void): () => void {
    const channel = this.supabase
      .channel(`sift:mobile:user:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
        onChange,
      )
      .subscribe();

    return () => {
      void this.supabase.removeChannel(channel);
    };
  }
}
