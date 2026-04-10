import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
} from "react";
import { nanoid } from "nanoid";
import { db } from "../lib/db";
import { useTaskCounts } from "../hooks/useTasks";
import { Dropdown, EmojiPicker, getRandomEmoji } from "@sift/shared";
import type { Project } from "@sift/shared";

interface ProjectEditPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId?: string;
  project?: Project;
  initialField?: "name" | "emoji" | "dueDate" | "url";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR");
}

type ActiveChip = "name" | "emoji" | "dueDate" | "url";

const TAB_ORDER: ActiveChip[] = ["name", "emoji", "dueDate", "url"];

const CHIP_BASE =
  "inline-flex items-center gap-1 px-[9px] py-[3px] border-[0.5px] font-mono text-[11.5px] font-medium cursor-pointer whitespace-nowrap transition-colors duration-150";

function chipClass(
  chip: ActiveChip,
  activeChip: ActiveChip,
  isSet: boolean,
): string {
  const isActive = activeChip === chip;
  if (chip === "emoji") {
    if (isActive) return `${CHIP_BASE} border-accent text-accent bg-accent/5`;
    if (isSet) return `${CHIP_BASE} border-accent/30 text-accent bg-accent/5`;
    return `${CHIP_BASE} border-border text-muted bg-surface`;
  }
  if (chip === "url") {
    if (isActive) return `${CHIP_BASE} border-accent text-accent bg-accent/5`;
    if (isSet) return `${CHIP_BASE} border-accent/30 text-accent bg-accent/5`;
    return `${CHIP_BASE} border-border text-muted bg-surface`;
  }
  // dueDate
  if (isActive) return `${CHIP_BASE} border-red text-red bg-red/5`;
  if (isSet) return `${CHIP_BASE} border-red/30 text-red bg-red/5`;
  return `${CHIP_BASE} border-border text-muted bg-surface`;
}

