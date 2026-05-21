import {
  useCallback,
  useEffect,
  useRef,
  useState,
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase()),
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
        onClose();
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
  }, [onClose, filtered.length, selectedIdx, execute]);

  return (
    <>
      <div
        className="fixed inset-0 bg-text/20 backdrop-blur-[12px]"
        style={{ zIndex: 60 }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[480px] bg-bg border border-[0.5px] border-border flex flex-col"
        style={{ zIndex: 70 }}
        role="dialog"
        aria-label="Skill picker"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[0.5px] border-border">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted shrink-0">
            SKILLS
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter skills..."
            className="flex-1 bg-transparent outline-none font-sans text-[13px] text-text placeholder:text-muted"
          />
        </div>

        <div className="flex flex-col max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 font-mono text-[10px] text-muted">
              No skills yet. Add one via the avatar menu → Skills Library.
            </div>
          ) : (
            filtered.map((skill, idx) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => void execute(idx)}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`flex items-start gap-3 px-4 py-2.5 text-left transition-colors duration-100 border-b border-[0.5px] border-border/50 ${
                  idx === selectedIdx ? "bg-accent/5" : "hover:bg-surface"
                }`}
              >
                <span className="text-[14px] shrink-0">{skill.emoji}</span>
                <div>
                  <div className="font-sans text-[13px] font-medium text-text">
                    {skill.name}
                  </div>
                  {skill.description && (
                    <div className="font-mono text-[10px] text-muted mt-0.5">
                      {skill.description}
                    </div>
                  )}
                </div>
                {idx === selectedIdx && (
                  <span className="ml-auto font-mono text-[9px] text-accent uppercase tracking-[0.06em] shrink-0 self-center">
                    Enter ↵
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
