import React, { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { db } from '../lib/db';
import type { Project } from '@sift/shared';

interface ProjectEditPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId?: string;
  project?: Project;
  initialField?: 'name' | 'dueDate';
}

interface DateOption {
  label: string;
  value: Date | null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDateOptions(): DateOption[] {
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
  const [activeChip, setActiveChip] = useState<'name' | 'dueDate'>(initialField);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const dateOptions = getDateOptions();

  useEffect(() => {
    if (!isOpen) return;
    setName(project?.name ?? '');
    setDueDate(project?.dueDate ?? null);
    setActiveChip(initialField);
    setDropdownIndex(0);
  }, [isOpen, project, initialField]);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  async function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date();
    if (project) {
      await db.projects.update(project.id, { name: trimmed, dueDate, updatedAt: now, synced: false });
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

  function selectDateOption(option: DateOption) {
    setDueDate(option.value);
    setActiveChip('name');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleChipClick(chip: 'name' | 'dueDate') {
    setActiveChip(chip);
    setDropdownIndex(0);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      handleChipClick(activeChip === 'name' ? 'dueDate' : 'name');
      return;
    }
    if (activeChip === 'dueDate') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDropdownIndex((i) => Math.min(i + 1, dateOptions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDropdownIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const option = dateOptions[dropdownIndex];
        if (option !== undefined) selectDateOption(option);
        return;
      }
    }
    if (e.key === 'Enter' && activeChip === 'name') {
      e.preventDefault();
      void handleConfirm();
    }
  }

  if (!isOpen) return null;

  const inChipMode = activeChip === 'dueDate';

  // Chip style matches SmartInput's chipDue CSS module exactly
  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 9px',
    border: '1px solid',
    borderRadius: 0,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '11.5px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.1s',
    ...(activeChip === 'dueDate'
      ? { background: '#FFF0F0', color: '#E60000', borderColor: '#E60000' }
      : dueDate
        ? { background: '#FFF0F0', color: '#E60000', borderColor: '#FFBDBD' }
        : { background: '#FAFAFA', color: '#888888', borderColor: '#E2E2E2' }
    ),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/30 backdrop-blur-[2px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-palette-in w-full max-w-[820px] border-[0.5px] border-border bg-bg/95 floating-panel shadow-2xl">
        {/* Context row */}
        <div className="flex items-center px-3 py-1.5 border-b border-border">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
            {project ? `Editing · ${project.name}` : 'New Project'}
          </span>
          <span className="ml-auto font-mono text-[9px] text-dim">
            esc to close
          </span>
        </div>

        {/* Input row — mirrors SmartInput's .bar layout */}
        <div className="flex items-center h-11 px-3 gap-2 border border-transparent focus-within:border-accent transition-colors duration-150">
          <span className="text-dim text-[15px] shrink-0 select-none">+</span>
          <input
            ref={inputRef}
            value={inChipMode ? '' : name}
            onChange={(e) => { if (!inChipMode) setName(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder={inChipMode ? 'Pick a date…' : 'Project name…'}
            className="flex-1 bg-transparent border-none outline-none text-[13.5px] text-text font-sans min-w-0"
            style={{ letterSpacing: '-0.1px' }}
          />
          <button
            type="button"
            onClick={() => handleChipClick(activeChip === 'dueDate' ? 'name' : 'dueDate')}
            style={chipStyle}
          >
            {dueDate ? (
              <><span style={{ fontSize: '10px', opacity: 0.55 }}>@d</span>&nbsp;{formatDate(dueDate)}</>
            ) : (
              <><span style={{ fontSize: '10px', opacity: 0.55 }}>@d</span>&nbsp;due</>
            )}
          </button>
        </div>

        {/* Dropdown — same style as SmartInput inline dropdown */}
        {activeChip === 'dueDate' && (
          <div style={{ borderTop: '0.5px solid #E2E2E2' }}>
            {dateOptions.map((opt, i) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => selectDateOption(opt)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '6px 16px',
                  border: 'none',
                  borderRadius: 0,
                  background: i === dropdownIndex ? 'rgba(255, 79, 0, 0.05)' : 'transparent',
                  color: i === dropdownIndex ? '#111111' : '#888888',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
