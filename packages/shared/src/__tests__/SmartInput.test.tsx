// packages/shared/src/__tests__/SmartInput.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartInput } from '../SmartInput/SmartInput';
import type { ProjectWithSpace } from '../SmartInput/Dropdown';

const mockProjects: ProjectWithSpace[] = [
  {
    id: 'proj-1',
    name: 'General',
    emoji: '📚',
    spaceId: 'space-1',
    dueDate: null,
    archived: false,
    url: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
    space: { id: 'space-1', name: 'Personal', color: '#5E6AD2', createdAt: new Date(), updatedAt: new Date(), synced: false },
  },
  {
    id: 'proj-2',
    name: 'Auth PR',
    emoji: '📚',
    spaceId: 'space-2',
    dueDate: null,
    archived: false,
    url: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
    space: { id: 'space-2', name: 'Work', color: '#e05252', createdAt: new Date(), updatedAt: new Date(), synced: false },
  },
];

describe('SmartInput', () => {
  let onTaskReady: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onTaskReady = vi.fn();
  });

  it('renders the input and three chip buttons', () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    expect(screen.getByRole('textbox', { name: /task title/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'dueDate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'workingDate' })).toBeInTheDocument();
  });

  it('clicking the @p chip opens the project dropdown', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    await userEvent.click(screen.getByRole('button', { name: 'project' }));
    expect(screen.getByRole('option', { name: /General/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Auth PR/ })).toBeInTheDocument();
  });

  it('selecting a project from the dropdown updates the chip label', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    await userEvent.click(screen.getByRole('button', { name: 'project' }));
    await userEvent.click(screen.getByRole('option', { name: /General/ }));
    expect(screen.getByRole('button', { name: 'project' })).toHaveTextContent('General');
  });

  it('clicking the @d chip opens the date dropdown', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    await userEvent.click(screen.getByRole('button', { name: 'dueDate' }));
    expect(screen.getByRole('option', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tomorrow' })).toBeInTheDocument();
  });

  it('⌘+Enter calls onTaskReady with the entered title', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    const input = screen.getByRole('textbox', { name: /task title/i });
    await userEvent.type(input, 'Buy milk');
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    expect(onTaskReady).toHaveBeenCalledWith(expect.objectContaining({ title: 'Buy milk' }));
  });

  it('does not call onTaskReady when title is empty', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    const input = screen.getByRole('textbox', { name: /task title/i });
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    expect(onTaskReady).not.toHaveBeenCalled();
  });

  it('resets the input after successful save', async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    const input = screen.getByRole('textbox', { name: /task title/i });
    await userEvent.type(input, 'Some task');
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    expect(input).toHaveValue('');
  });
});
