/// <reference types="vitest" />
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import HintBar from '../components/layout/HintBar';

describe('HintBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows default hints when focusState is none', () => {
    render(<HintBar focusState="none" />);
    expect(screen.getByText('New task')).toBeInTheDocument();
    expect(screen.getByText('Navigate')).toBeInTheDocument();
    expect(screen.queryByText('Done')).toBeNull();
    expect(screen.queryByText('New')).toBeNull();
  });

  it('shows task-focused hints when focusState is task', () => {
    render(<HintBar focusState="task" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Due date')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.queryByText('New task')).toBeNull();
  });

  it('shows project-focused hints when focusState is project', () => {
    render(<HintBar focusState="project" />);
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Due date')).toBeInTheDocument();
    expect(screen.getByText('Icon')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Deselect')).toBeInTheDocument();
    expect(screen.queryByText('New task')).toBeNull();
    expect(screen.queryByText('Done')).toBeNull();
  });

  it('defaults to none hints when no prop given', () => {
    render(<HintBar />);
    expect(screen.getByText('New task')).toBeInTheDocument();
  });

  it('task-focused hot keys have accent class', () => {
    const { container } = render(<HintBar focusState="task" />);
    const kbds = container.querySelectorAll('kbd');
    const enterKbd = [...kbds].find((k) => k.textContent === 'Enter');
    expect(enterKbd?.className).toMatch(/accent/);
  });

  it('project-focused hot keys have accent class', () => {
    const { container } = render(<HintBar focusState="project" />);
    const kbds = container.querySelectorAll('kbd');
    const nKbd = [...kbds].find((k) => k.textContent === 'N');
    expect(nKbd?.className).toMatch(/accent/);
  });

  it('default keys do not have accent class', () => {
    const { container } = render(<HintBar />);
    const kbds = container.querySelectorAll('kbd');
    kbds.forEach((k) => expect(k.className).not.toMatch(/accent/));
  });
});
