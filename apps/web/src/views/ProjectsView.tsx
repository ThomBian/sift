import {
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { archiveProject, unarchiveProject, deleteProject } from "@sift/shared";
import { useProjectTasks } from "../hooks/useTasks";
import { useTrackedTimeouts } from "../hooks/useTrackedTimeouts";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { useProjectNav, SHOW_ARCHIVED_TOGGLE_ID } from "../hooks/useProjectNav";
import TaskRow from "../components/TaskRow";
import HintBar from "../components/layout/HintBar";
import ConfirmModal from "../components/ConfirmModal";
import { db } from "../lib/db";
import { requestSync } from "../lib/requestSync";
import type { Task, Project, Space, ChipFocus } from "@sift/shared";
import type { SpaceGroup } from "../hooks/useTasks";

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1 bg-border overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${done} of ${total} tasks done`}
      >
        <div
          className="h-full bg-accent transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className="text-xs text-muted font-mono tabular-nums"
        aria-hidden="true"
      >
        {done}/{total}
      </span>
    </div>
  );
}

function dispatchEditTask(task: Task, chip: ChipFocus | null) {
  window.dispatchEvent(
    new CustomEvent("sift:edit-task", { detail: { task, chip } }),
  );
}

function findProjectGroupInSpace(
  groups: SpaceGroup[],
  projectId: string,
): { space: Space; project: Project; tasks: Task[] } | null {
  for (const g of groups) {
    for (const { project, tasks } of g.projects) {
      if (project.id === projectId) return { space: g.space, project, tasks };
    }
    for (const { project, tasks } of g.archivedProjects) {
      if (project.id === projectId) return { space: g.space, project, tasks };
    }
  }
  return null;
}

function nextFocusAfterRemove(
  orderedProjectIds: string[],
  removedId: string,
): string | null {
  const idx = orderedProjectIds.indexOf(removedId);
  if (idx === -1) return null;
  if (idx < orderedProjectIds.length - 1)
    return orderedProjectIds[idx + 1] ?? null;
  if (idx > 0) return orderedProjectIds[idx - 1] ?? null;
  return null;
}

const ARCHIVE_EXIT_MS = 250;

export default function ProjectsView() {
  const [groups, archivedCount] = useProjectTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());
  const [exitingProjectIds, setExitingProjectIds] = useState(new Set<string>());
  const [navMode, setNavMode] = useState<"project" | "task">("project");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null,
  );
  const [showArchived, setShowArchived] = useState(false);
  const [archiveConfirmProject, setArchiveConfirmProject] =
    useState<Project | null>(null);
  const archiveConfirmRef = useRef<Project | null>(null);
  archiveConfirmRef.current = archiveConfirmProject;
  const [deleteConfirmProject, setDeleteConfirmProject] =
    useState<Project | null>(null);
  const deleteConfirmRef = useRef<Project | null>(null);
  deleteConfirmRef.current = deleteConfirmProject;
  const { focusedProjectId, setFocusedProjectId, handleProjectKeyDown } =
    useProjectNav();

  const orderedNavIds = useMemo(() => {
    const ids: string[] = [];
    for (const g of groups) {
      for (const { project } of g.projects) {
        ids.push(project.id);
      }
    }
    if (archivedCount > 0) {
      ids.push(SHOW_ARCHIVED_TOGGLE_ID);
    }
    if (showArchived) {
      for (const g of groups) {
        for (const { project } of g.archivedProjects) {
          ids.push(project.id);
        }
      }
    }
    return ids;
  }, [groups, showArchived, archivedCount]);

  const orderedProjectIdsOnly = useMemo(
    () => orderedNavIds.filter((id) => id !== SHOW_ARCHIVED_TOGGLE_ID),
    [orderedNavIds],
  );

  const orderedProjectIdsRef = useRef(orderedProjectIdsOnly);
  orderedProjectIdsRef.current = orderedProjectIdsOnly;

  const orderedNavIdSet = useMemo(
    () => new Set(orderedNavIds),
    [orderedNavIds],
  );

  const scheduleExit = useTrackedTimeouts();

  const archivedPrefixBySpace = useMemo(() => {
    const prefixes = new Map<string, number>();
    let total = 0;
    for (const g of groups) {
      prefixes.set(g.space.id, total);
      total += g.archivedProjects.length;
    }
    return prefixes;
  }, [groups]);

  const visibleProjectsOrdered = useMemo(() => {
    const out: Project[] = [];
    for (const g of groups) {
      for (const { project } of g.projects) out.push(project);
      if (showArchived) {
        for (const { project } of g.archivedProjects) out.push(project);
      }
    }
    return out;
  }, [groups, showArchived]);

  const findVisibleProject = useCallback(
    (id: string | null): Project | null => {
      if (!id || id === SHOW_ARCHIVED_TOGGLE_ID) return null;
      return visibleProjectsOrdered.find((p) => p.id === id) ?? null;
    },
    [visibleProjectsOrdered],
  );

  useEffect(() => {
    if (!focusedProjectId) return;
    if (focusedProjectId === SHOW_ARCHIVED_TOGGLE_ID) {
      if (archivedCount === 0) setFocusedProjectId(null);
      return;
    }
    if (!orderedNavIdSet.has(focusedProjectId)) {
      setFocusedProjectId(null);
    }
  }, [archivedCount, focusedProjectId, orderedNavIdSet, setFocusedProjectId]);

  const handleToggle = useCallback(
    (task: Task) => {
      if (task.status === "archived") return;
      if (task.status === "done") {
        const now = new Date();
        void db.tasks
          .update(task.id, {
            status: task.workingDate ? "todo" : "inbox",
            completedAt: null,
            updatedAt: now,
            synced: false,
          })
          .then(() => requestSync());
      } else {
        setExitingIds((prev) => new Set([...prev, task.id]));
        scheduleExit(() => {
          const now = new Date();
          void db.tasks
            .update(task.id, {
              status: "done",
              completedAt: now,
              updatedAt: now,
              synced: false,
            })
            .then(() => requestSync());
          setExitingIds((prev) => {
            const n = new Set(prev);
            n.delete(task.id);
            return n;
          });
        }, 160);
      }
    },
    [scheduleExit],
  );
  const { focusedId, setFocusedId, handleKeyDown } =
    useKeyboardNav(handleToggle);

  const expandedTasks = useMemo<Task[]>(() => {
    if (!expandedProjectId) return [];
    const found = findProjectGroupInSpace(groups, expandedProjectId);
    if (!found) return [];
    if (found.project.archived) return found.tasks;
    return found.tasks.filter((t) => t.status !== "archived");
  }, [groups, expandedProjectId]);

  useEffect(() => {
    if (focusedId !== null && !expandedTasks.find((t) => t.id === focusedId)) {
      setFocusedId(null);
    }
  }, [expandedTasks, focusedId, setFocusedId]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("sift:project-focused", {
        detail: { projectId: focusedProjectId },
      }),
    );
  }, [focusedProjectId]);

  const handleArchiveConfirm = useCallback(() => {
    const p = archiveConfirmRef.current;
    if (!p) return;
    setArchiveConfirmProject(null);
    const id = p.id;
    const idsSnapshot = [...orderedProjectIdsRef.current];
    setExitingProjectIds((prev) => new Set(prev).add(id));
    scheduleExit(() => {
      void archiveProject(id).then(() => requestSync());
      setExitingProjectIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      const next = nextFocusAfterRemove(idsSnapshot, id);
      setFocusedProjectId(next);
    }, ARCHIVE_EXIT_MS);
  }, [setFocusedProjectId, scheduleExit]);

  const handleDeleteConfirm = useCallback(() => {
    const p = deleteConfirmRef.current;
    if (!p) return;
    setDeleteConfirmProject(null);
    const idsSnapshot = [...orderedProjectIdsRef.current];
    void deleteProject(p.id).then(() => requestSync());
    const next = nextFocusAfterRemove(idsSnapshot, p.id);
    setFocusedProjectId(next);
  }, [setFocusedProjectId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (archiveConfirmProject || deleteConfirmProject) return;

      if (navMode === "task") {
        if (e.key === " ") {
          e.preventDefault();
          setNavMode("project");
          setFocusedId(null);
          setExpandedProjectId(null);
          return;
        }
        const focused =
          focusedId !== null
            ? (expandedTasks.find((t) => t.id === focusedId) ?? null)
            : null;
        if (focused) {
          if (e.key === "d" || e.key === "D") {
            e.preventDefault();
            dispatchEditTask(focused, "dueDate");
            return;
          }
          if (e.key === "w" || e.key === "W") {
            e.preventDefault();
            dispatchEditTask(focused, "workingDate");
            return;
          }
          if (e.key === "p" || e.key === "P") {
            e.preventDefault();
            dispatchEditTask(focused, "project");
            return;
          }
          if (e.key === "e" || e.key === "E") {
            e.preventDefault();
            dispatchEditTask(focused, null);
            return;
          }
          if (e.key === "u" || e.key === "U") {
            e.preventDefault();
            dispatchEditTask(focused, "url");
            return;
          }
          if (e.metaKey && e.key === "o") {
            e.preventDefault();
            if (focused.url)
              window.open(focused.url, "_blank", "noopener,noreferrer");
            return;
          }
        }
        if (e.key === "ArrowDown") {
          const currentIndex = expandedTasks.findIndex(
            (t) => t.id === focusedId,
          );
          if (currentIndex === expandedTasks.length - 1) {
            e.preventDefault();
            setFocusedId(null);
            setExpandedProjectId(null);
            setNavMode("project");
            const expId = expandedProjectId;
            const pIdx = expId ? orderedNavIds.indexOf(expId) : -1;
            if (pIdx !== -1 && pIdx < orderedNavIds.length - 1) {
              setFocusedProjectId(orderedNavIds[pIdx + 1]!);
            } else {
              setFocusedProjectId(null);
            }
            return;
          }
        }
        if (e.key === "ArrowUp") {
          const currentIndex = expandedTasks.findIndex(
            (t) => t.id === focusedId,
          );
          if (currentIndex === 0) {
            e.preventDefault();
            setFocusedId(null);
            setNavMode("project");
            return;
          }
        }
        handleKeyDown(e, expandedTasks);
      } else {
        if (
          focusedProjectId !== null &&
          focusedProjectId !== SHOW_ARCHIVED_TOGGLE_ID
        ) {
          const focusedProject = findVisibleProject(focusedProjectId);
          if (focusedProject) {
            if (e.key === "n" || e.key === "N") {
              e.preventDefault();
              window.dispatchEvent(
                new CustomEvent("sift:new-project", {
                  detail: { spaceId: focusedProject.spaceId },
                }),
              );
              return;
            }
            if (e.key === "e" || e.key === "E") {
              e.preventDefault();
              window.dispatchEvent(
                new CustomEvent("sift:edit-project", {
                  detail: { project: focusedProject, field: "name" },
                }),
              );
              return;
            }
            if (e.key === "d" || e.key === "D") {
              e.preventDefault();
              window.dispatchEvent(
                new CustomEvent("sift:edit-project", {
                  detail: { project: focusedProject, field: "dueDate" },
                }),
              );
              return;
            }
            if (e.key === "c" || e.key === "C") {
              e.preventDefault();
              window.dispatchEvent(
                new CustomEvent("sift:edit-project", {
                  detail: { project: focusedProject, field: "emoji" },
                }),
              );
              return;
            }
            if (e.key === "u" || e.key === "U") {
              e.preventDefault();
              window.dispatchEvent(
                new CustomEvent("sift:edit-project", {
                  detail: { project: focusedProject, field: "url" },
                }),
              );
              return;
            }
            if (e.metaKey && e.key === "o") {
              e.preventDefault();
              if (focusedProject.url)
                window.open(
                  focusedProject.url,
                  "_blank",
                  "noopener,noreferrer",
                );
              return;
            }
            if (e.key === " ") {
              e.preventDefault();
              if (expandedProjectId === focusedProjectId) {
                setExpandedProjectId(null);
                setNavMode("project");
              } else {
                setExpandedProjectId(focusedProjectId);
                setNavMode("task");
              }
              return;
            }
            if (e.key === "a" || e.key === "A") {
              e.preventDefault();
              if (focusedProject.archived) {
                void unarchiveProject(focusedProject.id).then(() =>
                  requestSync(),
                );
              } else {
                setArchiveConfirmProject(focusedProject);
              }
              return;
            }
            if (e.key === "x" || e.key === "X") {
              e.preventDefault();
              setDeleteConfirmProject(focusedProject);
              return;
            }
          }
        }
        if (e.key === "n" || e.key === "N") {
          const firstSpaceId =
            visibleProjectsOrdered[0]?.spaceId ?? groups[0]?.space.id;
          if (firstSpaceId) {
            e.preventDefault();
            window.dispatchEvent(
              new CustomEvent("sift:new-project", {
                detail: { spaceId: firstSpaceId },
              }),
            );
          }
          return;
        }
        handleProjectKeyDown(e, {
          orderedIds: orderedNavIds,
          onSpaceOnToggle: () => setShowArchived((v) => !v),
        });
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    navMode,
    focusedProjectId,
    focusedId,
    expandedProjectId,
    visibleProjectsOrdered,
    expandedTasks,
    handleKeyDown,
    handleProjectKeyDown,
    groups,
    orderedNavIds,
    findVisibleProject,
    archiveConfirmProject,
    deleteConfirmProject,
  ]);

  const focusState =
    navMode === "task" && focusedId !== null ? "task" : "project";

  const focusedVisible = findVisibleProject(focusedProjectId);
  const archiveHint =
    focusState === "project" &&
    focusedProjectId &&
    focusedProjectId !== SHOW_ARCHIVED_TOGGLE_ID &&
    focusedVisible
      ? focusedVisible.archived
        ? "unarchive"
        : "archive"
      : undefined;

  const archiveMessage: ReactNode = archiveConfirmProject ? (
    <>
      Archive &quot;{" "}
      <span className="text-accent">{archiveConfirmProject.name}</span> &quot;?
      Tasks will be archived too.
    </>
  ) : null;

  const renderProjectBlock = (
    space: Space,
    project: Project,
    tasks: Task[],
    opts: { archived: boolean; staggerIndex?: number },
  ) => {
    const { archived, staggerIndex } = opts;
    const done = tasks.filter(
      (t) =>
        t.status === "done" ||
        (t.status === "archived" && t.completedAt != null),
    ).length;
    const activeTasks = archived
      ? tasks
      : tasks.filter((t) => t.status !== "archived");
    const isFocusedProject = focusedProjectId === project.id;
    const isExpanded = expandedProjectId === project.id;
    const exiting = exitingProjectIds.has(project.id);

    const focusShadowClass = isFocusedProject
      ? archived
        ? "shadow-laser-archive"
        : "shadow-laser-soft"
      : "";
    // When focused, raise opacity so the glow and accent text are clearly visible
    const archivedRowClass = archived
      ? isFocusedProject
        ? "opacity-70"
        : "opacity-40"
      : "";
    const enterDelay =
      archived && staggerIndex !== undefined && !exiting
        ? { animationDelay: `${staggerIndex * 25}ms` }
        : undefined;

    return (
      <div
        key={project.id}
        role="button"
        tabIndex={archived ? -1 : 0}
        className={`mb-4 transition-[opacity,box-shadow] duration-150 ease-spring ${focusShadowClass} ${archivedRowClass} ${
          exiting ? "animate-task-exit" : archived ? "animate-task-enter" : ""
        }`}
        style={enterDelay}
        onClick={() => setFocusedProjectId(project.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFocusedProjectId(project.id);
          }
        }}
      >
        <div className="px-4 py-2 border-b border-[0.5px] border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`font-mono text-[11px] flex items-center gap-1.5 min-w-0 ${
                isFocusedProject ? "text-accent" : "text-text"
              }`}
            >
              {project.emoji ? (
                <span
                  className="shrink-0 text-sm leading-none"
                  aria-hidden="true"
                >
                  {project.emoji}
                </span>
              ) : null}
              <span className="truncate">{project.name}</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-dim hover:text-accent transition-colors"
                  title={project.url}
                  aria-label="Visit project link"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M7 1h4m0 0v4m0-4L5 7"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              )}
              {project.dueDate && (
                <span className="font-mono text-[10px] text-muted">
                  {project.dueDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
          <ProgressBar done={done} total={tasks.length} />
        </div>

        {isExpanded &&
          (activeTasks.length === 0 ? (
            <p className="font-mono text-[10px] text-muted px-4 py-3 uppercase tracking-[0.1em]">
              No tasks.
            </p>
          ) : (
            <div role="list">
              {activeTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={project}
                  space={space}
                  isFocused={navMode === "task" && focusedId === task.id}
                  onFocus={() => {
                    setNavMode("task");
                    setFocusedId(task.id);
                  }}
                  onToggle={() => handleToggle(task)}
                  exiting={exitingIds.has(task.id)}
                  showProject={false}
                />
              ))}
            </div>
          ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {archiveConfirmProject ? (
        <ConfirmModal
          message={archiveMessage}
          onConfirm={handleArchiveConfirm}
          onCancel={() => setArchiveConfirmProject(null)}
        />
      ) : null}
      {deleteConfirmProject ? (
        <ConfirmModal
          message={
            <>
              Delete &quot;
              <span className="text-red">{deleteConfirmProject.name}</span>
              &quot;? All tasks will be permanently removed.
            </>
          }
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmProject(null)}
        />
      ) : null}

      <div className="flex-1 overflow-y-auto min-h-0">
        {groups.map(({ space, projects: ps }) => (
          <div key={space.id} className="mb-6">
            <div className="flex items-center gap-2 px-4 py-2 mt-2">
              <span
                className="w-1.5 h-1.5 shrink-0"
                style={{ backgroundColor: space.color }}
              />
              <span className="text-[9px] text-muted font-mono uppercase tracking-[0.2em]">
                {space.name}
              </span>
            </div>

            {ps.map(({ project, tasks }) =>
              renderProjectBlock(space, project, tasks, { archived: false }),
            )}
          </div>
        ))}

        {archivedCount > 0 ? (
          <button
            type="button"
            aria-expanded={showArchived}
            className={`w-full text-left px-4 py-3 font-mono text-[11px] border-t border-[0.5px] border-border transition-[background-color,box-shadow] duration-150 ease-spring outline-none ${
              focusedProjectId === SHOW_ARCHIVED_TOGGLE_ID
                ? "bg-accent/5 shadow-laser"
                : ""
            }`}
            onClick={() => setShowArchived((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <svg
                className={`shrink-0 size-3 transition-transform duration-150 ease-spring ${
                  showArchived ? "rotate-90" : "rotate-0"
                } ${focusedProjectId === SHOW_ARCHIVED_TOGGLE_ID ? "text-accent" : "text-muted"}`}
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M3.5 1.5 L8.5 6 L3.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              </svg>
              <span
                className={
                  focusedProjectId === SHOW_ARCHIVED_TOGGLE_ID
                    ? "text-accent"
                    : "text-text"
                }
              >
                Show archived ({archivedCount})
              </span>
            </span>
          </button>
        ) : null}

        {showArchived
          ? groups.map(({ space, archivedProjects: aps }) =>
              aps.length > 0 ? (
                <div key={`${space.id}-archived`} className="mb-6">
                  <div className="flex items-center gap-2 px-4 py-2 mt-2">
                    <span
                      className="w-1.5 h-1.5 shrink-0 opacity-40"
                      style={{ backgroundColor: space.color }}
                    />
                    <span className="text-[9px] text-muted font-mono uppercase tracking-[0.2em]">
                      Archived — {space.name}
                    </span>
                  </div>
                  {aps.map(({ project, tasks }, i) =>
                    renderProjectBlock(space, project, tasks, {
                      archived: true,
                      staggerIndex:
                        (archivedPrefixBySpace.get(space.id) ?? 0) + i,
                    }),
                  )}
                </div>
              ) : null,
            )
          : null}

        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-16 text-center">
            <p className="font-mono text-[11px] text-muted uppercase tracking-[0.15em]">
              No projects.
            </p>
            <p className="font-mono text-[10px] text-dim max-w-[260px] leading-relaxed">
              Press N to create your first project.
            </p>
          </div>
        )}
      </div>

      <HintBar
        focusState={focusState as "none" | "project" | "task"}
        archiveHint={archiveHint}
        projectExpanded={
          expandedProjectId === focusedProjectId && focusedProjectId !== null
        }
      />
    </div>
  );
}
