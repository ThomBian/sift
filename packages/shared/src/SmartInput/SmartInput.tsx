// packages/shared/src/SmartInput/SmartInput.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSmartInput, type ChipFocus } from './useSmartInput';
import { Dropdown, type ProjectWithSpace } from './Dropdown';
import type { Task } from '../types';
import styles from './SmartInput.module.css';

interface SmartInputProps {
  projects: ProjectWithSpace[];
  onTaskReady: (task: Pick<Task, 'title' | 'dueDate' | 'workingDate'> & { projectId?: string }) => void;
  placeholder?: string;
  className?: string;
  /** Optional external ref to the underlying <input> for programmatic focus from the parent. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SmartInput({ projects, onTaskReady, placeholder, className, inputRef: externalInputRef }: SmartInputProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? localRef;

  const isFirstRender = useRef(true);

  const [query, setQuery] = useState('');

  const {
    values,
    focus,
    handleTitleChange,
    handleTitleKeyDown,
    handleChipKeyDown,
    handleChipClick,
    handleSelect,
    cancelChipSelection,
  } = useSmartInput(onTaskReady);

  // Reset query whenever the active chip changes
  useEffect(() => {
    setQuery('');
  }, [focus]);

  // Focus the input whenever focus changes (any chip or text).
  // Skip on initial mount so the task list can receive keyboard nav immediately.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    inputRef.current?.focus();
  }, [focus, inputRef]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (focus !== 'text') {
        // Dropdown is open. ArrowDown/Up/Enter are intercepted by Dropdown's
        // capture-phase listener and never reach here. Handle only Escape and
        // Tab / Cmd+Enter which should still work.
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelChipSelection();
          return;
        }
        if (e.key === 'Tab' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          handleTitleKeyDown(e);
        }
        return;
      }
      // focus === 'text'
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        return; // bubble to window listener for task nav
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        inputRef.current?.blur();
        return;
      }
      handleTitleKeyDown(e);
    },
    [focus, cancelChipSelection, handleTitleKeyDown, inputRef]
  );

  const projectForId = (id: string | null) => id ? projects.find(p => p.id === id) : undefined;

  const chips: Array<{
    key: ChipFocus;
    chipClass: string;
    activeClass: string;
    label: string;
    sublabel: string;
    value: string | null;
    dotColor?: string;
  }> = [
    {
      key: 'project',
      chipClass: styles.chipProject,
      activeClass: styles.chipProjectActive,
      label: '@p',
      sublabel: 'project',
      value: projectForId(values.projectId)?.name ?? null,
      dotColor: projectForId(values.projectId)?.space?.color,
    },
    {
      key: 'dueDate',
      chipClass: styles.chipDue,
      activeClass: styles.chipDueActive,
      label: '@d',
      sublabel: 'due',
      value: values.dueDate ? formatDate(values.dueDate) : null,
    },
    {
      key: 'workingDate',
      chipClass: styles.chipWorking,
      activeClass: styles.chipWorkingActive,
      label: '@w',
      sublabel: 'working',
      value: values.workingDate ? formatDate(values.workingDate) : null,
    },
  ];

  const activeChip = focus !== 'text' ? focus : null;
  const inputValue = activeChip ? query : values.title;
  const handleInputChange = activeChip
    ? (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)
    : handleTitleChange;

  const inputPlaceholder = activeChip
    ? (activeChip === 'project' ? 'Filter projects…' : 'Pick a date…')
    : (placeholder ?? 'Add a task… type @p, @w, @d or use Tab');

  return (
    <div className={`${styles.bar} ${className ?? ''}`}>
      <span className={styles.icon} aria-hidden>+</span>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        className={styles.input}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        placeholder={inputPlaceholder}
        aria-label="Task title"
      />
      <div className={styles.chips}>
        {chips.map(chip => (
          <div key={chip.key} className={styles.chipWrap}>
            <button
              className={[
                styles.chip,
                chip.chipClass,
                focus === chip.key ? chip.activeClass : '',
                chip.value ? styles.set : '',
              ].join(' ')}
              onClick={() => handleChipClick(chip.key)}
              onKeyDown={e => handleChipKeyDown(chip.key, e)}
              tabIndex={-1}
              type="button"
              aria-label={chip.key}
            >
              {chip.value ? (
                <>
                  {chip.dotColor && <span className={styles.chipDot} style={{ background: chip.dotColor }} />}
                  {chip.value}
                </>
              ) : (
                <><span className={styles.chipLabel}>{chip.label}</span>&nbsp;{chip.sublabel}</>
              )}
            </button>
            {focus === chip.key && (
              <Dropdown
                type={chip.key}
                projects={projects}
                query={query}
                onSelect={val => handleSelect(chip.key, val)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
