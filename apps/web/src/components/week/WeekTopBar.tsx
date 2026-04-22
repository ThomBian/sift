import { format } from "date-fns";
import type { WeekMode } from "../../hooks/useWeekTasks";

const MODE_OPTIONS: { id: WeekMode; label: string; title: string }[] = [
  { id: "working", label: "Working", title: "Group by working date" },
  { id: "due", label: "Due", title: "Group by due date" },
  {
    id: "completed",
    label: "Done",
    title: "Group by the day the task was marked complete",
  },
];

interface WeekTopBarProps {
  weekStart: Date;
  weekEnd: Date;
  mode: WeekMode;
  onModeChange: (mode: WeekMode) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  return `${format(weekStart, "EEE MMM d")} – ${format(weekEnd, "EEE MMM d, yyyy")}`;
}

export default function WeekTopBar({
  weekStart,
  weekEnd,
  mode,
  onModeChange,
  onPrevWeek,
  onNextWeek,
}: WeekTopBarProps) {
  const label = formatWeekRange(weekStart, weekEnd);

  return (
    <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-2.5 border-b border-[0.5px] border-border bg-surface shrink-0">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Previous week"
          className="w-9 h-9 border-[0.5px] border-border text-muted transition-[color,border-color,box-shadow] duration-150 shrink-0 hover:border-accent/40 hover:text-accent hover:shadow-hotkey"
        >
          ←
        </button>
        <div
          tabIndex={0}
          data-week-header
          aria-label={label}
          className="min-w-0 truncate outline-none focus:text-accent px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted select-none cursor-default transition-colors duration-150"
        >
          <span
            key={weekStart.getTime()}
            className="inline-block motion-reduce:animate-none motion-safe:animate-week-nudge"
          >
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Next week"
          className="w-9 h-9 border-[0.5px] border-border text-muted transition-[color,border-color,box-shadow] duration-150 shrink-0 hover:border-accent/40 hover:text-accent hover:shadow-hotkey"
        >
          →
        </button>
      </div>

      <div
        className="ml-auto grid h-9 min-w-0 w-[13.75rem] max-w-full shrink grid-cols-3 border-[0.5px] border-border bg-surface-2"
        role="radiogroup"
        aria-label="Week grouping"
      >
        {MODE_OPTIONS.map(({ id, label, title }, index) => {
          const selected = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={title}
              title={title}
              onClick={() => onModeChange(id)}
              className={`relative z-0 flex min-h-0 min-w-0 items-center justify-center px-1 font-mono text-[10px] uppercase tracking-[0.1em] outline-none transition-[color,background-color,box-shadow] duration-150 ${
                index < MODE_OPTIONS.length - 1
                  ? "border-r border-[0.5px] border-border"
                  : ""
              } ${
                selected
                  ? "z-[1] bg-accent/5 text-accent shadow-hotkey ring-1 ring-inset ring-accent"
                  : "text-muted hover:bg-surface hover:text-text hover:shadow-laser-archive"
              }`}
            >
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
