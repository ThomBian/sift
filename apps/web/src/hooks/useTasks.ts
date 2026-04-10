import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import type { Task, Space, Project } from "@sift/shared";

const TERMINAL_STATUSES = ["done", "archived"] as const;

/** Inbox: workingDate === null AND status not in done/archived */
export function useInboxTasks(): Task[] {
  return (
    useLiveQuery(
      () =>
        db.tasks
          .filter(
            (t) =>
              t.workingDate === null &&
              !TERMINAL_STATUSES.includes(
                t.status as (typeof TERMINAL_STATUSES)[number],
              ),
          )
          .toArray(),
      [],
    ) ?? []
  );
}

/** Today: workingDate <= today AND status not in done/archived */
export function useTodayTasks(): Task[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return (
    useLiveQuery(
      () =>
        db.tasks
          .filter(
            (t) =>
              t.workingDate !== null &&
              t.workingDate <= todayStart &&
              !TERMINAL_STATUSES.includes(
                t.status as (typeof TERMINAL_STATUSES)[number],
              ),
          )
          .toArray(),
      [],
    ) ?? []
  );
}

export interface ProjectGroup {
  project: Project;
  tasks: Task[];
}

export interface SpaceGroup {
  space: Space;
  projects: ProjectGroup[];
  archivedProjects: ProjectGroup[];
}

function taskCountsAsDone(t: Task): boolean {
  return (
    t.status === "done" || (t.status === "archived" && t.completedAt != null)
  );
}

function tasksForProject(tasks: Task[], project: Project): Task[] {
  return tasks
    .filter((t) => {
      if (t.projectId !== project.id) return false;
      if (project.archived) return true;
      return t.status !== "archived";
    })
    .sort((a, b) => {
      const aDone = taskCountsAsDone(a) ? 1 : 0;
      const bDone = taskCountsAsDone(b) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
}

type ProjectTasksLive = { groups: SpaceGroup[]; archivedCount: number };

/** Projects: tasks grouped by space → active / archived project lists (archived projects include archived-status tasks) */
export function useProjectTasks(): readonly [SpaceGroup[], number] {
  const data = useLiveQuery(async (): Promise<ProjectTasksLive> => {
    const [spacesRaw, projectsRaw, allTasks] = await Promise.all([
      db.spaces.toArray(),
      db.projects.toArray(),
      db.tasks.toArray(),
    ]);
    const spaces = spacesRaw.sort((a, b) => a.name.localeCompare(b.name));
    const projects = projectsRaw.sort((a, b) => a.name.localeCompare(b.name));

    let archivedCount = 0;
    const groups = spaces.map((space) => {
      const spaceProjects = projects.filter((p) => p.spaceId === space.id);
      const active = spaceProjects.filter((p) => !p.archived);
      const archived = spaceProjects.filter((p) => p.archived);
      archivedCount += archived.length;
      return {
        space,
        projects: active.map((project) => ({
          project,
          tasks: tasksForProject(allTasks, project),
        })),
        archivedProjects: archived.map((project) => ({
          project,
          tasks: tasksForProject(allTasks, project),
        })),
      };
    });
    return { groups, archivedCount };
  }, []) ?? { groups: [], archivedCount: 0 };

  return [data.groups, data.archivedCount] as const;
}

export function useTasks(view: "inbox" | "today"): Task[] {
  const inbox = useInboxTasks();
  const today = useTodayTasks();
  return view === "inbox" ? inbox : today;
}

export function useTaskCounts() {
  return (
    useLiveQuery(async () => {
      const tasks = await db.tasks
        .filter((t) => t.status !== "done" && t.status !== "archived")
        .toArray();
      const counts: Record<string, number> = {};
      for (const t of tasks) {
        const d = t.dueDate || t.workingDate;
        if (!d) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        counts[key] = (counts[key] || 0) + 1;
      }
      return counts;
    }, []) ?? {}
  );
}
