// packages/shared/src/__tests__/useSmartInput.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSmartInput } from '../SmartInput/useSmartInput';

const tab       = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
const shiftTab  = { key: 'Tab', shiftKey: true,  preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
const esc       = { key: 'Escape', shiftKey: false, preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
const cmdEnter  = { key: 'Enter', metaKey: true, ctrlKey: false, preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>;

function make() {
  const onTaskReady = vi.fn();
  const hook = renderHook(() => useSmartInput(onTaskReady));
  return { hook, onTaskReady };
}

describe('useSmartInput — initial state', () => {
  it('starts with focus on text and empty values', () => {
    const { hook } = make();
    expect(hook.result.current.focus).toBe('text');
    expect(hook.result.current.values.title).toBe('');
    expect(hook.result.current.values.projectId).toBeNull();
    expect(hook.result.current.values.dueDate).toBeNull();
    expect(hook.result.current.values.workingDate).toBeNull();
  });
});

describe('useSmartInput — Tab rotation', () => {
  it('Tab cycles text → project → dueDate → workingDate → text', () => {
    const { hook } = make();

    act(() => hook.result.current.handleTitleKeyDown(tab as any));
    expect(hook.result.current.focus).toBe('project');

    act(() => hook.result.current.handleChipKeyDown('project', tab));
    expect(hook.result.current.focus).toBe('dueDate');

    act(() => hook.result.current.handleChipKeyDown('dueDate', tab));
    expect(hook.result.current.focus).toBe('workingDate');

    act(() => hook.result.current.handleChipKeyDown('workingDate', tab));
    expect(hook.result.current.focus).toBe('text');
  });

  it('first Tab from text skips filled chips to land on first empty one', () => {
    const { hook } = make();
    // Fill project
    act(() => hook.result.current.handleSelect('project', 'proj-1'));
    // First Tab from text should skip project and land on dueDate
    act(() => hook.result.current.handleTitleKeyDown(tab as any));
    expect(hook.result.current.focus).toBe('dueDate');
    // Subsequent Tab should cycle normally (dueDate → workingDate)
    act(() => hook.result.current.handleTitleKeyDown(tab as any));
    expect(hook.result.current.focus).toBe('workingDate');
  });

  it('after Tab completes chip ring back to title, next Tab visits project (filled chips included)', () => {
    const { hook } = make();
    act(() => hook.result.current.handleSelect('project', 'proj-1'));
    act(() => hook.result.current.handleTitleKeyDown(tab as any));
    expect(hook.result.current.focus).toBe('dueDate');
    act(() => hook.result.current.handleTitleKeyDown(tab as any));
    expect(hook.result.current.focus).toBe('workingDate');
    act(() => hook.result.current.handleTitleKeyDown(tab as any));
    expect(hook.result.current.focus).toBe('text');
    // Was only hitting due/working before; now include project again
    act(() => hook.result.current.handleTitleKeyDown(tab as any));
    expect(hook.result.current.focus).toBe('project');
    act(() => hook.result.current.handleTitleKeyDown(tab as any));
    expect(hook.result.current.focus).toBe('dueDate');
  });

  it('Shift+Tab cycles in reverse (text → workingDate)', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleKeyDown(shiftTab as any));
    expect(hook.result.current.focus).toBe('workingDate');
  });
});

describe('useSmartInput — @x trigger detection', () => {
  it('typing @p jumps focus to project and strips trigger from title', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'Buy milk @p' } } as any));
    expect(hook.result.current.focus).toBe('project');
    expect(hook.result.current.values.title).toBe('Buy milk ');
  });

  it('typing @d jumps focus to dueDate', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'Task @d' } } as any));
    expect(hook.result.current.focus).toBe('dueDate');
    expect(hook.result.current.values.title).toBe('Task ');
  });

  it('typing @w jumps focus to workingDate', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'Task @w' } } as any));
    expect(hook.result.current.focus).toBe('workingDate');
  });

  it('normal text change updates title without changing focus', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'Hello' } } as any));
    expect(hook.result.current.values.title).toBe('Hello');
    expect(hook.result.current.focus).toBe('text');
  });
});

describe('useSmartInput — chip interaction', () => {
  it('handleChipClick focuses the chip', () => {
    const { hook } = make();
    act(() => hook.result.current.handleChipClick('dueDate'));
    expect(hook.result.current.focus).toBe('dueDate');
  });

  it('handleSelect sets value and returns focus to text', () => {
    const { hook } = make();
    act(() => hook.result.current.handleChipClick('project'));
    act(() => hook.result.current.handleSelect('project', 'proj-123'));
    expect(hook.result.current.values.projectId).toBe('proj-123');
    expect(hook.result.current.focus).toBe('text');
  });

  it('Escape on chip returns focus to text without clearing value', () => {
    const { hook } = make();
    act(() => hook.result.current.handleSelect('project', 'proj-123'));
    act(() => hook.result.current.handleChipClick('project'));
    act(() => hook.result.current.handleChipKeyDown('project', esc));
    expect(hook.result.current.focus).toBe('text');
    expect(hook.result.current.values.projectId).toBe('proj-123');
  });
});

describe('useSmartInput — save', () => {
  it('⌘+Enter calls onTaskReady with trimmed values and resets', () => {
    const { hook, onTaskReady } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: '  My task  ' } } as any));
    act(() => hook.result.current.handleSelect('project', 'proj-abc'));
    act(() => hook.result.current.handleTitleKeyDown(cmdEnter));

    expect(onTaskReady).toHaveBeenCalledWith({
      title: 'My task',
      projectId: 'proj-abc',
      dueDate: null,
      workingDate: null,
    });
    expect(hook.result.current.values.title).toBe('');
    expect(hook.result.current.values.projectId).toBeNull();
    expect(hook.result.current.focus).toBe('text');
  });

  it('⌘+Enter does nothing when title is empty', () => {
    const { hook, onTaskReady } = make();
    act(() => hook.result.current.handleTitleKeyDown(cmdEnter));
    expect(onTaskReady).not.toHaveBeenCalled();
  });

  it('⌘+Enter also works from a chip via handleChipKeyDown', () => {
    const { hook, onTaskReady } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'My task' } } as any));
    act(() => hook.result.current.handleChipKeyDown('project', cmdEnter as unknown as React.KeyboardEvent));
    expect(onTaskReady).toHaveBeenCalledWith(expect.objectContaining({ title: 'My task' }));
  });

  it('reset clears all values and returns focus to text', () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleChange({ target: { value: 'task' } } as any));
    act(() => hook.result.current.handleSelect('project', 'proj-1'));
    act(() => hook.result.current.reset());
    expect(hook.result.current.values.title).toBe('');
    expect(hook.result.current.values.projectId).toBeNull();
    expect(hook.result.current.focus).toBe('text');
  });
});
