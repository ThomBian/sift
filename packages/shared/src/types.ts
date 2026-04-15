// packages/shared/src/types.ts

export interface Space {
  id: string;
  name: string;
  color: string; // hex, e.g. "#5E6AD2"
  createdAt: Date;
  updatedAt: Date;
  synced: boolean; // false = pending push to Supabase
}

export interface Project {
  id: string;
  name: string;
  emoji: string | null; // single emoji character
  spaceId: string; // FK → Space
  dueDate: Date | null;
  archived: boolean;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export type TaskStatus = "inbox" | "todo" | "done" | "archived";
// inbox = no workingDate assigned yet
// todo  = triaged (has workingDate)

export interface Task {
  id: string;
  title: string;
  /** null = unassigned (inbox/today only until user picks a project) */
  projectId: string | null;
  status: TaskStatus;
  workingDate: Date | null; // drives Today view (local calendar day <= today)
  dueDate: Date | null; // shows red when past + not done
  createdAt: Date;
  updatedAt: Date; // last-write-wins sync key
  completedAt: Date | null;
  url: string | null;
  synced: boolean;
}
