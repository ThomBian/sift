import React, { useState, useEffect, useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { db } from '../lib/db';
import { Dropdown, EmojiPicker, getRandomEmoji } from '@sift/shared';
import type { Project } from '@sift/shared';

interface ProjectEditPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId?: string;
  project?: Project;
  initialField?: 'name' | 'emoji' | 'dueDate';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR');
}

type ActiveChip = 'name' | 'emoji' | 'dueDate';

const TAB_ORDER: ActiveChip[] = ['name', 'emoji', 'dueDate'];

export default function ProjectEditPalette({
  isOpen,
  onClose,
  spaceId,
  project,
  initialField = 'name',
}: ProjectEditPaletteProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [activeChip, setActiveChip] = useState<ActiveChip>(initialField);
  const [query, setQuery] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);

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
    setName(project?.name ?? '');
    setEmoji(project?.emoji ?? null);
    setDueDate(project?.dueDate ?? null);
    setActiveChip(initialField);
    setQuery('');
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
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleTabNext() {
    const idx = TAB_ORDER.indexOf(activeChip);
    const next = TAB_ORDER[(idx + 1) % TAB_ORDER.length];
    handleChipClick(next);
  }

  function handleEmojiSelect(selected: string) {
    setEmoji(selected);
    setActiveChip('name');
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleDateSelect(value: string | Date | null) {
    setDueDate(value instanceof Date ? value : null);
    setActiveChip('name');
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleClear() {
    if (activeChip === 'emoji') {
      setEmoji(null);
    } else {
      setDueDate(null);
    }
    setActiveChip('name');
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabNext();
      return;
    }
    if (e.key === 'Enter' && activeChip === 'name') {
      e.preventDefault();
      void handleConfirm();
    }
  }

  if (!isOpen && !isClosing) return null;

  const inNameMode = activeChip === 'name';

  const makeChipStyle = (chip: ActiveChip, isSet: boolean): React.CSSProperties => {
    const isActive = activeChip === chip;
    if (chip === 'emoji') {
      return {
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
        ...(isActive
          ? { background: '#FFF7ED', color: '#FF4F00', borderColor: '#FF4F00' }
          : isSet
            ? { background: '#FFF7ED', color: '#FF4F00', borderColor: '#FFD4B0' }
            : { background: '#FAFAFA', color: '#888888', borderColor: '#E2E2E2' }
        ),
      };
    }
    // dueDate chip
    return {
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
      ...(isActive
        ? { background: '#FFF0F0', color: '#E60000', borderColor: '#E60000' }
        : isSet
          ? { background: '#FFF0F0', color: '#E60000', borderColor: '#FFBDBD' }
          : { background: '#FAFAFA', color: '#888888', borderColor: '#E2E2E2' }
      ),
    };
  };

  const inputValue = inNameMode ? name : query;
  const inputPlaceholder = activeChip === 'emoji'
    ? 'Search emojis…'
    : activeChip === 'dueDate'
      ? 'Pick a date…'
      : 'Project name…';

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (inNameMode) {
      const val = e.target.value;
      if (val.endsWith('@c')) {
        setName(val.slice(0, -2));
        handleChipClick('emoji');
      } else if (val.endsWith('@d')) {
        setName(val.slice(0, -2));
        handleChipClick('dueDate');
      } else {
        setName(val);
      }
    } else {
      setQuery(e.target.value);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/30 backdrop-blur-[2px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className={`${isClosing ? 'animate-palette-out' : 'animate-palette-in'} w-full max-w-[820px] border-[0.5px] border-border bg-bg/95 floating-panel shadow-2xl`}>
        {/* Context row */}
        <div className="flex items-center px-3 py-1.5 border-b border-border">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
            {project ? `Editing · ${project.name}` : 'New Project'}
          </span>
          <span className="ml-auto font-mono text-[9px] text-dim">
            esc to close
          </span>
        </div>

        {/* Input row */}
        <div className="flex items-center h-11 px-3 gap-2 border border-transparent focus-within:border-accent transition-colors duration-150">
          <span className="text-dim text-[15px] shrink-0 select-none">+</span>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            aria-label={inputPlaceholder}
            className="flex-1 bg-transparent border-none text-[13.5px] text-text font-sans min-w-0"
            style={{ outline: 'none', letterSpacing: '-0.1px' }}
          />
          <button
            type="button"
            onClick={() => handleChipClick('emoji')}
            style={makeChipStyle('emoji', emoji !== null)}
          >
            {emoji ? (
              <>{emoji}</>
            ) : (
              <><span style={{ fontSize: '10px', opacity: 0.55 }}>@c</span>&nbsp;icon</>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleChipClick('dueDate')}
            style={makeChipStyle('dueDate', dueDate !== null)}
          >
            {dueDate ? (
              <><span style={{ fontSize: '10px', opacity: 0.55 }}>@d</span>&nbsp;{formatDate(dueDate)}</>
            ) : (
              <><span style={{ fontSize: '10px', opacity: 0.55 }}>@d</span>&nbsp;due</>
            )}
          </button>
        </div>

        {/* Emoji picker — inline below input */}
        {activeChip === 'emoji' && (
          <>
            <EmojiPicker query={query} onSelect={handleEmojiSelect} />
            <button
              type="button"
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '6px 16px',
                border: 'none',
                borderTop: '0.5px solid #E2E2E2',
                background: 'transparent',
                color: '#888888',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Clear
            </button>
          </>
        )}

        {/* Date dropdown — reuses shared Dropdown with inline mode */}
        {activeChip === 'dueDate' && (
          <>
            <Dropdown
              type="dueDate"
              projects={[]}
              query={query}
              onSelect={handleDateSelect}
              mode="inline"
            />
            <button
              type="button"
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '6px 16px',
                border: 'none',
                borderTop: '0.5px solid #E2E2E2',
                background: 'transparent',
                color: '#888888',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
