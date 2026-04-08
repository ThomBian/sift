/** 8-column row-major grid per section (matches each category sub-grid in EmojiPicker). */

export const EMOJI_GRID_COLS = 8;

export type EmojiGridSection = { emojis: string[] };

export function itemsInRow(sectionLen: number, row: number): number {
  return Math.min(EMOJI_GRID_COLS, sectionLen - row * EMOJI_GRID_COLS);
}

export function numRows(sectionLen: number): number {
  return Math.ceil(sectionLen / EMOJI_GRID_COLS);
}

export function globalToSectionLocal(
  sections: EmojiGridSection[],
  g: number
): { si: number; local: number } | null {
  let off = 0;
  for (let si = 0; si < sections.length; si++) {
    const L = sections[si].emojis.length;
    if (g >= off && g < off + L) return { si, local: g - off };
    off += L;
  }
  return null;
}

export function sectionLocalToGlobal(sections: EmojiGridSection[], si: number, local: number): number {
  let g = 0;
  for (let i = 0; i < si; i++) g += sections[i].emojis.length;
  return g + local;
}

export function moveDown(sections: EmojiGridSection[], si: number, local: number): { si: number; local: number } {
  const L = sections[si].emojis.length;
  const row = Math.floor(local / EMOJI_GRID_COLS);
  const col = local % EMOJI_GRID_COLS;
  const nr = numRows(L);

  if (row + 1 < nr) {
    const irNext = itemsInRow(L, row + 1);
    const tcol = Math.min(col, irNext - 1);
    return { si, local: (row + 1) * EMOJI_GRID_COLS + tcol };
  }
  if (si + 1 < sections.length) {
    const Ln = sections[si + 1].emojis.length;
    if (Ln === 0) return moveDown(sections, si + 1, 0);
    const ir0 = itemsInRow(Ln, 0);
    const tcol = Math.min(col, ir0 - 1);
    return { si: si + 1, local: tcol };
  }
  return { si, local };
}

export function moveUp(sections: EmojiGridSection[], si: number, local: number): { si: number; local: number } {
  const L = sections[si].emojis.length;
  const row = Math.floor(local / EMOJI_GRID_COLS);
  const col = local % EMOJI_GRID_COLS;

  if (row > 0) {
    const irPrev = itemsInRow(L, row - 1);
    const tcol = Math.min(col, irPrev - 1);
    return { si, local: (row - 1) * EMOJI_GRID_COLS + tcol };
  }
  if (si > 0) {
    const Lp = sections[si - 1].emojis.length;
    const lastRow = numRows(Lp) - 1;
    const irLast = itemsInRow(Lp, lastRow);
    const tcol = Math.min(col, irLast - 1);
    return { si: si - 1, local: lastRow * EMOJI_GRID_COLS + tcol };
  }
  return { si, local };
}

export function moveRight(sections: EmojiGridSection[], si: number, local: number): { si: number; local: number } {
  const L = sections[si].emojis.length;
  const row = Math.floor(local / EMOJI_GRID_COLS);
  const col = local % EMOJI_GRID_COLS;
  const ir = itemsInRow(L, row);

  if (col + 1 < ir) return { si, local: local + 1 };
  if (row + 1 < numRows(L)) return { si, local: (row + 1) * EMOJI_GRID_COLS };
  if (si + 1 < sections.length) return { si: si + 1, local: 0 };
  return { si, local };
}

export function moveLeft(sections: EmojiGridSection[], si: number, local: number): { si: number; local: number } {
  const L = sections[si].emojis.length;
  const row = Math.floor(local / EMOJI_GRID_COLS);
  const col = local % EMOJI_GRID_COLS;

  if (col > 0) return { si, local: local - 1 };
  if (row > 0) {
    const irPrev = itemsInRow(L, row - 1);
    return { si, local: (row - 1) * EMOJI_GRID_COLS + (irPrev - 1) };
  }
  if (si > 0) {
    const Lp = sections[si - 1].emojis.length;
    const lastRow = numRows(Lp) - 1;
    const irLast = itemsInRow(Lp, lastRow);
    return { si: si - 1, local: lastRow * EMOJI_GRID_COLS + (irLast - 1) };
  }
  return { si, local };
}
