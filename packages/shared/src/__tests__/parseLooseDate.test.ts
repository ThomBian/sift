import { describe, it, expect } from 'vitest';
import { dateQueryHasExplicitYear, parseLooseDateQuery, matchBestDate } from '../parseLooseDate';

describe('dateQueryHasExplicitYear', () => {
  it('detects 4-digit years', () => {
    expect(dateQueryHasExplicitYear('Apr 10 2020')).toBe(true);
    expect(dateQueryHasExplicitYear('2026-03-01')).toBe(true);
  });

  it('detects m/d/y forms', () => {
    expect(dateQueryHasExplicitYear('4/15/2025')).toBe(true);
    expect(dateQueryHasExplicitYear('04/15/25')).toBe(true);
  });

  it('returns false when no year segment', () => {
    expect(dateQueryHasExplicitYear('Apr 10')).toBe(false);
    expect(dateQueryHasExplicitYear('4/15')).toBe(false);
  });
});

describe('parseLooseDateQuery', () => {
  const ref = new Date(2026, 3, 8); // April 8th, 2026 (Wednesday)

  it('applies reference year when year omitted', () => {
    const d = parseLooseDateQuery('Apr 10', ref);
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(3);
    expect(d!.getDate()).toBe(10);
  });

  it('applies reference year for slash m/d without year', () => {
    const d = parseLooseDateQuery('4/15', ref);
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(3);
    expect(d!.getDate()).toBe(15);
  });

  it('does not replace an explicit 4-digit year', () => {
    const d = parseLooseDateQuery('Apr 10 2020', ref);
    expect(d!.getFullYear()).toBe(2020);
  });

  it('does not replace m/d/y', () => {
    const d = parseLooseDateQuery('4/15/2025', ref);
    expect(d!.getFullYear()).toBe(2025);
  });

  it('returns null for garbage', () => {
    expect(parseLooseDateQuery('not a date', ref)).toBeNull();
    expect(parseLooseDateQuery('', ref)).toBeNull();
  });
});

describe('matchBestDate', () => {
  const ref = new Date(2026, 3, 8); // Wednesday, April 8, 2026

  it('matches today prefixes', () => {
    const d = matchBestDate('toda', ref);
    expect(d!.getDate()).toBe(8);
  });

  it('matches tomorrow prefixes', () => {
    const d = matchBestDate('tom', ref);
    expect(d!.getDate()).toBe(9);
  });

  it('matches next specific weekday', () => {
    // Current is Wed (3). Friday (5) should be +2.
    const fri = matchBestDate('fri', ref);
    expect(fri!.getDate()).toBe(10);

    // Monday (1) should be next week (+5).
    const mon = matchBestDate('mon', ref);
    expect(mon!.getDate()).toBe(13);

    // Wednesday (3) should be exactly 1 week from now if it is already Wednesday.
    const wed = matchBestDate('wed', ref);
    expect(wed!.getDate()).toBe(15);
  });

  it('falls back to parseLooseDateQuery', () => {
    const d = matchBestDate('Apr 10', ref);
    expect(d!.getDate()).toBe(10);
  });
});
