import { DayPicker, type DayButtonProps } from "react-day-picker";
import "react-day-picker/style.css";
import styles from "./Calendar.module.css";

const SIFT_DEFAULT_CURSOR = "siftDefaultCursor";

export interface CalendarProps {
  selected?: Date;
  onSelect: (date: Date) => void;
  taskCounts?: Record<string, number>;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  /** Visual-only “cursor” day when nothing is selected (e.g. today in SmartInput). Not a committed selection. */
  defaultCursor?: Date;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function Calendar({
  selected,
  onSelect,
  taskCounts = {},
  month,
  onMonthChange,
  defaultCursor,
}: CalendarProps) {
  const showDefaultCursor = !selected && defaultCursor != null;

  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={(d) => d && onSelect(d)}
      month={month}
      onMonthChange={onMonthChange}
      className={styles.rdp}
      modifiers={
        showDefaultCursor
          ? { [SIFT_DEFAULT_CURSOR]: defaultCursor }
          : undefined
      }
      modifiersClassNames={
        showDefaultCursor
          ? { [SIFT_DEFAULT_CURSOR]: styles.defaultCursor }
          : undefined
      }
      components={{
        DayButton: ({
          day,
          modifiers,
          className,
          ...props
        }: DayButtonProps) => {
          const count = taskCounts[localDateKey(day.date)];
          return (
            <button {...props} className={className}>
              <span>{day.date.getDate()}</span>
              {count > 0 && <span className={styles.count}>{count}</span>}
            </button>
          );
        },
      }}
    />
  );
}
