import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../lib/db';
import type { Space, Project, Task } from '@speedy/shared';

const LAST_SYNC_KEY = 'speedy_last_synced_at';

function getLastSyncedAt(): Date {
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  return stored ? new Date(stored) : new Date(0);
}

function setLastSyncedAt(date: Date): void {
  localStorage.setItem(LAST_SYNC_KEY, date.toISOString());
}

function spaceToRow(space: Space, userId: string) {
  return {
    id: space.id,
    user_id: userId,
    name: space.name,
    color: space.color,
    created_at: space.createdAt.toISOString(),
    updated_at: space.updatedAt.toISOString(),
    synced: true,
  };
}

function rowToSpace(row: Record<string, unknown>): Space {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    synced: true,
  };
}

function projectToRow(project: Project, userId: string) {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    space_id: project.spaceId,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
    synced: true,
  };
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    spaceId: row.space_id as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    synced: true,
  };
}

function taskToRow(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    project_id: task.projectId,
    status: task.status,
    working_date: task.workingDate?.toISOString() ?? null,
    due_date: task.dueDate?.toISOString() ?? null,
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
    completed_at: task.completedAt?.toISOString() ?? null,
    source_url: task.sourceUrl ?? null,
    synced: true,
  };
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    projectId: row.project_id as string,
    status: row.status as Task['status'],
    workingDate: row.working_date ? new Date(row.working_date as string) : null,
    dueDate: row.due_date ? new Date(row.due_date as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    sourceUrl: (row.source_url as string | undefined) ?? undefined,
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
    const lastSyncedAt = getLastSyncedAt();

    await this.syncSpaces(userId, lastSyncedAt);
    await this.syncProjects(userId, lastSyncedAt);
    await this.syncTasks(userId, lastSyncedAt);

    setLastSyncedAt(syncStartedAt);
  }

  private async syncSpaces(userId: string, lastSyncedAt: Date): Promise<void> {
    const unsynced = await db.spaces.filter((s) => !s.synced).toArray();
    if (unsynced.length > 0) {
      const { error } = await this.supabase
        .from('spaces')
        .upsert(unsynced.map((s) => spaceToRow(s, userId)), { onConflict: 'id' });
      if (!error) {
        await Promise.all(unsynced.map((s) => db.spaces.update(s.id, { synced: true })));
      }
    }

    const { data, error: pullError } = await this.supabase
      .from('spaces')
      .select('*')
      .gt('updated_at', lastSyncedAt.toISOString());

    if (pullError || !data) return;

    for (const row of data as Record<string, unknown>[]) {
      const remote = rowToSpace(row);
      const local = await db.spaces.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        await db.spaces.put(remote);
      }
    }
  }

  private async syncProjects(userId: string, lastSyncedAt: Date): Promise<void> {
    const unsynced = await db.projects.filter((p) => !p.synced).toArray();
    if (unsynced.length > 0) {
      const { error } = await this.supabase
        .from('projects')
        .upsert(unsynced.map((p) => projectToRow(p, userId)), { onConflict: 'id' });
      if (!error) {
        await Promise.all(unsynced.map((p) => db.projects.update(p.id, { synced: true })));
      }
    }

    const { data, error: pullError } = await this.supabase
      .from('projects')
      .select('*')
      .gt('updated_at', lastSyncedAt.toISOString());

    if (pullError || !data) return;

    for (const row of data as Record<string, unknown>[]) {
      const remote = rowToProject(row);
      const local = await db.projects.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        await db.projects.put(remote);
      }
    }
  }

  private async syncTasks(userId: string, lastSyncedAt: Date): Promise<void> {
    const unsynced = await db.tasks.filter((t) => !t.synced).toArray();
    if (unsynced.length > 0) {
      const { error } = await this.supabase
        .from('tasks')
        .upsert(unsynced.map((t) => taskToRow(t, userId)), { onConflict: 'id' });
      if (!error) {
        await Promise.all(unsynced.map((t) => db.tasks.update(t.id, { synced: true })));
      }
    }

    const { data, error: pullError } = await this.supabase
      .from('tasks')
      .select('*')
      .gt('updated_at', lastSyncedAt.toISOString());

    if (pullError || !data) return;

    for (const row of data as Record<string, unknown>[]) {
      const remote = rowToTask(row);
      const local = await db.tasks.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        await db.tasks.put(remote);
      }
    }
  }

  subscribe(userId: string, onChange: () => void): () => void {
    const channel = this.supabase
      .channel(`tasks:user:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        onChange
      )
      .subscribe();

    return () => {
      void this.supabase.removeChannel(channel);
    };
  }
}
