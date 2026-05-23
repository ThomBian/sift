/**
 * Canonical keyboard-focus highlight for list rows (tasks, projects, skills, artifacts).
 * See .impeccable.md — bg accent/5 + laser glow; border and text unchanged.
 */
export function listRowFocusClasses(isFocused: boolean): string {
  return `transition-colors duration-150 ${
    isFocused ? "bg-accent/5 laser-focus" : "hover:bg-surface-2"
  }`;
}
