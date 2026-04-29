import MonthDayCell from "./MonthDayCell";
import type { MonthDay } from "../../hooks/useMonthTasks";

const WEEKDAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

interface MonthGridProps {
  days: MonthDay[];
  focusedIndex: number;
  onFocusIndex: (index: number) => void;
}

export default function MonthGrid({
  days,
  focusedIndex,
  onFocusIndex,
}: MonthGridProps) {
  return (
    <div
      className="grid w-full grid-cols-7 border-l border-t border-[0.5px] border-border bg-surface"
      data-month-grid
      role="grid"
      aria-label="Month calendar"
    >
      {WEEKDAY_HEADERS.map((label, i) => (
        <div
          key={`h-${i}`}
          role="columnheader"
          className="border-r border-b border-[0.5px] border-border px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted bg-surface-2"
        >
          {label}
        </div>
      ))}
      {days.map((cell, i) => (
        <MonthDayCell
          key={cell.date.toISOString()}
          cell={cell}
          cellIndex={i}
          isFocused={focusedIndex === i}
          onFocus={() => onFocusIndex(i)}
        />
      ))}
    </div>
  );
}
