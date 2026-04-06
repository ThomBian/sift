import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HintBar from '../components/layout/HintBar';

describe('HintBar', () => {
  it('shows default hints when taskFocused is false', () => {
    render(<HintBar />);
    expect(screen.getByText('New task')).toBeInTheDocument();
    expect(screen.getByText('Navigate')).toBeInTheDocument();
    expect(screen.queryByText('Due date')).toBeNull();
    expect(screen.queryByText('Project')).toBeNull();
  });

  it('shows task-focused hints when taskFocused is true', () => {
    render(<HintBar taskFocused />);
    expect(screen.getByText('Due date')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.queryByText('New task')).toBeNull();
  });

  it('renders hot keys with accent class when taskFocused', () => {
    const { container } = render(<HintBar taskFocused />);
    const kbds = container.querySelectorAll('kbd');
    const enterKbd = [...kbds].find(k => k.textContent === 'Enter');
    expect(enterKbd?.className).toMatch(/accent/);
  });

  it('default keys do not have accent class', () => {
    const { container } = render(<HintBar />);
    const kbds = container.querySelectorAll('kbd');
    kbds.forEach(k => expect(k.className).not.toMatch(/accent/));
  });
});
