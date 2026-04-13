// packages/shared/src/db.ts
import Dexie, { type Table } from "dexie";
import { nanoid } from "nanoid";
import type { Space, Project, Task } from "./types";
import { getRandomEmoji } from "./emojiPool";

export class AppDatabase extends Dexie {
  spaces!: Table<Space>;
  projects!: Table<Project>;
  tasks!: Table<Task>;

  constructor(name = "speedy-tasks") {
    super(name);
    this.version(1).stores({
      spaces: "id, updatedAt, synced",
      projects: "id, spaceId, updatedAt, synced",
      tasks: "id, projectId, status, workingDate, dueDate, updatedAt, synced",
    });

    this.version(2).stores({
      projects: "id, spaceId, dueDate, updatedAt, synced",
    });

    this.version(3)
      .stores({
        projects: "id, spaceId, dueDate, updatedAt, synced",
      })
      .upgrade((tx) => {
        return tx
          .table("projects")
          .toCollection()
          .modify((project: any) => {
            project.emoji = getRandomEmoji();
          });
      });

    this.version(4)
      .stores({
        projects: "id, spaceId, dueDate, archived, updatedAt, synced",
      })
      .upgrade((tx) => {
        return tx
          .table("projects")
          .toCollection()
          .modify((project: any) => {
            project.archived = false;
          });
      });

    this.version(5)
      .stores({
        tasks: "id, projectId, status, workingDate, dueDate, updatedAt, synced",
        projects: "id, spaceId, dueDate, archived, updatedAt, synced",
      })
      .upgrade((tx) => {
        return Promise.all([
          tx
            .table("tasks")
            .toCollection()
            .modify((task: any) => {
              task.url = task.sourceUrl ?? null;
              delete task.sourceUrl;
            }),
          tx
            .table("projects")
            .toCollection()
            .modify((project: any) => {
              project.url = null;
            }),
        ]);
      });

    this.on("ready", () => this._seed());
  }

  private async _seed(): Promise<void> {
    const count = await this.spaces.count();
    if (count > 0) return;

    const now = new Date();
    const spaceId = nanoid();

    await this.spaces.add({
      id: spaceId,
      name: "Personal",
      color: "#5E6AD2",
      createdAt: now,
      updatedAt: now,
      synced: false,
    });

    await this.projects.add({
      id: nanoid(),
      name: "General",
      emoji: getRandomEmoji(),
      spaceId,
      dueDate: null,
      archived: false,
      url: null,
      createdAt: now,
      updatedAt: now,
      synced: false,
    });
  }
}

// Singleton for the web app (extension uses its own instance)
export const db = new AppDatabase();

/** Wipes all local IndexedDB data. Call before bootstrap when user identity changes. */
export async function clearLocalDB(): Promise<void> {
  await db.transaction("rw", db.spaces, db.projects, db.tasks, async () => {
    await Promise.all([db.spaces.clear(), db.projects.clear(), db.tasks.clear()]);
  });
}

export async function archiveProject(projectId: string): Promise<void> {
  const now = new Date();
  await db.transaction("rw", db.projects, db.tasks, async () => {
    const project = await db.projects.get(projectId);
    if (!project) return;
    await db.projects.update(projectId, {
      archived: true,
      updatedAt: now,
      synced: false,
    });
    await db.tasks.where("projectId").equals(projectId).modify({
      status: "archived",
      updatedAt: now,
      synced: false,
    });
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  await db.transaction("rw", db.projects, db.tasks, async () => {
    await db.tasks.where("projectId").equals(projectId).delete();
    await db.projects.delete(projectId);
  });
}

export async function unarchiveProject(projectId: string): Promise<void> {
  const now = new Date();
  await db.transaction("rw", db.projects, db.tasks, async () => {
    const project = await db.projects.get(projectId);
    if (!project) return;
    await db.projects.update(projectId, {
      archived: false,
      updatedAt: now,
      synced: false,
    });
    const tasks = await db.tasks.where("projectId").equals(projectId).toArray();
    await Promise.all(
      tasks.map((task) => {
        const status =
          task.completedAt != null
            ? ("done" as const)
            : task.workingDate
              ? ("todo" as const)
              : ("inbox" as const);
        return db.tasks.update(task.id, {
          status,
          updatedAt: now,
          synced: false,
        });
      }),
    );
  });
}
