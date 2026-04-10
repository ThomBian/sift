import { DayPicker, type DayProps } from 'react-day-picker';
import styles from './Calendar.module.css';

export interface CalendarProps {
  selected?: Date;
  onSelect: (date: Date) => void;
  taskCounts?: Record<string, number>;
  month?: Date;
  onMonthChange?: (month: Date) => void;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function Calendar({ selected, onSelect, taskCounts = {}, month, onMonthChange }: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={(d) => d && onSelect(d)}
      month={month}
      onMonthChange={onMonthChange}
      className={styles.rdp}
      modifiers={{ hasTasks: (date) => !!taskCounts[localDateKey(date)] }}
      modifiersClassNames={{ hasTasks: styles.hasTasks }}
      components={{
          Day: ({ day, modifiers, ...props }: DayProps) => {
          if (!day || !day.date) {
            // Return an empty td if day or day.date is not provided
            return <td {...props} />; 
          }
          const isoDate = day.date.toISOString().split('T')[0];
          const count = taskCounts[isoDate];
          return (
            <td 
              {...props} 
              className={`${styles.dayCell} ${modifiers.hasTasks ? styles.hasTasks : ''}`}
              data-testid={`day-cell-${isoDate}`}
            >
              <span>{day.date.getDate()}</span>
              {count > 0 && <span className={styles.count}>{count}</span>}
            </td>
          );
        }
      }}
    />
  );
}
