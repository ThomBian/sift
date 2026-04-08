import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskRow from '../components/TaskRow';
import type { Task, Project, Space } from '@sift/shared';

const now = new Date();

const space: Space = {
  id: 'space-1',
  name: 'Work',
  color: '#5E6AD2',
  createdAt: now,
  updatedAt: now,
  synced: true,
};

const project: Project = {
  id: 'project-1',
  name: 'General',
  emoji: '📚',
  spaceId: 'space-1',
  dueDate: null,
  createdAt: now,
  updatedAt: now,
  synced: true,
};

const baseTask: Task = {
  id: 'task-1',
  title: 'Write unit tests',
  projectId: 'project-1',
  status: 'inbox',
  workingDate: null,
  dueDate: null,
  createdAt: now,
  updatedAt: now,
  completedAt: null,
  synced: true,
};

describe('TaskRow', () => {
  it('renders the task title', () => {
    render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText('Write unit tests')).toBeInTheDocument();
  });

  it('applies focused styles when isFocused is true', () => {
    const { container } = render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={true}
        onFocus={vi.fn()}
      />
    );
    const row = container.firstChild as HTMLElement;
    expect(row.className).toMatch(/laser-focus/);
    expect(row.className).toMatch(/FF4F00/);
  });

  it('does not apply focused styles when isFocused is false', () => {
    const { container } = render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    const row = container.firstChild as HTMLElement;
    expect(row.className).not.toMatch(/laser-focus/);
  });

  it('calls onFocus when the row is clicked', () => {
    const onFocus = vi.fn();
    const { container } = render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={onFocus}
      />
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('renders space dot with space color', () => {
    const { container } = render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    const dot = container.querySelector('[data-testid="space-dot"]') as HTMLElement;
    expect(dot).toBeInTheDocument();
    expect(dot.style.backgroundColor).toBe('rgb(94, 106, 210)');
  });

  it('shows Late Tax on due date only when task is late (no row bg-red)', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const lateTask: Task = { ...baseTask, dueDate: yesterday, status: 'todo' };

    const { container } = render(
      <TaskRow
        task={lateTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );

    const row = container.firstChild as HTMLElement;
    expect(row.className).not.toMatch(/bg-red/);

    const dateEl = screen.getByTestId('due-date');
    expect(dateEl.className).toMatch(/text-red/);
    expect(dateEl.querySelector('svg')).toBeTruthy();
  });

  it('does not show due date in red when task is done', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const doneTask: Task = {
      ...baseTask,
      dueDate: yesterday,
      status: 'done',
      completedAt: new Date(),
    };

    render(
      <TaskRow
        task={doneTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );

    const dateEl = screen.getByTestId('due-date');
    expect(dateEl.className).not.toMatch(/text-red/);
  });

  it('shows a link icon when task has sourceUrl', () => {
    const taskWithUrl: Task = { ...baseTask, sourceUrl: 'https://example.com' };

    render(
      <TaskRow
        task={taskWithUrl}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );

    expect(screen.getByTestId('source-url-icon')).toBeInTheDocument();
  });

  it('does not show link icon when task has no sourceUrl', () => {
    render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );

    expect(screen.queryByTestId('source-url-icon')).toBeNull();
  });

  it('renders project label with emoji and italic project name when showProject is true', () => {
    render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );

    const label = screen.getByTestId('project-label');
    expect(label).toHaveTextContent('📚');
    expect(label).toHaveTextContent('General');
    const em = label.querySelector('em');
    expect(em).toBeTruthy();
    expect(em?.textContent).toBe('General');
    expect(em?.className).toMatch(/italic/);
  });

  it('hides project label when showProject is false', () => {
    render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
        showProject={false}
      />
    );

    expect(screen.queryByTestId('project-label')).toBeNull();
  });
});
