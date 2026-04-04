interface Hint {
  keys: string[];
  label: string;
}

const HINTS: Hint[] = [
  { keys: ['j', 'k'], label: 'Move' },
  { keys: ['Enter'], label: 'Done' },
  { keys: ['Backspace'], label: 'Archive' },
  { keys: ['w'], label: '@working date' },
  { keys: ['p'], label: '@project' },
  { keys: ['d'], label: '@due date' },
  { keys: ['⌘+Enter'], label: 'Save' },
];

function Key({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border-2 bg-surface-2 text-dim font-mono text-[10px] leading-none">
      {label}
    </kbd>
  );
}

export default function HintBar() {
  return (
    <div className="flex items-center gap-6 px-4 py-2 border-t border-border bg-surface shrink-0 overflow-x-auto">
      {HINTS.map((hint) => (
        <div key={hint.label} className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            {hint.keys.map((k) => (
              <Key key={k} label={k} />
            ))}
          </div>
          <span className="text-muted text-xs">{hint.label}</span>
        </div>
      ))}
    </div>
  );
}
