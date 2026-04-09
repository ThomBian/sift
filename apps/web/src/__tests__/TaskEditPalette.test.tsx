// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskEditPalette from '../components/TaskEditPalette';
import type { Task } from '@sift/shared';
import type { ProjectWithSpace } from '@sift/shared';

const now = new Date();

const baseTask: Task = {
  id: 'task-1',
  title: 'Fix the bug',
  projectId: 'p1',
  status: 'inbox',
  workingDate: null,
  dueDate: null,
  createdAt: now,
  updatedAt: now,
  completedAt: null,
  url: null,
  synced: true,
};

const space = { id: 's1', name: 'Work', color: '#5E6AD2', createdAt: now, updatedAt: now, synced: true };

const projects: ProjectWithSpace[] = [
  { id: 'p1', name: 'General', emoji: '📚', spaceId: 's1', dueDate: null, archived: false, url: null, createdAt: now, updatedAt: now, synced: true, space },
  { id: 'p2', name: 'Growth', emoji: '📚', spaceId: 's1', dueDate: null, archived: false, url: null, createdAt: now, updatedAt: now, synced: true, space },
];

describe('TaskEditPalette', () => {
  it('displays the task title in the input when defaultField is title', () => {
    render(
      <TaskEditPalette
        task={baseTask}
        defaultField="title"
        projects={projects}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('Fix the bug')).toBeInTheDocument();
  });

  it('shows task title in context row', () => {
    render(
      <TaskEditPalette
        task={baseTask}
        defaultField="title"
        projects={projects}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/Fix the bug/)).toBeInTheDocument();
  });

  it('shows project list in dropdown when defaultField is project', () => {
    render(
      <TaskEditPalette
        task={baseTask}
        defaultField="project"
        projects={projects}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Growth' })).toBeInTheDocument();
  });

  it('shows date options in dropdown when defaultField is dueDate', () => {
    render(
      <TaskEditPalette
        task={baseTask}
        defaultField="dueDate"
        projects={projects}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Today/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tomorrow/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });

  it('shows date options when defaultField is workingDate', () => {
    render(
      <TaskEditPalette
        task={baseTask}
        defaultField="workingDate"
        projects={projects}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Today/ })).toBeInTheDocument();
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(
      <TaskEditPalette
        task={baseTask}
        defaultField="title"
        projects={projects}
        onSave={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.keyDown(screen.getByDisplayValue('Fix the bug'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with updated title when ⌘↩ is pressed', () => {
    const onSave = vi.fn();
    render(
      <TaskEditPalette
        task={baseTask}
        defaultField="title"
        projects={projects}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByDisplayValue('Fix the bug');
    fireEvent.change(input, { target: { value: 'Fixed bug' } });
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Fixed bug' })
    );
  });

  it('calls onSave with selected project when project button is clicked', () => {
    const onSave = vi.fn();
    render(
      <TaskEditPalette
        task={baseTask}
        defaultField="project"
        projects={projects}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Growth' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p2' })
    );
  });

  it('arrow down then Enter selects the second date option', () => {
    const onSave = vi.fn();
    render(
      <TaskEditPalette
        task={baseTask}
        defaultField="dueDate"
        projects={projects}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByPlaceholderText('Pick a date…');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Second option is Tomorrow — value should be a non-null Date
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: expect.any(Date) })
    );
  });

  it('calls onSave with null dueDate when Clear is clicked', () => {
    const onSave = vi.fn();
    render(
      <TaskEditPalette
        task={{ ...baseTask, dueDate: new Date() }}
        defaultField="dueDate"
        projects={projects}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: null })
    );
  });

  it('renders the @u chip', () => {
    render(
      <TaskEditPalette
        task={baseTask}
        defaultField="title"
        projects={projects}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /@u/i })).toBeInTheDocument();
  });

  it('calls onSave with url when Enter is pressed in url mode', () => {
    const onSave = vi.fn();
    render(
      <TaskEditPalette
        task={baseTask}
        defaultField="url"
        projects={projects}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com' })
    );
  });
});
