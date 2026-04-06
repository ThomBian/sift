interface Hint {
  keys: string[];
  label: string;
  hot?: boolean;
}

const DEFAULT_HINTS: Hint[] = [
  { keys: ['⌘K'], label: 'New task' },
  { keys: ['↑', '↓'], label: 'Navigate' },
  { keys: ['← →'], label: 'Switch view' },
];

const TASK_HINTS: Hint[] = [
  { keys: ['Enter'], label: 'Done', hot: true },
  { keys: ['D'], label: 'Due date', hot: true },
  { keys: ['W'], label: 'Today', hot: true },
  { keys: ['P'], label: 'Project', hot: true },
  { keys: ['E'], label: 'Edit', hot: true },
  { keys: ['⌫'], label: 'Archive' },
  { keys: ['Esc'], label: 'Deselect' },
];

function Key({ label, hot }: { label: string; hot?: boolean }) {
  return (
    <kbd className={`inline-flex items-center px-1.5 py-0.5 border rounded-none font-mono text-[10px] leading-none ${
      hot
        ? 'border-accent text-accent bg-accent/5'
        : 'border-border-2 bg-surface-2 text-muted'
    }`}>
      {label}
    </kbd>
  );
}

export default function HintBar({ taskFocused = false }: { taskFocused?: boolean }) {
  const hints = taskFocused ? TASK_HINTS : DEFAULT_HINTS;
  return (
    <div className="flex items-center gap-6 px-4 py-2 border-t border-border bg-surface shrink-0 overflow-x-auto">
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
