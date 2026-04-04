import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Space, Project } from '@speedy/shared';

export interface SpaceWithProjects {
  space: Space;
  projects: Project[];
}

export function useSpacesProjects(): { spacesWithProjects: SpaceWithProjects[] } {
  const spacesWithProjects =
    useLiveQuery(async () => {
      const spaces = (await db.spaces.toArray()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      const projects = (await db.projects.toArray()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      return spaces.map((space) => ({
        space,
        projects: projects.filter((p) => p.spaceId === space.id),
      }));
    }, []) ?? [];

  return { spacesWithProjects };
}
