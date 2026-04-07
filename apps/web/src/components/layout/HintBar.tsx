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

const PROJECT_HINTS: Hint[] = [
  { keys: ['N'], label: 'New', hot: true },
  { keys: ['E'], label: 'Edit', hot: true },
  { keys: ['D'], label: 'Due date', hot: true },
  { keys: ['O'], label: 'Open', hot: true },
  { keys: ['Esc'], label: 'Deselect' },
];

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
      className={`inline-flex items-center px-1.5 py-0.5 border-[0.5px] font-mono text-[10px] leading-none ${
        hot
          ? 'border-accent text-accent bg-accent/5'
          : 'border-border-2 bg-surface-2 text-muted'
      }`}
      style={hot ? { boxShadow: '0 0 4px rgba(255, 79, 0, 0.2)' } : undefined}
    >
      {label}
    </kbd>
  );
}

export default function HintBar({ focusState = 'none' }: { focusState?: FocusState }) {
  const hints =
    focusState === 'task' ? TASK_HINTS
    : focusState === 'project' ? PROJECT_HINTS
    : NONE_HINTS;

  return (
    <div className="flex items-center gap-6 px-4 py-2 border-t border-[0.5px] border-border bg-surface shrink-0 overflow-x-auto">
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
