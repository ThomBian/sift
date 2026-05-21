import { describe, it, expect } from "vitest";
import { injectContext } from "../injectContext";
import type { Project, Task, Artifact } from "../types";

const now = new Date("2026-05-20T10:00:00Z");

const project: Project = {
  id: "p1",
  name: "Sift v2",
  description: "A sovereign task OS",
  emoji: "🚀",
  spaceId: "s1",
  dueDate: null,
  archived: false,
  url: null,
  createdAt: now,
  updatedAt: now,
  synced: false,
};

const tasks: Task[] = [
  { id: "t1", title: "Define personas", projectId: "p1", status: "todo",
    workingDate: null, dueDate: null, createdAt: now, updatedAt: now,
    completedAt: null, url: null, synced: false },
  { id: "t2", title: "Competitive analysis", projectId: "p1", status: "done",
    workingDate: null, dueDate: null, createdAt: now, updatedAt: now,
    completedAt: now, url: null, synced: false },
];

const artifacts: Artifact[] = [
  { id: "a1", projectId: "p1", title: "Discovery Notes",
    content: "## Findings\nUsers want speed.", createdAt: now, updatedAt: now, synced: false },
];

describe("injectContext", () => {
  it("replaces PROJECT_NAME", () => {
    const result = injectContext("Hello {{PROJECT_NAME}}", "", project, [], []);
    expect(result).toBe("Hello Sift v2");
  });

  it("replaces PROJECT_DESCRIPTION", () => {
    const result = injectContext("Desc: {{PROJECT_DESCRIPTION}}", "", project, [], []);
    expect(result).toBe("Desc: A sovereign task OS");
  });

  it("replaces CURRENT_TASKS with markdown checklist", () => {
    const result = injectContext("{{CURRENT_TASKS}}", "", project, tasks, []);
    expect(result).toBe("- [ ] Define personas\n- [x] Competitive analysis");
  });

  it("replaces PREVIOUS_ARTIFACTS with titled sections", () => {
    const result = injectContext("{{PREVIOUS_ARTIFACTS}}", "", project, [], artifacts);
    expect(result).toBe("## Discovery Notes\n## Findings\nUsers want speed.");
  });

  it("prepends system prompt separated by double newline", () => {
    const result = injectContext("User: {{PROJECT_NAME}}", "System instructions", project, [], []);
    expect(result).toBe("System instructions\n\nUser: Sift v2");
  });

  it("replaces all occurrences of the same variable", () => {
    const result = injectContext("{{PROJECT_NAME}} / {{PROJECT_NAME}}", "", project, [], []);
    expect(result).toBe("Sift v2 / Sift v2");
  });
});
