import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { nanoid } from "nanoid";
import { db } from "../lib/db";
import { injectContext } from "@sift/shared";
import { useSkills } from "../contexts/SkillsContext";
import type { Project, Task, Artifact } from "@sift/shared";

export interface SkillPickerProps {
  project: Project;
  tasks: Task[];
  artifacts: Artifact[];
  onClose: () => void;
  onArtifactCreated: (artifact: Artifact) => void;
}

export default function SkillPicker({
  project,
  tasks,
  artifacts,
  onClose,
  onArtifactCreated,
}: SkillPickerProps) {
  const { skills } = useSkills();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const filtered = useMemo(
    () =>
      skills.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase()),
      ),
    [skills, query],
  );

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 100);
  }, [onClose]);

  const execute = useCallback(
    async (idx: number) => {
      const skill = filtered[idx];
      if (!skill) return;

      const injected = injectContext(
        skill.userPromptTemplate,
        skill.systemPrompt,
        project,
        tasks,
        artifacts,
      );

      await navigator.clipboard.writeText(injected);

      const now = new Date();
      const artifact: Artifact = {
        id: nanoid(),
        projectId: project.id,
        title: `${skill.emoji} ${skill.name}`,
        content: "",
        createdAt: now,
        updatedAt: now,
        synced: false,
      };
      await db.artifacts.add(artifact);

      onArtifactCreated(artifact);
      onClose();
    },
    [filtered, project, tasks, artifacts, onClose, onArtifactCreated],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        void execute(selectedIdx);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose, filtered.length, selectedIdx, execute]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[14vh] md:pt-[18vh] px-3 sm:px-4 bg-text/30 backdrop-blur-scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`${isClosing ? "animate-palette-out" : "animate-palette-in"} w-full max-w-[min(820px,calc(100vw-1.5rem))] border-[0.5px] border-border bg-bg/95 floating-panel shadow-panel`}
        role="dialog"
        aria-label="Skill picker"
      >
        {/* Header — same structure as CommandPalette */}
        <div className="flex items-center px-3 py-1.5 border-b border-[0.5px] border-border">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
            Skills
          </span>
          <span className="ml-auto font-mono text-[9px] text-dim">
            esc to close
          </span>
        </div>

        {/* Search input */}
        <div className="flex items-center px-3 py-2 border-b border-[0.5px] border-border">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter skills..."
            className="flex-1 bg-transparent outline-none font-sans text-sm text-text placeholder:text-dim"
          />
        </div>

        {/* Skill list */}
        <div className="flex flex-col max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 font-mono text-[10px] text-muted">
              No skills yet — add one via the avatar menu → Skills Library.
            </div>
          ) : (
            filtered.map((skill, idx) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => void execute(idx)}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`flex items-center gap-3 px-3 min-h-task-row transition-colors duration-150 text-left ${
                  idx === selectedIdx ? "bg-accent/5 laser-focus" : "hover:bg-surface-2"
                }`}
              >
                <span className="text-[13px] shrink-0 w-5 text-center leading-none">
                  {skill.emoji}
                </span>
                <span className="flex-1 text-sm font-medium tracking-[-0.02em] text-text truncate">
                  {skill.name}
                </span>
                {skill.description && (
                  <span className="font-mono text-[10px] text-muted shrink-0 max-w-48 truncate">
                    {skill.description}
                  </span>
                )}
                {idx === selectedIdx && (
                  <span className="font-mono text-[9px] text-dim uppercase tracking-[0.2em] shrink-0">
                    enter ↵
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
