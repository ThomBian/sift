import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { db } from "../lib/db";
import type { Artifact } from "@sift/shared";

/**
 * Explicit element map — Tailwind's preflight strips default heading/list styling,
 * so each tag is restyled with the design tokens (zero-radius, Geist, JetBrains mono).
 */
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-sans font-medium text-text text-[22px] tracking-[-0.02em] mt-6 mb-3 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-sans font-medium text-text text-[18px] tracking-[-0.02em] mt-5 mb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-sans font-medium text-text text-[15px] tracking-[-0.02em] mt-4 mb-1.5 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-text leading-relaxed my-2.5">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2.5 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2.5 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="text-text leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent pl-3 my-3 text-muted italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-0 border-t border-[0.5px] border-border my-5" />,
  code: ({ className, children }) => {
    const isBlock = (className ?? "").includes("language-");
    if (isBlock) {
      return (
        <code className="font-mono text-[12px] text-text">{children}</code>
      );
    }
    return (
      <code className="font-mono text-[12px] bg-surface-2 text-text px-1 py-0.5">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-surface-2 border border-[0.5px] border-border p-3 my-3 overflow-auto">
      {children}
    </pre>
  ),
};

export interface ArtifactDrawerProps {
  artifact: Artifact;
  onClose: () => void;
  onSkill: () => void;
}

export default function ArtifactDrawer({
  artifact,
  onClose,
  onSkill,
}: ArtifactDrawerProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [content, setContent] = useState(artifact.content);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "cached">("saved");
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(artifact.content);
    setMode("view");
    setSaveStatus("saved");
  }, [artifact.id, artifact.content]);

  const save = useCallback(
    async (value: string) => {
      setSaveStatus("saving");
      const now = new Date();
      await db.artifacts.update(artifact.id, {
        content: value,
        updatedAt: now,
        synced: false,
      });
      setSaveStatus("saved");
    },
    [artifact.id],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);
      setSaveStatus("saving");
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => void save(value), 1000);
    },
    [save],
  );

  const enterEdit = useCallback(() => {
    setMode("edit");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const copyContent = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (copyTimeoutRef.current !== null) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context / denied permission) — fail silently.
    }
  }, [content]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape") {
          if (mode === "edit") {
            e.preventDefault();
            e.stopPropagation();
            setMode("view");
          }
        }
        return;
      }
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "e" || e.key === "E") {
        enterEdit();
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        onSkill();
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        void copyContent();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onSkill, enterEdit, copyContent, mode]);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      if (copyTimeoutRef.current !== null) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const statusLabel =
    saveStatus === "saving"
      ? "[ SAVING... ]"
      : saveStatus === "cached"
        ? "[ CACHED ]"
        : "[ SAVED ]";
  const statusColor =
    saveStatus === "saved" ? "text-green-600" : "text-muted";
  const tokenCount = Math.ceil(content.length / 4);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-text/40 backdrop-blur-[12px]"
        style={{ zIndex: 40 }}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[55%] bg-bg border-[0.5px] border-accent flex flex-col"
        style={{ zIndex: 50 }}
        role="dialog"
        aria-label={`Artifact: ${artifact.title}`}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[0.5px] border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted border border-[0.5px] border-border px-1.5 py-0.5 hover:text-text transition-colors duration-150"
          >
            ESC ×
          </button>
          <span className="flex-1 font-sans text-[13px] font-medium text-text truncate leading-none">
            {artifact.title}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => void copyContent()}
              className={`font-mono text-[9px] uppercase tracking-[0.06em] px-2 py-0.5 border border-[0.5px] transition-colors duration-150 ${
                copied
                  ? "border-green-600 text-green-600"
                  : "border-border text-muted hover:text-text"
              }`}
            >
              {copied ? "copied" : "copy"}
            </button>
            {(["edit", "view"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => (m === "edit" ? enterEdit() : setMode("view"))}
                className={`font-mono text-[9px] uppercase tracking-[0.06em] px-2 py-0.5 border border-[0.5px] transition-colors duration-150 ${
                  mode === m
                    ? "border-accent text-accent bg-accent/10"
                    : "border-border text-muted hover:text-text"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {mode === "view" ? (
            <div
              className="h-full px-6 py-5 bg-surface cursor-text max-w-none"
              style={{ fontFamily: "Geist, Inter, system-ui", fontSize: 15 }}
              onClick={enterEdit}
            >
              {content ? (
                <ReactMarkdown components={markdownComponents}>
                  {content}
                </ReactMarkdown>
              ) : (
                <p
                  className="font-mono text-[10px] text-muted"
                  style={{ letterSpacing: "0.06em" }}
                >
                  // Empty artifact. Click or press E to start writing.
                </p>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              className="w-full h-full px-6 py-5 bg-bg resize-none outline-none font-mono text-[13px] text-text leading-relaxed"
              placeholder="// Start writing markdown..."
              spellCheck={false}
            />
          )}
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-[0.5px] border-border shrink-0">
          <span className={`font-mono text-[9px] uppercase tracking-[0.06em] ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="font-mono text-[9px] text-muted">
            ~{tokenCount} tok
          </span>
        </div>

        {/* Hintbar */}
        <div className="flex items-center gap-4 px-4 py-1 border-t border-[0.5px] border-border bg-surface shrink-0">
          {[
            { key: "ESC", label: mode === "edit" ? "exit edit" : "close" },
            { key: "S", label: "skills" },
            { key: "E", label: "edit" },
            { key: "C", label: copied ? "copied" : "copy" },
          ].map(({ key, label }) => (
            <span key={key} className="font-mono text-[9px] text-muted">
              <span className="text-accent">{key}</span> {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
