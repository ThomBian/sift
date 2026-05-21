import type { Project, Task, Artifact } from "./types";

export function injectContext(
  userPromptTemplate: string,
  systemPrompt: string,
  project: Project,
  tasks: Task[],
  artifacts: Artifact[],
): string {
  const taskString = tasks
    .map((t) => `- [${t.status === "done" ? "x" : " "}] ${t.title}`)
    .join("\n");
  const artifactString = artifacts
    .map((a) => `## ${a.title}\n${a.content}`)
    .join("\n\n");

  const injected = userPromptTemplate
    .replace(/\{\{PROJECT_NAME\}\}/g, project.name)
    .replace(/\{\{PROJECT_DESCRIPTION\}\}/g, project.description)
    .replace(/\{\{CURRENT_TASKS\}\}/g, taskString)
    .replace(/\{\{PREVIOUS_ARTIFACTS\}\}/g, artifactString);

  return systemPrompt ? `${systemPrompt}\n\n${injected}` : injected;
}
