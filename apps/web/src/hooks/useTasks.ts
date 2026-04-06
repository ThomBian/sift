import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Task, Space, Project } from '@sift/shared';

const TERMINAL_STATUSES = ['done', 'archived'] as const;

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
                t.status as (typeof TERMINAL_STATUSES)[number]
              )
          )
          .toArray(),
      []
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
                t.status as (typeof TERMINAL_STATUSES)[number]
              )
          )
          .toArray(),
      []
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
}

/** Projects: all tasks (including done) grouped by space → project */
export function useProjectTasks(): SpaceGroup[] {
  return (
    useLiveQuery(async () => {
      const [spacesRaw, projectsRaw, tasks] = await Promise.all([
        db.spaces.toArray(),
        db.projects.toArray(),
        db.tasks.where('status').notEqual('archived').toArray(),
      ]);
      const spaces = spacesRaw.sort((a, b) => a.name.localeCompare(b.name));
      const projects = projectsRaw.sort((a, b) => a.name.localeCompare(b.name));

      return spaces.map((space) => {
        const spaceProjects = projects.filter((p) => p.spaceId === space.id);
        return {
          space,
          projects: spaceProjects.map((project) => ({
            project,
            tasks: tasks.filter((t) => t.projectId === project.id),
          })),
        };
      });
    }, []) ?? []
  );
}

export function useTasks(view: 'inbox' | 'today'): Task[] {
  const inbox = useInboxTasks();
  const today = useTodayTasks();
  return view === 'inbox' ? inbox : today;
}
