// packages/shared/src/SmartInput/useSmartInput.ts
import { useState, useCallback } from 'react';
import type { Task } from '../types';

export type ChipFocus = 'project' | 'dueDate' | 'workingDate';
export type FocusTarget = 'text' | ChipFocus;

const FOCUS_CYCLE: FocusTarget[] = ['text', 'project', 'dueDate', 'workingDate'];

const AT_TRIGGERS: Record<string, ChipFocus> = {
  '@p': 'project',
  '@d': 'dueDate',
  '@w': 'workingDate',
};

export interface SmartInputValues {
  title: string;
  projectId: string | null;
  dueDate: Date | null;
  workingDate: Date | null;
}

function isFilled(chip: ChipFocus, values: SmartInputValues): boolean {
  if (chip === 'project') return values.projectId !== null;
  if (chip === 'dueDate') return values.dueDate !== null;
  return values.workingDate !== null;
}

// Forward Tab: skip already-filled chips; always stop at 'text'
function nextUnfilled(current: FocusTarget, values: SmartInputValues): FocusTarget {
  const startIndex = FOCUS_CYCLE.indexOf(current);
  for (let i = 1; i <= FOCUS_CYCLE.length; i++) {
    const next = FOCUS_CYCLE[(startIndex + i) % FOCUS_CYCLE.length];
    if (next === 'text') return 'text';
    if (!isFilled(next as ChipFocus, values)) return next;
  }
  return 'text';
}

// Backward Shift+Tab: simple one-step reverse, no skip
function prevFocus(current: FocusTarget): FocusTarget {
  const i = FOCUS_CYCLE.indexOf(current);
  return FOCUS_CYCLE[(i - 1 + FOCUS_CYCLE.length) % FOCUS_CYCLE.length];
}

export interface UseSmartInputReturn {
  values: SmartInputValues;
  focus: FocusTarget;
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleChipKeyDown: (chip: ChipFocus, e: React.KeyboardEvent) => void;
  handleChipClick: (chip: ChipFocus) => void;
  handleSelect: (chip: ChipFocus, value: string | Date | null) => void;
  cancelChipSelection: () => void;
  reset: () => void;
}

const EMPTY: SmartInputValues = {
  title: '',
  projectId: null,
  dueDate: null,
  workingDate: null,
};

export function useSmartInput(
  onTaskReady: (task: Pick<Task, 'title' | 'dueDate' | 'workingDate'> & { projectId?: string }) => void
): UseSmartInputReturn {
  const [values, setValues] = useState<SmartInputValues>(EMPTY);
  const [focus, setFocus] = useState<FocusTarget>('text');

  const handleSave = useCallback(() => {
    if (!values.title.trim()) return;
    onTaskReady({
      title: values.title.trim(),
      ...(values.projectId ? { projectId: values.projectId } : {}),
      dueDate: values.dueDate,
      workingDate: values.workingDate,
    });
    setValues(EMPTY);
    setFocus('text');
  }, [values, onTaskReady]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    for (const [trigger, chip] of Object.entries(AT_TRIGGERS)) {
      if (val.endsWith(trigger)) {
        setValues(v => ({ ...v, title: val.slice(0, -trigger.length) }));
        setFocus(chip);
        return;
      }
    }
    setValues(v => ({ ...v, title: val }));
  }, []);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setFocus(f => e.shiftKey ? prevFocus(f) : nextUnfilled(f, values));
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave, values]);

  const handleChipKeyDown = useCallback((chip: ChipFocus, e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setFocus(f => e.shiftKey ? prevFocus(f) : nextUnfilled(f, values));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setFocus('text');
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  const handleChipClick = useCallback((chip: ChipFocus) => {
    setFocus(chip);
  }, []);

  const handleSelect = useCallback((chip: ChipFocus, value: string | Date | null) => {
    const key = chip === 'project' ? 'projectId' : chip;
    setValues(v => ({ ...v, [key]: value }));
    setFocus('text');
  }, []);

  const cancelChipSelection = useCallback(() => setFocus('text'), []);

  const reset = useCallback(() => {
    setValues(EMPTY);
    setFocus('text');
  }, []);

  return {
    values,
    focus,
    handleTitleChange,
    handleTitleKeyDown,
    handleChipKeyDown,
    handleChipClick,
    handleSelect,
    cancelChipSelection,
    reset,
  };
}
