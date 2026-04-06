// packages/shared/src/SmartInput/useSmartInput.ts
import { useState, useCallback } from 'react';
import type { Task } from '../types';

export type ChipFocus = 'project' | 'dueDate' | 'workingDate';
export type FocusTarget = 'text' | ChipFocus;

const TAB_CYCLE: FocusTarget[] = ['text', 'project', 'dueDate', 'workingDate'];

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

function rotate(current: FocusTarget, dir: 1 | -1): FocusTarget {
  const i = TAB_CYCLE.indexOf(current);
  return TAB_CYCLE[(i + dir + TAB_CYCLE.length) % TAB_CYCLE.length];
}

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
      setFocus(f => rotate(f, e.shiftKey ? -1 : 1));
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  const handleChipKeyDown = useCallback((chip: ChipFocus, e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setFocus(f => rotate(f, e.shiftKey ? -1 : 1));
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
