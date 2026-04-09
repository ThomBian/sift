import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '../lib/db';
import { SyncService } from '../services/SyncService';
import type { Space, Project, Task } from '@sift/shared';

const mockUpsert = vi.fn().mockResolvedValue({ error: null });

const mockGt = vi.fn();

function createMockSupabase() {
  const mockSelect = vi.fn(() => ({
    gt: (_col: string, _v: string) => mockGt(),
  }));

  return {
    from: vi.fn(() => ({
      upsert: mockUpsert,
      select: mockSelect,
    })),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  };
}

const now = new Date('2026-04-04T10:00:00Z');

function makeSpace(overrides?: Partial<Space>): Space {
  return {
    id: 'space-1',
    name: 'Work',
    color: '#5E6AD2',
    createdAt: now,
    updatedAt: now,
    synced: false,
    ...overrides,
  };
}

function makeProject(overrides?: Partial<Project>): Project {
  return {
    id: 'project-1',
    name: 'General',
    emoji: '📚',
    spaceId: 'space-1',
    dueDate: null,
    archived: false,
    createdAt: now,
    updatedAt: now,
    synced: false,
    ...overrides,
  };
}

function makeTask(overrides?: Partial<Task>): Task {
  return {
    id: 'task-1',
    title: 'Test task',
    projectId: 'project-1',
    status: 'inbox',
    workingDate: null,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    synced: false,
    ...overrides,
  };
}

beforeEach(async () => {
  await db.tasks.clear();
  await db.projects.clear();
  await db.spaces.clear();
  vi.clearAllMocks();
  mockUpsert.mockResolvedValue({ error: null });
  mockGt.mockReset();
  mockGt.mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SyncService', () => {
  describe('sync() — push', () => {
    it('pushes unsynced spaces to Supabase', async () => {
      await db.spaces.add(makeSpace({ synced: false }));
      const mockSupabase = createMockSupabase();

      const svc = new SyncService(mockSupabase as never);
      await svc.sync('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('spaces');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'space-1', user_id: 'user-1' }),
        ]),
        expect.objectContaining({ onConflict: 'id' })
      );
    });

    it('pushes unsynced projects to Supabase', async () => {
      await db.spaces.add(makeSpace({ synced: true }));
      await db.projects.add(makeProject({ synced: false }));
      const mockSupabase = createMockSupabase();

      const svc = new SyncService(mockSupabase as never);
      await svc.sync('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'project-1', user_id: 'user-1', emoji: '📚' }),
        ]),
        expect.objectContaining({ onConflict: 'id' })
      );
    });

    it('pushes unsynced tasks to Supabase', async () => {
      await db.spaces.add(makeSpace({ synced: true }));
      await db.projects.add(makeProject({ synced: true }));
      await db.tasks.add(makeTask({ synced: false }));
      const mockSupabase = createMockSupabase();

      const svc = new SyncService(mockSupabase as never);
      await svc.sync('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'task-1', user_id: 'user-1' }),
        ]),
        expect.objectContaining({ onConflict: 'id' })
      );
    });

    it('does not push when everything is already synced', async () => {
      await db.spaces.add(makeSpace({ synced: true }));
      const mockSupabase = createMockSupabase();

      const svc = new SyncService(mockSupabase as never);
      await svc.sync('user-1');

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('marks records synced=true after successful push', async () => {
      await db.spaces.add(makeSpace({ synced: false }));
      const mockSupabase = createMockSupabase();

      const svc = new SyncService(mockSupabase as never);
      await svc.sync('user-1');

      const space = await db.spaces.get('space-1');
      expect(space!.synced).toBe(true);
    });
  });

  describe('sync() — pull', () => {
    it('writes remote records to Dexie using LWW', async () => {
      const remoteTask = makeTask({
        id: 'remote-task',
        title: 'From server',
        synced: true,
        updatedAt: new Date('2026-04-04T12:00:00Z'),
      });

      mockGt
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: [
            {
              id: remoteTask.id,
              title: remoteTask.title,
              project_id: remoteTask.projectId,
              status: remoteTask.status,
              working_date: null,
              due_date: null,
              created_at: remoteTask.createdAt.toISOString(),
              updated_at: remoteTask.updatedAt.toISOString(),
              completed_at: null,
              source_url: null,
              synced: true,
              user_id: 'user-1',
            },
          ],
          error: null,
        });

      const mockSupabase = createMockSupabase();
      const svc = new SyncService(mockSupabase as never);
      await svc.sync('user-1');

      const stored = await db.tasks.get('remote-task');
      expect(stored).toBeDefined();
      expect(stored!.title).toBe('From server');
    });

    it('keeps the local record when local updatedAt is newer', async () => {
      const localUpdatedAt = new Date('2026-04-04T13:00:00Z');
      const remoteUpdatedAt = new Date('2026-04-04T11:00:00Z');

      await db.spaces.add(makeSpace({ synced: true }));
      await db.projects.add(makeProject({ synced: true }));
      await db.tasks.add(
        makeTask({
          id: 'task-conflict',
          title: 'Local wins',
          updatedAt: localUpdatedAt,
          synced: true,
        })
      );

      mockGt
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: [
            {
              id: 'task-conflict',
              title: 'Remote title',
              project_id: 'project-1',
              status: 'inbox',
              working_date: null,
              due_date: null,
              created_at: now.toISOString(),
              updated_at: remoteUpdatedAt.toISOString(),
              completed_at: null,
              source_url: null,
              synced: true,
              user_id: 'user-1',
            },
          ],
          error: null,
        });

      const mockSupabase = createMockSupabase();
      const svc = new SyncService(mockSupabase as never);
      await svc.sync('user-1');

      const stored = await db.tasks.get('task-conflict');
      expect(stored!.title).toBe('Local wins');
    });
  });

  describe('subscribe()', () => {
    it('returns an unsubscribe function', () => {
      const mockSupabase = {
        from: vi.fn(),
        channel: vi.fn(() => ({
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
      };
      const svc = new SyncService(mockSupabase as never);
      const unsub = svc.subscribe('user-1', vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('calls the onChange callback when Realtime fires', () => {
      const onChange = vi.fn();
      let capturedHandler: (() => void) | undefined;

      const mockChannelObj: {
        on: ReturnType<typeof vi.fn>;
        subscribe: ReturnType<typeof vi.fn>;
      } = {
        on: vi.fn(),
        subscribe: vi.fn(),
      };
      mockChannelObj.on.mockImplementation(
        (_event: string, _filter: unknown, handler: () => void) => {
          capturedHandler = handler;
          return mockChannelObj;
        }
      );

      const mockSupabase = {
        from: vi.fn(),
        channel: vi.fn(() => mockChannelObj),
        removeChannel: vi.fn(),
      };

      const svc = new SyncService(mockSupabase as never);
      svc.subscribe('user-1', onChange);

      expect(capturedHandler).toBeDefined();
      capturedHandler!();
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });
});
