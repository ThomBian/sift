/**
 * Detects an explicit calendar year in typed date strings (4-digit year, or m/d/y with a year segment).
 * Used so month/day-only input can default to the current year instead of the engine's 2001 fallback.
 */
export function dateQueryHasExplicitYear(query: string): boolean {
  const q = query.trim();
  if (/\b(19|20)\d{2}\b/.test(q)) return true;
  if (/\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b/.test(q)) return true;
  return false;
}

/**
 * Parse freeform date chip input (e.g. "Apr 10", "4/15"). If the user did not specify a year,
 * uses the calendar year of `reference` (default: today).
 */
export function parseLooseDateQuery(query: string, reference: Date = new Date()): Date | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;

  d.setHours(0, 0, 0, 0);

  if (!dateQueryHasExplicitYear(trimmed)) {
    d.setFullYear(reference.getFullYear());
  }

  return d;
}
