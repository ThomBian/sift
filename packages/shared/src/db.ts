// packages/shared/src/db.ts
import Dexie, { type Table } from 'dexie';
import { nanoid } from 'nanoid';
import type { Space, Project, Task } from './types';

export class AppDatabase extends Dexie {
  spaces!: Table<Space>;
  projects!: Table<Project>;
  tasks!: Table<Task>;

  constructor(name = 'speedy-tasks') {
    super(name);
    this.version(1).stores({
      spaces:   'id, updatedAt, synced',
      projects: 'id, spaceId, updatedAt, synced',
      tasks:    'id, projectId, status, workingDate, dueDate, updatedAt, synced',
    });

    this.version(2).stores({
      projects: 'id, spaceId, dueDate, updatedAt, synced',
    });

    this.on('ready', () => this._seed());
  }

  private async _seed(): Promise<void> {
    const count = await this.spaces.count();
    if (count > 0) return;

    const now = new Date();
    const spaceId = nanoid();

    await this.spaces.add({
      id: spaceId,
      name: 'Personal',
      color: '#5E6AD2',
      createdAt: now,
      updatedAt: now,
      synced: false,
    });

    await this.projects.add({
      id: nanoid(),
      name: 'General',
      spaceId,
      dueDate: null,
      createdAt: now,
      updatedAt: now,
      synced: false,
    });
  }
}

// Singleton for the web app (extension uses its own instance)
export const db = new AppDatabase();
