import type { SupabaseClient } from "@supabase/supabase-js";

const PENDING_PROJECT_DELETES_KEY = "speedy_pending_project_deletes";

export type PendingProjectDeletion = {
  projectId: string;
  taskIds: string[];
};

function readQueue(): PendingProjectDeletion[] {
  try {
    const raw = localStorage.getItem(PENDING_PROJECT_DELETES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is PendingProjectDeletion =>
        e != null &&
        typeof e === "object" &&
        typeof (e as PendingProjectDeletion).projectId === "string" &&
        Array.isArray((e as PendingProjectDeletion).taskIds) &&
        (e as PendingProjectDeletion).taskIds.every((id) => typeof id === "string"),
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingProjectDeletion[]): void {
  if (queue.length === 0) {
    localStorage.removeItem(PENDING_PROJECT_DELETES_KEY);
    return;
  }
  localStorage.setItem(PENDING_PROJECT_DELETES_KEY, JSON.stringify(queue));
}

/** Replace any prior entry for the same project, then append (idempotent re-enqueue). */
export function enqueuePendingProjectDeletion(
  entry: PendingProjectDeletion,
): void {
  const queue = readQueue().filter((q) => q.projectId !== entry.projectId);
  queue.push(entry);
  writeQueue(queue);
}

export function clearPendingProjectDeletes(): void {
  localStorage.removeItem(PENDING_PROJECT_DELETES_KEY);
}

const TASK_DELETE_CHUNK = 100;

/**
 * Deletes tasks then the project for each queued deletion. Keeps failed entries
 * for the next sync attempt.
 */
export async function flushPendingProjectDeletes(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;

  const remaining: PendingProjectDeletion[] = [];

  for (const entry of queue) {
    let stepFailed = false;
    const { projectId, taskIds } = entry;

    for (let i = 0; i < taskIds.length; i += TASK_DELETE_CHUNK) {
      const chunk = taskIds.slice(i, i + TASK_DELETE_CHUNK);
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("user_id", userId)
        .in("id", chunk);
      if (error) {
        stepFailed = true;
        break;
      }
    }

    if (stepFailed) {
      remaining.push(entry);
      continue;
    }

    const { error: projectError } = await supabase
      .from("projects")
      .delete()
      .eq("user_id", userId)
      .eq("id", projectId);

    if (projectError) {
      remaining.push(entry);
      continue;
    }
  }

  writeQueue(remaining);
}
