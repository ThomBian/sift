// packages/shared/src/SmartInput/Dropdown.tsx
import React from 'react';
import type { Project, Space } from '../types';
import type { ChipFocus } from './useSmartInput';
import styles from './Dropdown.module.css';

export interface ProjectWithSpace extends Project {
  space: Space;
}

interface DropdownProps {
  type: ChipFocus;
  projects: ProjectWithSpace[];
  query: string;
  onSelect: (value: string | Date | null) => void;
}

const DATE_QUICK_PICKS = ['Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function parseQuickDate(label: string): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (label === 'Today') return d;
  if (label === 'Tomorrow') { d.setDate(d.getDate() + 1); return d; }
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const target = days.indexOf(label);
  if (target !== -1) {
    const diff = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
  }
  return d;
}

export function Dropdown({ type, projects, query, onSelect }: DropdownProps) {
  if (type === 'project') {
    // Group by space
    const spaceMap = new Map<string, { space: Space; projects: ProjectWithSpace[] }>();
    for (const p of projects) {
      if (!spaceMap.has(p.spaceId)) spaceMap.set(p.spaceId, { space: p.space, projects: [] });
      spaceMap.get(p.spaceId)!.projects.push(p);
    }
    const filtered = query
      ? projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      : projects;

    return (
      <div className={styles.dropdown} role="listbox">
        {query
          ? filtered.map(p => (
              <button key={p.id} className={styles.item} onClick={() => onSelect(p.id)} role="option" type="button">
                <span className={styles.dot} style={{ background: p.space.color }} />
                {p.name}
              </button>
            ))
          : Array.from(spaceMap.values()).map(({ space, projects: sProjects }) => (
              <div key={space.id}>
                <div className={styles.groupLabel}>{space.name}</div>
                {sProjects.map(p => (
                  <button key={p.id} className={styles.item} onClick={() => onSelect(p.id)} role="option" type="button">
                    <span className={styles.dot} style={{ background: space.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            ))
        }
        <button className={`${styles.item} ${styles.newItem}`} onClick={() => onSelect(null)} type="button">
          + New project…
        </button>
      </div>
    );
  }

  // Date picker (dueDate or workingDate)
  return (
    <div className={styles.dropdown} role="listbox">
      <div className={styles.quickPicks}>
        {DATE_QUICK_PICKS.map(label => (
          <button
            key={label}
            className={styles.quickPick}
            onClick={() => onSelect(parseQuickDate(label))}
            role="option"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
