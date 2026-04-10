import { DayPicker } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import styles from './Calendar.module.css';

export interface CalendarProps {
  selected?: Date;
  onSelect: (date: Date) => void;
  taskCounts?: Record<string, number>;
  month?: Date;
  onMonthChange?: (month: Date) => void;
}

export function Calendar({ selected, onSelect, taskCounts = {}, month, onMonthChange }: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={(d) => d && onSelect(d)}
      month={month}
      onMonthChange={onMonthChange}
      locale={fr}
      className={styles.rdp}
      modifiers={{ hasTasks: (date) => !!taskCounts[date.toISOString().split('T')[0]] }}
      modifiersClassNames={{ hasTasks: styles.hasTasks }}
      components={{
        DayContent: ({ date }) => {
          const count = taskCounts[date.toISOString().split('T')[0]];
          return (
            <div className={styles.dayCell}>
              <span>{date.getDate()}</span>
              {count > 0 && <span className={styles.count}>{count}</span>}
            </div>
          );
        }
      }}
    />
  );
}
