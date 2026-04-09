type FocusState = 'none' | 'project' | 'task';

interface Hint {
  keys: string[];
  label: string;
  hot?: boolean;
}

const NONE_HINTS: Hint[] = [
  { keys: ['⌘K'], label: 'New task' },
  { keys: ['↑', '↓'], label: 'Navigate' },
  { keys: ['← →'], label: 'Switch view' },
];

function buildProjectHints(archiveHint?: 'archive' | 'unarchive'): Hint[] {
  const base: Hint[] = [
    { keys: ['N'], label: 'New', hot: true },
    { keys: ['E'], label: 'Edit', hot: true },
    { keys: ['D'], label: 'Due date', hot: true },
    { keys: ['C'], label: 'Icon', hot: true },
    { keys: ['O'], label: 'Open', hot: true },
  ];
  if (archiveHint) {
    base.push({ keys: ['A'], label: archiveHint, hot: true });
  }
  base.push({ keys: ['Esc'], label: 'Deselect' });
  return base;
}

const TASK_HINTS: Hint[] = [
  { keys: ['Enter'], label: 'Done', hot: true },
  { keys: ['D'], label: 'Due date', hot: true },
  { keys: ['W'], label: 'Today', hot: true },
  { keys: ['P'], label: 'Project', hot: true },
  { keys: ['E'], label: 'Edit', hot: true },
  { keys: ['⌫'], label: 'Archive' },
  { keys: ['Esc'], label: 'Back' },
];

function Key({ label, hot }: { label: string; hot?: boolean }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center min-h-9 min-w-[2.25rem] px-2 py-1 md:min-h-0 md:min-w-0 md:px-1.5 md:py-0.5 border-[0.5px] font-mono text-[10px] leading-none ${
        hot
          ? 'border-accent text-accent bg-accent/5 shadow-hotkey'
          : 'border-border-2 bg-surface-2 text-muted'
      }`}
    >
      {label}
    </kbd>
  );
}

export default function HintBar({
  focusState = 'none',
  archiveHint,
}: {
  focusState?: FocusState;
  archiveHint?: 'archive' | 'unarchive';
}) {
  const hints =
    focusState === 'task'
      ? TASK_HINTS
      : focusState === 'project'
        ? buildProjectHints(archiveHint)
        : NONE_HINTS;

  return (
    <div className="flex items-center gap-4 sm:gap-6 px-4 py-2.5 md:py-2 border-t border-[0.5px] border-border bg-surface shrink-0 overflow-x-auto pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
      {hints.map((hint) => (
        <div key={hint.label} className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            {hint.keys.map((k) => (
              <Key key={k} label={k} hot={hint.hot} />
            ))}
          </div>
          <span className="text-muted text-xs">{hint.label}</span>
        </div>
      ))}
    </div>
  );
}
