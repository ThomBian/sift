import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Calendar } from '../Calendar/Calendar';

describe('Calendar', () => {
  it('renders correctly', () => {
    const onSelect = vi.fn();
    render(<Calendar onSelect={onSelect} />);
    
    // Check if it renders the current month (e.g., check for some day numbers)
    // react-day-picker usually renders days of the month
    // We can just check if it exists in the document
    expect(screen.getByRole('grid')).toBeDefined();
  });

  it('calls onSelect when a date is clicked', () => {
    const onSelect = vi.fn();
    render(<Calendar onSelect={onSelect} />);
    
    // Find a day button. Buttons are usually labeled by the date.
    // We can find any button that has text content (day number)
    const dayButtons = screen.getAllByRole('button');
    const firstDayButton = dayButtons.find(btn => /\d+/.test(btn.textContent || ''));
    
    if (firstDayButton) {
      fireEvent.click(firstDayButton);
      expect(onSelect).toHaveBeenCalled();
    }
  });

  it('shows task counts', () => {
    const onSelect = vi.fn();
    const today = new Date().toISOString().split('T')[0];
    const taskCounts = { [today]: 3 };
    
    render(<Calendar onSelect={onSelect} taskCounts={taskCounts} />);
    
    // Check if the count "3" is rendered
    expect(screen.getByText('3')).toBeDefined();
  });
});
