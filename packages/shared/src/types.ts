// packages/shared/src/types.ts

export interface Space {
  id: string;
  name: string;
  color: string;      // hex, e.g. "#5E6AD2"
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;    // false = pending push to Supabase
}

export interface Project {
  id: string;
  name: string;
  emoji: string | null;   // single emoji character
  spaceId: string;    // FK → Space
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export type TaskStatus = 'inbox' | 'todo' | 'done' | 'archived';
// inbox = no workingDate assigned yet
// todo  = triaged (has workingDate)

export interface Task {
  id: string;
  title: string;
  projectId: string;          // FK → Project; space derived via project.spaceId
  status: TaskStatus;
  workingDate: Date | null;   // drives Today view (workingDate <= today)
  dueDate: Date | null;       // shows red when past + not done
  createdAt: Date;
  updatedAt: Date;            // last-write-wins sync key
  completedAt: Date | null;
  sourceUrl?: string;         // URL captured by extension
  synced: boolean;
}
