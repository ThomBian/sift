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
import PaletteShell, { usePaletteClose } from "./PaletteShell";
import PaletteInputRow from "./PaletteInputRow";
import { listRowFocusClasses } from "../lib/listRowFocus";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const { isClosing, handleClose } = usePaletteClose(onClose);

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
    <PaletteShell
      title="Skills"
      isClosing={isClosing}
      onClose={handleClose}
      role="dialog"
      aria-label="Skill picker"
    >
      {/* Search input */}
      <PaletteInputRow
        inputRef={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter skills..."
        icon={null}
      />

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
              className={`flex items-center gap-3 px-3 min-h-task-row text-left ${listRowFocusClasses(idx === selectedIdx)}`}
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
    </PaletteShell>
  );
}
