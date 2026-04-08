import { describe, it, expect } from 'vitest';
import { moveDown, moveUp, sectionLocalToGlobal, EMOJI_GRID_COLS } from '../EmojiPicker/gridNav';

describe('emoji gridNav', () => {
  const workThenCreative = [
    { emojis: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
    { emojis: ['i', 'j', 'k', 'l', 'm', 'n'] },
  ];

  it('ArrowDown from last column of a full row lands in the next category (does not skip its row)', () => {
    // Last cell of first 8-wide row (column 7) → next section row 0, column clamped to 5 (6 cells)
    expect(moveDown(workThenCreative, 0, EMOJI_GRID_COLS - 1)).toEqual({ si: 1, local: 5 });
    expect(sectionLocalToGlobal(workThenCreative, 1, 5)).toBe(13);
    // Old flat i+8 on global index 7 → 15 (out of range for 14 cells) or, from col 5, 13 while skipping 8–11.
  });

  it('ArrowDown from column 0 goes to first cell of next category', () => {
    expect(moveDown(workThenCreative, 0, 0)).toEqual({ si: 1, local: 0 });
    expect(sectionLocalToGlobal(workThenCreative, 1, 0)).toBe(8);
  });

  it('ArrowUp from first row of a category returns to aligned column in previous category', () => {
    expect(moveUp(workThenCreative, 1, 0)).toEqual({ si: 0, local: 0 });
    expect(moveUp(workThenCreative, 1, 5)).toEqual({ si: 0, local: 5 });
  });
});
