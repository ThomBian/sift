// packages/shared/src/SmartInput/SmartInput.tsx
import React, { useRef, useEffect } from 'react';
import { useSmartInput, type ChipFocus } from './useSmartInput';
import { Dropdown, type ProjectWithSpace } from './Dropdown';
import type { Task } from '../types';
import styles from './SmartInput.module.css';

interface SmartInputProps {
  projects: ProjectWithSpace[];
  onTaskReady: (task: Pick<Task, 'title' | 'dueDate' | 'workingDate'> & { projectId?: string }) => void;
  placeholder?: string;
  className?: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SmartInput({ projects, onTaskReady, placeholder, className }: SmartInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    values,
    focus,
    handleTitleChange,
    handleTitleKeyDown,
    handleChipKeyDown,
    handleChipClick,
    handleSelect,
  } = useSmartInput(onTaskReady);

  // Return keyboard focus to the text input when focus is 'text'
  useEffect(() => {
    if (focus === 'text') inputRef.current?.focus();
  }, [focus]);

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

  return (
    <div className={`${styles.bar} ${className ?? ''}`}>
      <span className={styles.icon} aria-hidden>+</span>
      <input
        ref={inputRef}
        className={styles.input}
        value={values.title}
        onChange={handleTitleChange}
        onKeyDown={handleTitleKeyDown}
        placeholder={placeholder ?? 'Add a task… type @p, @w, @d or use Tab'}
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
                query=""
                onSelect={val => handleSelect(chip.key, val)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
