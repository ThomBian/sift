import { nanoid } from "nanoid";
import type { TaskDraftPayload } from "@sift/shared";
import { getRandomEmoji } from "@sift/shared";
import { db } from "./db";
import { requestSync } from "./requestSync";
import type { SpaceWithProjects } from "../hooks/useSpacesProjects";

/** Returns project id for the task, creating a project first when `newProjectName` is set. */
export async function resolveTaskProjectId(
  partial: TaskDraftPayload,
  spacesWithProjects: SpaceWithProjects[],
): Promise<string | null> {
  if (partial.projectId != null) return partial.projectId;
  const raw = partial.newProjectName?.trim();
  if (!raw) return null;
  const spaceId = spacesWithProjects[0]?.space.id;
  if (!spaceId) return null;
  const now = new Date();
  const id = nanoid();
  await db.projects.add({
    id,
    name: raw,
    emoji: getRandomEmoji(),
    spaceId,
    dueDate: null,
    url: null,
    archived: false,
    createdAt: now,
    updatedAt: now,
    synced: false,
  });
  requestSync();
  return id;
}
