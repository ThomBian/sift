import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectNav } from '../hooks/useProjectNav';
import type { Project } from '@sift/shared';

function makeProject(overrides?: Partial<Project>): Project {
  const now = new Date();
  return {
    id: 'p-1',
    name: 'Test Project',
    emoji: '📚',
    spaceId: 'space-1',
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    synced: true,
    ...overrides,
  };
}

const PROJECTS: Project[] = [
  makeProject({ id: 'p-a', name: 'Alpha' }),
  makeProject({ id: 'p-b', name: 'Beta' }),
  makeProject({ id: 'p-c', name: 'Gamma' }),
];

function makeKeyEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true });
}

describe('useProjectNav', () => {
  it('starts with focusedProjectId null', () => {
    const { result } = renderHook(() => useProjectNav());
    expect(result.current.focusedProjectId).toBeNull();
  });

  it('ArrowDown focuses first project when none selected', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowDown'), PROJECTS); });
    expect(result.current.focusedProjectId).toBe('p-a');
  });

  it('ArrowDown moves to next project', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-a'); });
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowDown'), PROJECTS); });
    expect(result.current.focusedProjectId).toBe('p-b');
  });

  it('ArrowDown from last project deselects (null)', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-c'); });
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowDown'), PROJECTS); });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it('ArrowUp focuses last project when none selected', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowUp'), PROJECTS); });
    expect(result.current.focusedProjectId).toBe('p-c');
  });

  it('ArrowUp moves to previous project', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-c'); });
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowUp'), PROJECTS); });
    expect(result.current.focusedProjectId).toBe('p-b');
  });

  it('ArrowUp from first project deselects (null)', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-a'); });
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowUp'), PROJECTS); });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it('Escape deselects', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-b'); });
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('Escape'), PROJECTS); });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it('ignores modifier combos', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.setFocusedProjectId('p-a'); });
    const e = new KeyboardEvent('keydown', { key: 'ArrowDown', metaKey: true, bubbles: true });
    act(() => { result.current.handleProjectKeyDown(e, PROJECTS); });
    expect(result.current.focusedProjectId).toBe('p-a');
  });

  it('does nothing when project list is empty', () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => { result.current.handleProjectKeyDown(makeKeyEvent('ArrowDown'), []); });
    expect(result.current.focusedProjectId).toBeNull();
  });
});
