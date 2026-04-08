import { describe, it, expect } from 'vitest';
import { dateQueryHasExplicitYear, parseLooseDateQuery } from '../parseLooseDate';

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
  const ref = new Date(2026, 3, 8);

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
