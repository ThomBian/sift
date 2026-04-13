import { useState, useMemo, type ReactNode } from "react";
import TaskRow from "./TaskRow";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import type { Task, Project, Space } from "@sift/shared";

/** Shown when a task has no project or the project row is missing (e.g. sync race). */
function orphanProjectContext(task: Task): { project: Project; space: Space } {
  const now = new Date();
  const unassigned = task.projectId == null;
  return {
    project: {
      id: task.projectId ?? "__unassigned__",
      name: unassigned ? "No project" : "Unknown project",
      emoji: null,
      spaceId: "__orphan__",
      dueDate: null,
      archived: false,
      url: null,
      createdAt: now,
      updatedAt: now,
      synced: true,
    },
    space: {
      id: "__orphan__",
      name: "Unknown",
      color: "#888888",
      createdAt: now,
      updatedAt: now,
      synced: true,
    },
  };
}

interface TaskListProps {
  tasks: Task[];
  focusedId: string | null;
  onFocus: (id: string) => void;
  onToggle?: (task: Task) => void;
  exitingIds?: Set<string>;
  emptyState?: ReactNode;
}

export default function TaskList({
  tasks,
  focusedId,
  onFocus,
  onToggle,
  exitingIds,
  emptyState,
}: TaskListProps) {
  const [doneExpanded, setDoneExpanded] = useState(false);
  const { spacesWithProjects, spacesProjectsReady } = useSpacesProjects();

  const activeTasks = tasks.filter(
    (t) => t.status !== "done" && t.status !== "archived",
  );
  const doneTasks = tasks.filter((t) => t.status === "done");

  const projectMap = useMemo(() => {
    const map = new Map<string, { project: Project; space: Space }>();
    for (const { space, projects } of spacesWithProjects) {
      for (const project of projects) {
        map.set(project.id, { project, space });
      }
    }
    return map;
  }, [spacesWithProjects]);

  if (!spacesProjectsReady) {
    return (
      <div
        className="flex-1 min-h-[120px]"
        aria-busy="true"
        aria-label="Loading tasks"
      />
    );
  }

  return (
    <div className="flex-1">
      {activeTasks.length === 0 &&
        doneTasks.length === 0 &&
        (emptyState ?? (
          <p className="font-mono text-[11px] text-dim px-4 py-8 text-center uppercase tracking-[0.1em]">
            No tasks.
          </p>
        ))}

      {activeTasks.length > 0 ? (
        <div role="list">
          {activeTasks.map((task, i) => {
            const ctx =
              task.projectId != null
                ? projectMap.get(task.projectId)
                : undefined;
            const resolved = ctx ?? orphanProjectContext(task);
            return (
              <TaskRow
                key={task.id}
                task={task}
                project={resolved.project}
                space={resolved.space}
                isFocused={focusedId === task.id}
                onFocus={() => onFocus(task.id)}
                onToggle={onToggle ? () => onToggle(task) : undefined}
                exiting={exitingIds?.has(task.id)}
                index={i}
              />
            );
          })}
        </div>
      ) : null}

      {doneTasks.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setDoneExpanded((v) => !v)}
            className="flex items-center gap-2 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-dim hover:text-text transition-colors w-full"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className={`transition-transform ${doneExpanded ? "" : "-rotate-90"}`}
              aria-hidden="true"
            >
              <path
                d="M2 3.5L5 6.5L8 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            Done · {doneTasks.length}
          </button>

          {doneExpanded ? (
            <div role="list">
              {doneTasks.map((task) => {
                const ctx =
                  task.projectId != null
                    ? projectMap.get(task.projectId)
                    : undefined;
                const resolved = ctx ?? orphanProjectContext(task);
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    project={resolved.project}
                    space={resolved.space}
                    isFocused={focusedId === task.id}
                    onFocus={() => onFocus(task.id)}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
