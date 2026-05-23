import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { nanoid } from "nanoid";
import { db } from "../lib/db";
import { useArtifacts } from "../hooks/useArtifacts";
import ArtifactDrawer from "../components/ArtifactDrawer";
import ConfirmModal from "../components/ConfirmModal";
import CommandPalette from "../components/CommandPalette";
import SkillPicker from "../components/SkillPicker";
import TaskRow from "../components/TaskRow";
import { listRowFocusClasses } from "../lib/listRowFocus";
import { useSpacesProjects } from "../hooks/useSpacesProjects";
import type { Artifact, Task } from "@sift/shared";

type FocusZone = "description" | "tasks" | "artifacts";

export default function ProjectWorkspaceView() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const project = useLiveQuery(
    () => (projectId ? db.projects.get(projectId) : undefined),
    [projectId],
  );
  const tasks = useLiveQuery(
    () =>
      projectId
        ? db.tasks
            .where("projectId")
            .equals(projectId)
            .filter((t) => t.status !== "archived")
            .sortBy("createdAt")
        : [],
    [projectId],
  );
  const { artifacts, totalTokens } = useArtifacts(projectId ?? "");

  const { spacesWithProjects } = useSpacesProjects();
  const spaceMap = Object.fromEntries(
    spacesWithProjects.map(({ space }) => [space.id, space])
  );

  const [focusZone, setFocusZone] = useState<FocusZone>("tasks");
  const [focusedTaskIdx, setFocusedTaskIdx] = useState(0);
  const [focusedArtifactIdx, setFocusedArtifactIdx] = useState(0);
  const [openArtifact, setOpenArtifact] = useState<Artifact | null>(null);
  const [newArtifactTitle, setNewArtifactTitle] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [deleteArtifact, setDeleteArtifact] = useState<Artifact | null>(null);
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [skillHint, setSkillHint] = useState(false);
  const skillHintTimerRef = useRef<number | null>(null);

  const newTitleInputRef = useRef<HTMLInputElement>(null);
  const editTitleInputRef = useRef<HTMLInputElement>(null);

  const [descEditing, setDescEditing] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);
  const descSaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (newArtifactTitle !== null) {
      requestAnimationFrame(() => newTitleInputRef.current?.focus());
    }
  }, [newArtifactTitle]);

  useEffect(() => {
    if (editingTitleId !== null) {
      requestAnimationFrame(() => editTitleInputRef.current?.focus());
    }
  }, [editingTitleId]);

  const showSkillHint = useCallback(() => {
    setSkillHint(true);
    if (skillHintTimerRef.current !== null) clearTimeout(skillHintTimerRef.current);
    skillHintTimerRef.current = window.setTimeout(() => setSkillHint(false), 4000);
  }, []);

  const openSkillPicker = useCallback(() => {
    setSkillPickerOpen(true);
  }, []);

  const saveDescription = useCallback(async (val: string) => {
    if (!projectId) return;
    await db.projects.update(projectId, {
      description: val.trim(),
      updatedAt: new Date(),
      synced: false,
    });
  }, [projectId]);

  const onDescChange = useCallback((val: string) => {
    setDescDraft(val);
    if (descSaveTimerRef.current !== null) clearTimeout(descSaveTimerRef.current);
    descSaveTimerRef.current = window.setTimeout(() => void saveDescription(val), 800);
  }, [saveDescription]);

  const exitDescEdit = useCallback(() => {
    if (descSaveTimerRef.current !== null) {
      clearTimeout(descSaveTimerRef.current);
      descSaveTimerRef.current = null;
    }
    void saveDescription(descDraft);
    setDescEditing(false);
  }, [descDraft, saveDescription]);

  useEffect(() => {
    if (descEditing) {
      requestAnimationFrame(() => descTextareaRef.current?.focus());
    }
  }, [descEditing]);

  useEffect(() => {
    return () => {
      if (descSaveTimerRef.current !== null) clearTimeout(descSaveTimerRef.current);
    };
  }, []);

  const createArtifact = useCallback(
    async (title: string): Promise<Artifact | undefined> => {
      if (!projectId || !title.trim()) return undefined;
      const now = new Date();
      const artifact: Artifact = {
        id: nanoid(),
        projectId,
        title: title.trim(),
        content: "",
        createdAt: now,
        updatedAt: now,
        synced: false,
      };
      await db.artifacts.add(artifact);
      return artifact;
    },
    [projectId],
  );

  const toggleTaskDone = useCallback(async (task: Task) => {
    const now = new Date();
    const isDone = task.status === "done";
    await db.tasks.update(task.id, {
      status: isDone ? "todo" : "done",
      completedAt: isDone ? null : now,
      updatedAt: now,
      synced: false,
    });
  }, []);

  const archiveTask = useCallback(async (task: Task) => {
    const now = new Date();
    await db.tasks.update(task.id, {
      status: "archived",
      updatedAt: now,
      synced: false,
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;

      if (inInput) {
        if (e.key === "Escape") {
          if (descEditing) {
            exitDescEdit();
            return;
          }
          setNewArtifactTitle(null);
          setEditingTitleId(null);
          (target as HTMLElement).blur();
        }
        return;
      }

      if (openArtifact || skillPickerOpen || cmdPaletteOpen) return;

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdPaletteOpen(true);
        return;
      }

      if (e.key === "Escape") {
        navigate("/projects");
        return;
      }

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        openSkillPicker();
        return;
      }

      if (e.key === "n" || e.key === "N") {
        setFocusZone("artifacts");
        setNewArtifactTitle("");
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        if (descEditing) exitDescEdit();
        setFocusZone((z) => {
          if (z === "tasks") return "artifacts";
          if (z === "artifacts") return "description";
          return "tasks";
        });
        return;
      }

      if (focusZone === "description" && !descEditing) {
        if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          setDescDraft(project?.description ?? "");
          setDescEditing(true);
          return;
        }
      }

      if (focusZone === "tasks") {
        const taskList = tasks ?? [];
        if (e.key === "ArrowDown") {
          setFocusedTaskIdx((i) => Math.min(i + 1, taskList.length - 1));
        } else if (e.key === "ArrowUp") {
          setFocusedTaskIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
          const task = taskList[focusedTaskIdx];
          if (task) void toggleTaskDone(task);
        } else if (e.key === "Backspace") {
          const task = taskList[focusedTaskIdx];
          if (task) void archiveTask(task);
        }
        return;
      }

      if (focusZone === "artifacts") {
        const cols = 4;
        if (e.key === "ArrowRight") {
          setFocusedArtifactIdx((i) => Math.min(i + 1, artifacts.length - 1));
        } else if (e.key === "ArrowLeft") {
          setFocusedArtifactIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === "ArrowDown") {
          setFocusedArtifactIdx((i) => Math.min(i + cols, artifacts.length - 1));
        } else if (e.key === "ArrowUp") {
          setFocusedArtifactIdx((i) => Math.max(i - cols, 0));
        } else if (e.key === " ") {
          e.preventDefault();
          const a = artifacts[focusedArtifactIdx];
          if (a) setOpenArtifact(a);
        } else if (e.key === "e" || e.key === "E") {
          const a = artifacts[focusedArtifactIdx];
          if (a) setEditingTitleId(a.id);
        } else if (e.key === "Backspace") {
          const a = artifacts[focusedArtifactIdx];
          if (a) setDeleteArtifact(a);
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    openArtifact, skillPickerOpen, cmdPaletteOpen, focusZone, tasks, artifacts,
    focusedTaskIdx, focusedArtifactIdx, descEditing, exitDescEdit, project,
    toggleTaskDone, archiveTask, navigate, openSkillPicker,
  ]);

  useEffect(() => {
    function onNewArtifact(e: Event) {
      const artifact = (e as CustomEvent<Artifact>).detail;
      setOpenArtifact(artifact);
      showSkillHint();
    }
    window.addEventListener("sift:skill-artifact-created", onNewArtifact);
    return () => window.removeEventListener("sift:skill-artifact-created", onNewArtifact);
  }, [showSkillHint]);

  useEffect(() => {
    function onOpen() { setSkillPickerOpen(true); }
    window.addEventListener("sift:open-skill-picker", onOpen);
    return () => window.removeEventListener("sift:open-skill-picker", onOpen);
  }, []);

  if (!project) return null;

  const taskList = tasks ?? [];

  const hints =
    focusZone === "description"
      ? [
          { key: "E", label: "edit" },
          { key: "Tab", label: "tasks" },
          { key: "ESC", label: "back" },
        ]
      : focusZone === "tasks"
      ? [
          { key: "↑↓", label: "tasks" },
          { key: "Enter", label: "done" },
          { key: "⌘K", label: "new task" },
          { key: "N", label: "new artifact" },
          { key: "Tab", label: "artifacts" },
          { key: "S", label: "skills" },
          { key: "ESC", label: "back" },
        ]
      : [
          { key: "↑↓←→", label: "navigate" },
          { key: "Space", label: "open" },
          { key: "N", label: "new" },
          { key: "E", label: "rename" },
          { key: "Tab", label: "description" },
          { key: "S", label: "skills" },
        ];

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Topbar */}
      <header className="flex items-center gap-3 h-12 px-view-x border-b-[0.5px] border-border bg-surface shrink-0">
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted border border-[0.5px] border-border px-1.5 py-0.5 hover:text-text transition-colors"
        >
          ← ESC
        </button>
        <span className="font-sans text-[15px] font-medium text-text tracking-[-0.02em]">
          {project.name}
        </span>
      </header>

      {/* Body */}
      <main className="flex-1 px-content-x py-6 flex flex-col gap-8">
        {/* Description */}
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mb-3">
            DESCRIPTION
          </div>
          <div
            onClick={() => {
              setFocusZone("description");
              if (!descEditing) {
                setDescDraft(project.description ?? "");
                setDescEditing(true);
              }
            }}
            className={`px-3 py-2.5 border-[0.5px] cursor-text ${
              descEditing
                ? "border-accent"
                : listRowFocusClasses(focusZone === "description")
            }`}
          >
            {descEditing ? (
              <textarea
                ref={descTextareaRef}
                value={descDraft}
                onChange={(e) => onDescChange(e.target.value)}
                placeholder="Describe this project…"
                rows={4}
                className="w-full bg-transparent font-sans text-[13px] text-text placeholder:text-muted outline-none resize-none leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    exitDescEdit();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <p className={`font-sans text-[13px] leading-relaxed whitespace-pre-wrap ${project.description ? "text-text" : "text-muted"}`}>
                  {project.description || "No description yet."}
                </p>
                {focusZone === "description" && (
                  <div className="mt-2 flex gap-3">
                    <span className="font-mono text-[9px] text-muted">
                      <span className="text-accent">E</span> edit
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Tasks */}
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mb-3">
            TASKS ({taskList.length})
          </div>
          {taskList.length === 0 ? (
            <p className="font-mono text-[10px] text-muted px-3">
              No tasks. Press ⌘K to add one.
            </p>
          ) : (
            <div role="list">
              {taskList.map((task, idx) => {
                const focused = focusZone === "tasks" && idx === focusedTaskIdx;
                const now = new Date();
                const fallbackSpace = { id: "__orphan__", name: "Unknown", color: "#888888", createdAt: now, updatedAt: now, synced: true };
                const space = project ? (spaceMap[project.spaceId] ?? fallbackSpace) : fallbackSpace;
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    project={project!}
                    space={space}
                    isFocused={focused}
                    onFocus={() => { setFocusZone("tasks"); setFocusedTaskIdx(idx); }}
                    onToggle={() => void toggleTaskDone(task)}
                    index={idx}
                    showProject={false}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Artifacts */}
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mb-3">
            ARTIFACTS ({artifacts.length})
            {totalTokens > 0 && (
              <span className="ml-2 normal-case">· ~{totalTokens.toLocaleString()} tok</span>
            )}
          </div>

          {artifacts.length === 0 && newArtifactTitle === null ? (
            <p className="font-mono text-[10px] text-muted">
              No artifacts yet. Press N to start writing, or S to generate one from a skill.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {artifacts.map((artifact, idx) => {
                const focused = focusZone === "artifacts" && idx === focusedArtifactIdx;
                const isEditingTitle = editingTitleId === artifact.id;
                return (
                  <div
                    key={artifact.id}
                    onClick={() => { setFocusZone("artifacts"); setFocusedArtifactIdx(idx); }}
                    onDoubleClick={() => setOpenArtifact(artifact)}
                    className={`border border-[0.5px] p-3 cursor-default bg-bg border-border ${listRowFocusClasses(focused)}`}
                  >
                    {isEditingTitle ? (
                      <input
                        ref={editTitleInputRef}
                        defaultValue={artifact.title}
                        className="w-full font-sans text-[12px] font-medium bg-transparent outline-none border-b border-[0.5px] border-accent text-text pb-0.5"
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          if (val) {
                            await db.artifacts.update(artifact.id, {
                              title: val,
                              updatedAt: new Date(),
                              synced: false,
                            });
                          }
                          setEditingTitleId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="font-sans text-[12px] font-medium text-text mb-2 truncate">
                        {artifact.title}
                      </div>
                    )}
                    <div className="flex flex-col gap-1 mb-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-1.5 bg-surface"
                          style={{ width: i === 2 ? "60%" : i === 1 ? "80%" : "100%" }}
                        />
                      ))}
                    </div>
                    <div className="font-mono text-[9px] text-muted">
                      ~{Math.ceil(artifact.content.length / 4)} tok
                    </div>
                  </div>
                );
              })}

              {newArtifactTitle !== null ? (
                <div className="border border-[0.5px] border-accent p-3 bg-bg">
                  <input
                    ref={newTitleInputRef}
                    value={newArtifactTitle}
                    onChange={(e) => setNewArtifactTitle(e.target.value)}
                    placeholder="Artifact title..."
                    className="w-full font-sans text-[12px] font-medium bg-transparent outline-none text-text placeholder:text-muted"
                    onBlur={async () => {
                      if (newArtifactTitle.trim()) {
                        await createArtifact(newArtifactTitle);
                      }
                      setNewArtifactTitle(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setNewArtifactTitle("")}
                  className="border border-[0.5px] border-dashed border-muted p-3 bg-transparent flex items-center justify-center hover:border-text transition-colors"
                >
                  <span className="font-mono text-[9px] text-muted">
                    <span className="text-accent">N</span> — new artifact
                  </span>
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Hintbar */}
      <footer className="flex items-center gap-5 px-view-x py-1.5 border-t-[0.5px] border-border bg-surface shrink-0">
        {skillHint ? (
          <span className="font-mono text-[9px] text-accent uppercase tracking-[0.06em]">
            COPIED TO CLIPBOARD — paste into your AI, then paste the response here
          </span>
        ) : (
          hints.map(({ key, label }) => (
            <span key={key} className="font-mono text-[9px] text-muted">
              <span className="text-accent">{key}</span> {label}
            </span>
          ))
        )}
      </footer>

      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        prefillProjectId={projectId}
      />

      {skillPickerOpen && project && tasks && (
        <SkillPicker
          project={project}
          tasks={tasks}
          artifacts={artifacts}
          onClose={() => setSkillPickerOpen(false)}
          onArtifactCreated={(artifact) => {
            setSkillPickerOpen(false);
            setOpenArtifact(artifact);
            showSkillHint();
          }}
        />
      )}

      {openArtifact && (
        <ArtifactDrawer
          artifact={openArtifact}
          onClose={() => setOpenArtifact(null)}
          onSkill={openSkillPicker}
        />
      )}

      {deleteArtifact && (
        <ConfirmModal
          message={`Delete "${deleteArtifact.title}"? This cannot be undone.`}
          onConfirm={async () => {
            await db.artifacts.delete(deleteArtifact.id);
            setDeleteArtifact(null);
            setFocusedArtifactIdx((i) => Math.max(0, i - 1));
          }}
          onCancel={() => setDeleteArtifact(null)}
        />
      )}
    </div>
  );
}
