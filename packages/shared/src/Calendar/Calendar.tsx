import { DayPicker, type DayButtonProps } from "react-day-picker";
import "react-day-picker/style.css";
import styles from "./Calendar.module.css";

export interface CalendarProps {
  selected?: Date;
  onSelect: (date: Date) => void;
  taskCounts?: Record<string, number>;
  month?: Date;
  onMonthChange?: (month: Date) => void;
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
}: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={(d) => d && onSelect(d)}
      month={month}
      onMonthChange={onMonthChange}
      className={styles.rdp}
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
