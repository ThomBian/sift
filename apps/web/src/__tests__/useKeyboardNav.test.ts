import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { db } from '../lib/db';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import type { Task } from '@speedy/shared';

function makeTask(overrides?: Partial<Task>): Task {
  const now = new Date();
  return {
    id: 'task-1',
    title: 'Test',
    projectId: 'project-1',
    status: 'inbox',
    workingDate: null,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    synced: true,
    ...overrides,
  };
}

const TASKS: Task[] = [
  makeTask({ id: 'a', title: 'Task A' }),
  makeTask({ id: 'b', title: 'Task B' }),
  makeTask({ id: 'c', title: 'Task C' }),
];

function makeKeyEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true });
}

beforeEach(async () => {
  await db.tasks.clear();
  await db.projects.clear();
  await db.spaces.clear();
});

describe('useKeyboardNav', () => {
  it('starts with focusedId null', () => {
    const { result } = renderHook(() => useKeyboardNav());
    expect(result.current.focusedId).toBeNull();
  });

  it('j / ArrowDown moves focus to next task', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('a');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('j'), TASKS);
    });

    expect(result.current.focusedId).toBe('b');
  });

  it('k / ArrowUp moves focus to previous task', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('c');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('k'), TASKS);
    });

    expect(result.current.focusedId).toBe('b');
  });

  it('j cycles from last task to input (null)', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('c');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('j'), TASKS);
    });

    expect(result.current.focusedId).toBeNull();
  });

  it('k cycles from first task to input (null)', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('a');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('k'), TASKS);
    });

    expect(result.current.focusedId).toBeNull();
  });

  it('ArrowDown works like j', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('a');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('ArrowDown'), TASKS);
    });

    expect(result.current.focusedId).toBe('b');
  });

  it('ArrowUp works like k', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('b');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('ArrowUp'), TASKS);
    });

    expect(result.current.focusedId).toBe('a');
  });

  it('Enter toggles focused task from inbox to done', async () => {
    await db.spaces.add({
      id: 'space-1',
      name: 'Work',
      color: '#5E6AD2',
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    });
    await db.projects.add({
      id: 'project-1',
      name: 'General',
      spaceId: 'space-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    });
    await db.tasks.add(TASKS[0]);

    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('a');
    });

    await act(async () => {
      result.current.handleKeyDown(makeKeyEvent('Enter'), TASKS);
      await new Promise((r) => setTimeout(r, 10));
    });

    const updated = await db.tasks.get('a');
    expect(updated!.status).toBe('done');
    expect(updated!.completedAt).not.toBeNull();
  });

  it('Enter toggles focused task from done back to inbox', async () => {
    await db.spaces.add({
      id: 'space-1',
      name: 'Work',
      color: '#5E6AD2',
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    });
    await db.projects.add({
      id: 'project-1',
      name: 'General',
      spaceId: 'space-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    });
    const doneTask = { ...TASKS[0], status: 'done' as const, completedAt: new Date() };
    await db.tasks.add(doneTask);

    const { result } = renderHook(() => useKeyboardNav());
    act(() => result.current.setFocusedId('a'));

    await act(async () => {
      result.current.handleKeyDown(makeKeyEvent('Enter'), [doneTask]);
      await new Promise((r) => setTimeout(r, 10));
    });

    const updated = await db.tasks.get('a');
    expect(updated!.status).toBe('inbox');
    expect(updated!.completedAt).toBeNull();
  });

  it('Backspace archives the focused task', async () => {
    await db.spaces.add({
      id: 'space-1',
      name: 'Work',
      color: '#5E6AD2',
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    });
    await db.projects.add({
      id: 'project-1',
      name: 'General',
      spaceId: 'space-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    });
    await db.tasks.add(TASKS[1]);

    const { result } = renderHook(() => useKeyboardNav());
    act(() => result.current.setFocusedId('b'));

    await act(async () => {
      result.current.handleKeyDown(makeKeyEvent('Backspace'), TASKS);
      await new Promise((r) => setTimeout(r, 10));
    });

    const updated = await db.tasks.get('b');
    expect(updated!.status).toBe('archived');
  });

  it('Delete works like Backspace for archiving', async () => {
    await db.spaces.add({
      id: 'space-1',
      name: 'Work',
      color: '#5E6AD2',
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    });
    await db.projects.add({
      id: 'project-1',
      name: 'General',
      spaceId: 'space-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    });
    await db.tasks.add(TASKS[2]);

    const { result } = renderHook(() => useKeyboardNav());
    act(() => result.current.setFocusedId('c'));

    await act(async () => {
      result.current.handleKeyDown(makeKeyEvent('Delete'), TASKS);
      await new Promise((r) => setTimeout(r, 10));
    });

    const updated = await db.tasks.get('c');
    expect(updated!.status).toBe('archived');
  });
});
