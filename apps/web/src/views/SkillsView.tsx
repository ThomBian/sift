import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import { db } from "../lib/db";
import { useSkills } from "../contexts/SkillsContext";
import { EmojiPicker } from "@sift/shared";
import ConfirmModal from "../components/ConfirmModal";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import type { PromptTemplate } from "@sift/shared";

const VARIABLES = [
  "{{PROJECT_NAME}}",
  "{{PROJECT_DESCRIPTION}}",
  "{{CURRENT_TASKS}}",
  "{{PREVIOUS_ARTIFACTS}}",
];

type FormState = {
  id: string | null;
  emoji: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
};

function emptyForm(id: string | null = null): FormState {
  return { id, emoji: "⚡", name: "", description: "", systemPrompt: "", userPromptTemplate: "" };
}

export default function SkillsView() {
  const navigate = useNavigate();
  const { skills, refetch } = useSkills();
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [form, setForm] = useState<FormState | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deleteSkill, setDeleteSkill] = useState<PromptTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const userPromptRef = useRef<HTMLTextAreaElement>(null);

  const saveForm = useCallback(async () => {
    if (!form) return;
    if (!form.name.trim()) return;
    setSaving(true);
    const now = new Date().toISOString();
    const row = {
      id: form.id ?? nanoid(),
      name: form.name.trim(),
      emoji: form.emoji,
      description: form.description.trim(),
      systemPrompt: form.systemPrompt,
      userPromptTemplate: form.userPromptTemplate,
      createdAt: now,
    };
    await db.promptTemplates.put(row);
    await refetch();
    setForm(null);
    setSaving(false);
  }, [form, refetch]);

  const insertVariable = useCallback((variable: string) => {
    const ta = userPromptRef.current;
    if (!ta || !form) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const newVal =
      ta.value.substring(0, start) + variable + ta.value.substring(end);
    setForm((f) => f ? { ...f, userPromptTemplate: newVal } : f);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + variable.length, start + variable.length);
    });
  }, [form]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (inInput) {
        if (e.key === "Escape") {
          setForm(null);
          setShowEmojiPicker(false);
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && form) {
          e.preventDefault();
          void saveForm();
        }
        return;
      }
      if (e.key === "Escape") {
        if (form) { setForm(null); return; }
        navigate(-1);
        return;
      }
      if (e.key === "?" || e.key === "/") {
        e.preventDefault();
        window.dispatchEvent(new Event("sift:shortcuts"));
        return;
      }
      if (form) return;
      if (e.key === "ArrowDown") {
        setFocusedIdx((i) => Math.min(i + 1, skills.length - 1));
      } else if (e.key === "ArrowUp") {
        setFocusedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "n" || e.key === "N") {
        setForm(emptyForm(null));
      } else if (e.key === "e" || e.key === "E") {
        const skill = skills[focusedIdx];
        if (skill) {
          setForm({
            id: skill.id,
            emoji: skill.emoji,
            name: skill.name,
            description: skill.description,
            systemPrompt: skill.systemPrompt,
            userPromptTemplate: skill.userPromptTemplate,
          });
        }
      } else if (e.key === "Backspace") {
        const skill = skills[focusedIdx];
        if (skill) setDeleteSkill(skill);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, skills, focusedIdx, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <header className="flex items-center gap-3 h-12 px-6 border-b border-[0.5px] border-border bg-surface shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted border-[0.5px] border-border px-1.5 py-0.5 hover:text-text transition-colors"
        >
          ← ESC
        </button>
        <span className="font-sans text-[15px] font-medium text-text tracking-[-0.02em]">
          Skills Library
        </span>
        <button
          type="button"
          onClick={() => setForm(emptyForm(null))}
          className="ml-auto font-mono text-[9px] uppercase tracking-[0.06em] text-accent border-[0.5px] border-accent px-2 py-0.5 hover:bg-accent/5 transition-colors"
        >
          N — New Skill
        </button>
      </header>

      <main className="flex-1 px-8 py-6 max-w-3xl">
        {skills.length === 0 && !form && (
          <p className="font-mono text-[10px] text-muted">
            No skills yet. Press N to create your first prompt template.
          </p>
        )}

        <div className="flex flex-col">
          {skills.map((skill, idx) => {
            const focused = idx === focusedIdx && !form;
            return (
              <div
                key={skill.id}
                onClick={() => setFocusedIdx(idx)}
                className={`flex items-center gap-3 py-3 min-h-[36px] border-b border-[0.5px] border-border cursor-default transition-colors duration-150 ${
                  focused ? "bg-accent/5 laser-focus" : "hover:bg-surface"
                }`}
              >
                <span className="text-[16px] shrink-0">{skill.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-sans text-[14px] font-medium text-text">
                    {skill.name}
                  </div>
                  {skill.description && (
                    <div className="font-mono text-[10px] text-muted mt-0.5">
                      {skill.description}
                    </div>
                  )}
                </div>
                {focused && (
                  <div className="flex gap-3">
                    {[
                      { key: "E", label: "edit" },
                      { key: "⌫", label: "delete" },
                    ].map(({ key, label }) => (
                      <span key={key} className="font-mono text-[9px] text-muted">
                        <span className="text-accent">{key}</span> {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {form && (
          <div className="mt-4 border-[0.5px] border-accent bg-bg p-6 flex flex-col gap-4 animate-palette-in">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              {form.id ? "EDIT SKILL" : "NEW SKILL"}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="text-[20px] w-9 h-9 border-[0.5px] border-border flex items-center justify-center hover:border-accent transition-colors"
                >
                  {form.emoji}
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 mt-1 z-50">
                    <EmojiPicker
                      query=""
                      onSelect={(emoji) => {
                        setForm((f) => f ? { ...f, emoji } : f);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>
                )}
              </div>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : f)}
                placeholder="Skill name..."
                className="flex-1 font-sans text-[14px]"
              />
            </div>

            <Input
              value={form.description}
              onChange={(e) => setForm((f) => f ? { ...f, description: e.target.value } : f)}
              placeholder="Short description..."
              className="font-sans text-[13px]"
            />

            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-1.5">
                SYSTEM PROMPT
              </div>
              <Textarea
                value={form.systemPrompt}
                onChange={(e) => setForm((f) => f ? { ...f, systemPrompt: e.target.value } : f)}
                placeholder="You are an elite product strategist..."
                rows={4}
              />
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-1.5">
                USER PROMPT TEMPLATE
              </div>
              <Textarea
                ref={userPromptRef}
                value={form.userPromptTemplate}
                onChange={(e) => setForm((f) => f ? { ...f, userPromptTemplate: e.target.value } : f)}
                placeholder="Using the project '{{PROJECT_NAME}}'..."
                rows={6}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="font-mono text-[9px] text-muted border-[0.5px] border-border px-1.5 py-0.5 hover:border-accent hover:text-accent transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void saveForm()}
                disabled={saving || !form.name.trim()}
                className="font-mono text-[10px] uppercase tracking-[0.06em] bg-accent text-bg px-4 py-1.5 hover:bg-accent/80 disabled:opacity-40 transition-colors"
              >
                {saving ? "SAVING..." : "SAVE"}
              </button>
              <button
                type="button"
                onClick={() => { setForm(null); setShowEmojiPicker(false); }}
                className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted hover:text-text transition-colors"
              >
                ESC cancel
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="flex items-center gap-5 px-6 py-1.5 border-t border-[0.5px] border-border bg-surface shrink-0">
        {[
          { key: "↑↓", label: "navigate" },
          { key: "N", label: "new" },
          { key: "E", label: "edit" },
          { key: "⌫", label: "delete" },
          { key: "ESC", label: "back" },
        ].map(({ key, label }) => (
          <span key={key} className="font-mono text-[9px] text-muted">
            <span className="text-accent">{key}</span> {label}
          </span>
        ))}
        <span className="font-mono text-[9px] text-muted ml-auto">
          <span className="text-muted">?</span> shortcuts
        </span>
      </footer>

      {deleteSkill && (
        <ConfirmModal
          message={`Delete skill "${deleteSkill.name}"? This cannot be undone.`}
          onConfirm={async () => {
            await db.promptTemplates.delete(deleteSkill.id);
            await refetch();
            setDeleteSkill(null);
            setFocusedIdx((i) => Math.max(0, i - 1));
          }}
          onCancel={() => setDeleteSkill(null)}
        />
      )}
    </div>
  );
}
