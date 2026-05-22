import { useCallback, useEffect, useRef, useState } from "react";

const EXIT_MS = 120;

interface Section {
  title: string;
  shortcuts: { keys: string[]; label: string }[];
}

const LEFT_SECTIONS: Section[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["⌘K"], label: "New task" },
      { keys: ["⌘S"], label: "Skills library" },
      { keys: ["?"], label: "This reference" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["←", "→"], label: "Switch views" },
      { keys: ["V"], label: "Week / Month" },
    ],
  },
  {
    title: "Projects",
    shortcuts: [
      { keys: ["N"], label: "New project" },
      { keys: ["E"], label: "Edit name" },
      { keys: ["D"], label: "Due date" },
      { keys: ["C"], label: "Icon" },
      { keys: ["U"], label: "Link" },
      { keys: ["⌘O"], label: "Open link" },
      { keys: ["O"], label: "Open workspace" },
      { keys: ["Space"], label: "Expand / collapse" },
      { keys: ["A"], label: "Archive" },
      { keys: ["X"], label: "Delete" },
    ],
  },
];

const RIGHT_SECTIONS: Section[] = [
  {
    title: "Tasks",
    shortcuts: [
      { keys: ["↑", "↓"], label: "Navigate" },
      { keys: ["↵"], label: "Toggle done" },
      { keys: ["⌫"], label: "Archive" },
      { keys: ["D"], label: "Due date" },
      { keys: ["W"], label: "Today" },
      { keys: ["P"], label: "Project" },
      { keys: ["E"], label: "Edit" },
      { keys: ["U"], label: "Link" },
      { keys: ["⌘O"], label: "Open link" },
      { keys: ["Esc"], label: "Deselect" },
    ],
  },
  {
    title: "Skills Library",
    shortcuts: [
      { keys: ["↑", "↓"], label: "Navigate" },
      { keys: ["N"], label: "New skill" },
      { keys: ["E"], label: "Edit skill" },
      { keys: ["⌫"], label: "Delete" },
      { keys: ["Esc"], label: "Back" },
    ],
  },
];

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-[3px]">
      <span className="font-sans text-[12px] text-muted">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {keys.map((k) => (
          <kbd
            key={k}
            className="inline-flex items-center justify-center px-1.5 py-0.5 border-[0.5px] border-border-2 bg-surface-2 font-mono text-[10px] text-text leading-none min-w-[1.5rem]"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted mb-2">
        {section.title}
      </div>
      {section.shortcuts.map((s) => (
        <ShortcutRow key={s.label} keys={s.keys} label={s.label} />
      ))}
    </div>
  );
}

export default function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const [backdropOpaque, setBackdropOpaque] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitingRef = useRef(false);
  const exitTimeoutRef = useRef<number | null>(null);

  const runExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setIsExiting(true);
    setBackdropOpaque(false);
    exitTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    requestAnimationFrame(() => setBackdropOpaque(true));
    return () => {
      if (exitTimeoutRef.current !== null) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "?" || e.key === "/") {
        e.preventDefault();
        e.stopImmediatePropagation();
        runExit();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [runExit]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-text/20 transition-opacity duration-150 ${
        backdropOpaque ? "opacity-100" : "opacity-0"
      }`}
      onClick={runExit}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
        className={`w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] overflow-y-auto border-[0.5px] border-border bg-bg/95 shadow-panel backdrop-blur-panel floating-panel ${
          isExiting ? "animate-modal-out" : "animate-modal-in"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[0.5px] border-border">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Keyboard Shortcuts
          </span>
          <button
            type="button"
            onClick={runExit}
            className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted border-[0.5px] border-border px-1.5 py-0.5 hover:text-text transition-colors"
          >
            Esc
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-8 px-5 py-4">
          <div>
            {LEFT_SECTIONS.map((s) => (
              <SectionBlock key={s.title} section={s} />
            ))}
          </div>
          <div>
            {RIGHT_SECTIONS.map((s) => (
              <SectionBlock key={s.title} section={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
