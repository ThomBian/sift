// packages/shared/src/__tests__/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AppDatabase } from '../db';

describe('AppDatabase', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    // fake-indexeddb gives a fresh store each time (via setup.ts)
    db = new AppDatabase(`test-${Math.random()}`);
    await db.open();
  });

  it('seeds a default Personal space on first open', async () => {
    const spaces = await db.spaces.toArray();
    expect(spaces).toHaveLength(1);
    expect(spaces[0].name).toBe('Personal');
    expect(spaces[0].color).toBe('#5E6AD2');
    expect(spaces[0].synced).toBe(false);
  });

  it('seeds a default General project under the Personal space', async () => {
    const spaces = await db.spaces.toArray();
    const projects = await db.projects.toArray();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('General');
    expect(projects[0].spaceId).toBe(spaces[0].id);
    expect(projects[0].synced).toBe(false);
  });

  it('does not re-seed when spaces already exist', async () => {
    const db2 = new AppDatabase(db.name);
    await db2.open();
    const spaces = await db2.spaces.toArray();
    expect(spaces).toHaveLength(1);
    await db2.close();
  });

  it('can add and retrieve a task', async () => {
    const [project] = await db.projects.toArray();
    const task: import('../types').Task = {
      id: 'task-1',
      title: 'Buy milk',
      projectId: project.id,
      status: 'inbox',
      workingDate: null,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      synced: false,
    };
    await db.tasks.add(task);
    const found = await db.tasks.get('task-1');
    expect(found?.title).toBe('Buy milk');
    expect(found?.projectId).toBe(project.id);
  });
});
