// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db, clearLocalDB } from "../lib/db";
import { useArtifacts } from "../hooks/useArtifacts";
import type { Artifact } from "@sift/shared";

const now = new Date("2026-05-20T10:00:00Z");

function makeArtifact(overrides?: Partial<Artifact>): Artifact {
  return {
    id: "a1",
    projectId: "p1",
    title: "Discovery Notes",
    content: "Some content here",
    createdAt: now,
    updatedAt: now,
    synced: false,
    ...overrides,
  };
}

beforeEach(async () => {
  await clearLocalDB();
});

describe("useArtifacts", () => {
  it("returns empty array when no artifacts exist", async () => {
    const { result } = renderHook(() => useArtifacts("p1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.artifacts).toEqual([]);
    expect(result.current.totalTokens).toBe(0);
  });

  it("returns artifacts for the given projectId", async () => {
    await db.artifacts.add(makeArtifact({ id: "a1", projectId: "p1" }));
    await db.artifacts.add(makeArtifact({ id: "a2", projectId: "p2" }));

    const { result } = renderHook(() => useArtifacts("p1"));
    await waitFor(() => expect(result.current.artifacts.length).toBe(1));
    expect(result.current.artifacts[0].id).toBe("a1");
  });

  it("computes totalTokens as ceil(contentLength / 4)", async () => {
    await db.artifacts.add(makeArtifact({ id: "a1", content: "abcdefgh" })); // 8 chars → 2 tok
    await db.artifacts.add(makeArtifact({ id: "a2", content: "abcd" }));     // 4 chars → 1 tok

    const { result } = renderHook(() => useArtifacts("p1"));
    await waitFor(() => expect(result.current.artifacts.length).toBe(2));
    expect(result.current.totalTokens).toBe(3);
  });
});
