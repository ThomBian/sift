import type { MonthDay } from "../../hooks/useMonthTasks";

interface MonthDayCellProps {
  cell: MonthDay;
  cellIndex: number;
  isFocused: boolean;
  onFocus: () => void;
}

function pipWidthClass(count: number): string {
  if (count <= 0) return "w-0";
  if (count <= 2) return "w-2";
  if (count <= 4) return "w-3.5";
  return "w-full";
}

export default function MonthDayCell({
  cell,
  cellIndex,
  isFocused,
  onFocus,
}: MonthDayCellProps) {
  const dim = !cell.isCurrentMonth;
  const cls = [
    "relative outline-none border-r border-b border-[0.5px] border-border",
    "min-h-0 px-1.5 pt-1 pb-3.5 text-left",
    "font-mono text-[11px] leading-tight",
    dim ? "text-dim bg-bg" : "text-text bg-surface",
    cell.isToday ? "bg-[#FFF6F0]" : "",
    isFocused
      ? "ring-2 ring-inset ring-accent shadow-laser z-[1]"
      : "",
  ].join(" ");

  return (
    <button
      type="button"
      data-month-day-index={cellIndex}
      data-month-day-iso={cell.date.toISOString()}
      aria-label={cell.date.toDateString()}
      aria-current={cell.isToday ? "date" : undefined}
      tabIndex={isFocused ? 0 : -1}
      onFocus={onFocus}
      className={cls}
    >
      <span className="font-medium">{cell.date.getDate()}</span>
      {cell.count > 0 && (
        <span className="absolute inset-x-1.5 bottom-1 flex items-center gap-1">
          <span
            aria-hidden
            className={`h-[3px] bg-accent ${pipWidthClass(cell.count)}`}
          />
          <span className="ml-auto font-mono text-[9px] text-accent tabular-nums">
            {cell.count}
          </span>
        </span>
      )}
    </button>
  );
}
