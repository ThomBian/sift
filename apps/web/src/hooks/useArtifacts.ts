import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import type { Artifact } from "@sift/shared";

export interface UseArtifactsResult {
  artifacts: Artifact[];
  totalTokens: number;
  loading: boolean;
}

export function useArtifacts(projectId: string): UseArtifactsResult {
  const artifacts = useLiveQuery(
    () => db.artifacts.where("projectId").equals(projectId).sortBy("createdAt"),
    [projectId],
  );

  const totalTokens =
    artifacts?.reduce(
      (sum, a) => sum + Math.ceil(a.content.length / 4),
      0,
    ) ?? 0;

  return {
    artifacts: artifacts ?? [],
    totalTokens,
    loading: artifacts === undefined,
  };
}
