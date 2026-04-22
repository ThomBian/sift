import { format } from "date-fns";
import type { WeekMode } from "../../hooks/useWeekTasks";

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
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-[0.5px] border-border bg-surface shrink-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Previous week"
          className="w-9 h-9 border-[0.5px] border-border text-muted hover:text-text transition-colors duration-150 shrink-0"
        >
          ←
        </button>
        <div
          tabIndex={0}
          data-week-header
          aria-label={label}
          className="outline-none focus-visible:ring-1 focus-visible:ring-accent px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted select-none cursor-default"
        >
          {label}
        </div>
        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Next week"
          className="w-9 h-9 border-[0.5px] border-border text-muted hover:text-text transition-colors duration-150 shrink-0"
        >
          →
        </button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-150 ${
            mode === "working" ? "text-text" : "text-dim"
          }`}
        >
          Working
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={mode === "due"}
          aria-label="Toggle week mode"
          onClick={() => onModeChange(mode === "working" ? "due" : "working")}
          className="relative w-12 h-6 border-[0.5px] border-border bg-surface-2 shrink-0"
        >
          <span
            className="absolute top-[1px] w-5 h-5 transition-all duration-150"
            style={{
              left: mode === "working" ? "1px" : "calc(100% - 21px)",
              backgroundColor: "#FF4F00",
              boxShadow: "0 0 6px rgba(255,79,0,0.4)",
            }}
          />
        </button>
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-150 ${
            mode === "due" ? "text-text" : "text-dim"
          }`}
        >
          Due
        </span>
      </div>
    </div>
  );
}
