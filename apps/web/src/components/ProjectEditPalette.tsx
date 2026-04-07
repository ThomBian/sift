import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { db } from '../lib/db';
import type { Project } from '@sift/shared';

interface ProjectEditPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId?: string;       // create mode
  project?: Project;      // edit mode
  initialField?: 'name' | 'dueDate';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDateOptions(): { label: string; value: Date | null }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  return [
    { label: `Today · ${formatDate(today)}`, value: today },
    { label: `Tomorrow · ${formatDate(tomorrow)}`, value: tomorrow },
    { label: `Next week · ${formatDate(nextWeek)}`, value: nextWeek },
    { label: 'Clear', value: null },
  ];
}

export default function ProjectEditPalette({
  isOpen,
  onClose,
  spaceId,
  project,
  initialField = 'name',
}: ProjectEditPaletteProps) {
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [activeField, setActiveField] = useState<'name' | 'dueDate'>(initialField);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(project?.name ?? '');
    setDueDate(project?.dueDate ?? null);
    setActiveField(initialField);
  }, [isOpen, project, initialField]);

  useEffect(() => {
    if (isOpen && activeField === 'name') {
      nameRef.current?.focus();
    }
  }, [isOpen, activeField]);

  async function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date();
    if (project) {
      await db.projects.update(project.id, {
        name: trimmed,
        dueDate,
        updatedAt: now,
        synced: false,
      });
    } else {
      await db.projects.add({
        id: nanoid(),
        name: trimmed,
        spaceId: spaceId!,
        dueDate,
        createdAt: now,
        updatedAt: now,
        synced: false,
      });
    }
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && activeField === 'name') {
      e.preventDefault();
      void handleConfirm();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-surface border-[0.5px] border-border w-80 p-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted mb-3">
          {project ? 'Edit Project' : 'New Project'}
        </p>

        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="w-full bg-transparent border-b border-[0.5px] border-border pb-2 mb-3 font-sans text-sm text-text outline-none focus:border-accent"
          style={{ fontWeight: 500, letterSpacing: '-0.02em' }}
        />

        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] text-muted uppercase tracking-[0.1em]">Due</span>
          <button
            type="button"
            onClick={() =>
              setActiveField((f) => (f === 'dueDate' ? 'name' : 'dueDate'))
            }
            className={`font-mono text-[10px] px-2 py-0.5 border-[0.5px] transition-colors ${
              dueDate
                ? 'border-accent text-accent bg-accent/5'
                : 'border-border text-muted hover:text-text'
            }`}
          >
            {dueDate ? formatDate(dueDate) : 'None'}
          </button>
        </div>

        {activeField === 'dueDate' && (
          <div className="flex flex-col gap-0.5 mb-3 border-[0.5px] border-border">
            {getDateOptions().map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  setDueDate(opt.value);
                  setActiveField('name');
                  nameRef.current?.focus();
                }}
                className="text-left font-mono text-[11px] text-muted hover:text-text px-3 py-1.5 hover:bg-surface-2 transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-4 mt-3">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] text-muted hover:text-text transition-colors"
          >
            Esc · Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            className="font-mono text-[10px] text-accent hover:text-text transition-colors"
          >
            Enter · Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