export default function ProjectEditPalette({
  isOpen,
  onClose,
  spaceId,
  project,
  initialField = "name",
}: ProjectEditPaletteProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [activeChip, setActiveChip] = useState<ActiveChip>(initialField);
  const [query, setQuery] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const taskCounts = useTaskCounts();

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      (triggerRef.current as HTMLElement | null)?.focus();
    }, 100);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement;
    setIsClosing(false);
    setName(project?.name ?? "");
    setEmoji(project?.emoji ?? null);
    setDueDate(project?.dueDate ?? null);
    setUrl(project?.url ?? null);
    setActiveChip(initialField);
    setQuery("");
  }, [isOpen, project, initialField]);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  async function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date();
    if (project) {
      await db.projects.update(project.id, {
        name: trimmed,
        emoji,
        dueDate,
        url,
        updatedAt: now,
        synced: false,
      });
    } else {
      await db.projects.add({
        id: nanoid(),
        name: trimmed,
        emoji: emoji ?? getRandomEmoji(),
        spaceId: spaceId!,
        dueDate,
        url: null,
        archived: false,
        createdAt: now,
        updatedAt: now,
        synced: false,
      });
    }
    onClose();
  }

  function handleChipClick(chip: ActiveChip) {
    setActiveChip(chip);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleTabNext() {
    const idx = TAB_ORDER.indexOf(activeChip);
    const next = TAB_ORDER[(idx + 1) % TAB_ORDER.length];
    handleChipClick(next);
  }

  function handleEmojiSelect(selected: string) {
    setEmoji(selected);
    setActiveChip("name");
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleDateSelect(value: string | Date | null) {
    setDueDate(value instanceof Date ? value : null);
    setActiveChip("name");
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleClear() {
    if (activeChip === "emoji") {
      setEmoji(null);
    } else if (activeChip === "url") {
      setUrl(null);
    } else {
      setDueDate(null);
    }
    setActiveChip("name");
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      handleTabNext();
      return;
    }
    if (e.key === "Enter" && (activeChip === "name" || activeChip === "url")) {
      e.preventDefault();
      void handleConfirm();
    }
  }

  if (!isOpen && !isClosing) return null;

  const inputValue =
    activeChip === "name" ? name : activeChip === "url" ? (url ?? "") : query;
  const inputPlaceholder =
    activeChip === "emoji"
      ? "Search emojis…"
      : activeChip === "dueDate"
        ? "Pick a date…"
        : activeChip === "url"
          ? "Add a link…"
          : "Project name…";

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (activeChip === "url") {
      setUrl(e.target.value || null);
      return;
    }
    if (activeChip !== "name") {
      setQuery(e.target.value);
      return;
    }
    const val = e.target.value;
    if (val.endsWith("@c")) {
      setName(val.slice(0, -2));
      handleChipClick("emoji");
    } else if (val.endsWith("@d")) {
      setName(val.slice(0, -2));
      handleChipClick("dueDate");
    } else if (val.endsWith("@u")) {
      setName(val.slice(0, -2));
      handleChipClick("url");
    } else {
      setName(val);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[14vh] md:pt-[18vh] px-3 sm:px-4 bg-text/30 backdrop-blur-scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`${isClosing ? "animate-palette-out" : "animate-palette-in"} w-full max-w-[min(820px,calc(100vw-1.5rem))] border-[0.5px] border-border bg-bg/95 floating-panel shadow-panel`}
      >
        {/* Context row */}
        <div className="flex items-center px-3 py-1.5 border-b border-[0.5px] border-border">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
            {project ? `Editing · ${project.name}` : "New Project"}
          </span>
          <span className="ml-auto font-mono text-[9px] text-dim">
            esc to close
          </span>
        </div>

        {/* Input row */}
        <div className="flex items-center h-11 px-3 gap-2 border-[0.5px] border-transparent focus-within:border-accent transition-colors duration-150">
          <span className="text-dim text-[15px] shrink-0 select-none">+</span>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            aria-label={inputPlaceholder}
            className="flex-1 bg-transparent border-none text-[13.5px] text-text font-sans min-w-0"
            style={{ outline: "none", letterSpacing: "-0.1px" }}
          />
          <button
            type="button"
            onClick={() => handleChipClick("emoji")}
            className={chipClass("emoji", activeChip, emoji !== null)}
          >
            {emoji ? (
              <>{emoji}</>
            ) : (
              <>
                <span className="text-[10px] opacity-55">@c</span>&nbsp;icon
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleChipClick("dueDate")}
            className={chipClass("dueDate", activeChip, dueDate !== null)}
          >
            {dueDate ? (
              <>
                <span className="text-[10px] opacity-55">@d</span>&nbsp;
                {formatDate(dueDate)}
              </>
            ) : (
              <>
                <span className="text-[10px] opacity-55">@d</span>&nbsp;due
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleChipClick("url")}
            className={chipClass("url", activeChip, url !== null)}
          >
            {url ? (
              <>
                <span className="text-[10px] opacity-55">@u</span>&nbsp;
                {url.replace(/^https?:\/\//, "").slice(0, 15)}
                {url.replace(/^https?:\/\//, "").length > 15 ? "…" : ""}
              </>
            ) : (
              <>
                <span className="text-[10px] opacity-55">@u</span>&nbsp;link
              </>
            )}
          </button>
        </div>

        {/* Emoji picker — inline below input */}
        {activeChip === "emoji" && (
          <>
            <EmojiPicker query={query} onSelect={handleEmojiSelect} />
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center w-full px-4 py-1.5 border-t border-[0.5px] border-border bg-transparent text-muted font-mono text-[12px] cursor-pointer hover:text-text transition-colors duration-150"
            >
              Clear
            </button>
          </>
        )}

        {/* Date dropdown — reuses shared Dropdown with inline mode */}
        {activeChip === "dueDate" && (
          <>
            <Dropdown
              type="dueDate"
              projects={[]}
              query={query}
              onSelect={handleDateSelect}
              mode="inline"
              taskCounts={taskCounts}
            />
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center w-full px-4 py-1.5 border-t border-[0.5px] border-border bg-transparent text-muted font-mono text-[12px] cursor-pointer hover:text-text transition-colors duration-150"
            >
              Clear
            </button>
          </>
        )}

        {activeChip === "url" && url && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center w-full px-4 py-1.5 border-t border-[0.5px] border-border bg-transparent text-muted font-mono text-[12px] cursor-pointer hover:text-text transition-colors duration-150"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
