import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmojiPicker } from '../EmojiPicker/EmojiPicker';

describe('EmojiPicker', () => {
  it('renders emoji grid with category headers', () => {
    render(<EmojiPicker query="" onSelect={vi.fn()} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Creative')).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(10);
  });

  it('calls onSelect when an emoji is clicked', () => {
    const onSelect = vi.fn();
    render(<EmojiPicker query="" onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(typeof onSelect.mock.calls[0][0]).toBe('string');
  });

  it('filters emojis by query', () => {
    render(<EmojiPicker query="rocket" onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeLessThan(10);
    expect(buttons[0].textContent).toBe('🚀');
  });

  it('shows empty state when no emojis match', () => {
    render(<EmojiPicker query="xyznonexistent" onSelect={vi.fn()} />);
    expect(screen.getByText('No emojis found')).toBeInTheDocument();
  });

  it('supports keyboard navigation — Enter selects focused emoji', () => {
    const onSelect = vi.fn();
    render(<EmojiPicker query="" onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
