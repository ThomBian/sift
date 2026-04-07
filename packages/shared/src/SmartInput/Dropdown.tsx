// packages/shared/src/SmartInput/Dropdown.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  mode?: 'floating' | 'inline';
}

const DATE_QUICK_PICKS = ['Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function parseQuickDate(label: string): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (label === 'Today') return d;
  if (label === 'Tomorrow') { d.setDate(d.getDate() + 1); return d; }
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const target = days.indexOf(label);
  if (target !== -1) {
    const diff = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
  }
  return d;
}

type FlatItem =
  | { kind: 'project'; p: ProjectWithSpace; groupLabel?: string }
  | { kind: 'new' }
  | { kind: 'date'; label: string; date?: Date };

export function Dropdown({ type, projects, query, onSelect, mode = 'floating' }: DropdownProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Reset focused item when query changes
  useEffect(() => { setFocusedIndex(-1); }, [query]);

  const flatItems = useMemo((): FlatItem[] => {
    if (type === 'project') {
      const items: FlatItem[] = [];
      if (query) {
        projects
          .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
          .forEach(p => items.push({ kind: 'project', p }));
      } else {
        const spaceMap = new Map<string, { space: Space; projects: ProjectWithSpace[] }>();
        for (const p of projects) {
          if (!spaceMap.has(p.spaceId)) spaceMap.set(p.spaceId, { space: p.space, projects: [] });
          spaceMap.get(p.spaceId)!.projects.push(p);
        }
        for (const { space, projects: sProjects } of spaceMap.values()) {
          sProjects.forEach((p, i) =>
            items.push({ kind: 'project', p, groupLabel: i === 0 ? space.name : undefined })
          );
        }
      }
      items.push({ kind: 'new' });
      return items;
    }
    // Filter quick picks by query
    const filtered = query
      ? DATE_QUICK_PICKS.filter(l => l.toLowerCase().includes(query.toLowerCase()))
      : DATE_QUICK_PICKS;
    const items: FlatItem[] = filtered.map(label => ({ kind: 'date', label }));
    // Try to parse query as a raw date (e.g. "Apr 10", "4/15")
    if (query && items.length === 0) {
      const d = new Date(query);
      if (!isNaN(d.getTime())) {
        d.setHours(0, 0, 0, 0);
        const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        items.push({ kind: 'date', label: formatted, date: d });
      }
    }
    return items;
  }, [type, projects, query]);

  // Stable refs so the keyboard listener never goes stale without re-registering
  const flatItemsRef = useRef(flatItems);
  useEffect(() => { flatItemsRef.current = flatItems; }, [flatItems]);
  const focusedIndexRef = useRef(focusedIndex);
  useEffect(() => { focusedIndexRef.current = focusedIndex; }, [focusedIndex]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // Capture-phase listener fires before view bubble listeners and before React's synthetic events
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex(i => Math.min(i + 1, flatItemsRef.current.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        e.stopImmediatePropagation();
        e.preventDefault();
        const idx = focusedIndexRef.current >= 0 ? focusedIndexRef.current : 0;
        const item = flatItemsRef.current[idx];
        if (!item) return;
        if (item.kind === 'project') onSelectRef.current(item.p.id);
        else if (item.kind === 'new') onSelectRef.current(null);
        else onSelectRef.current(item.date ?? parseQuickDate(item.label));
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const dropdownClass = mode === 'inline' ? styles.dropdownInline : styles.dropdown;

  if (type === 'project') {
    return (
      <div className={dropdownClass} role="listbox">
        {flatItems.map((item, idx) => {
          if (item.kind === 'new') {
            return (
              <button
                key="new"
                className={`${styles.item} ${styles.newItem} ${idx === focusedIndex ? styles.itemFocused : ''}`}
                onClick={() => onSelect(null)}
                type="button"
              >
                + New project…
              </button>
            );
          }
          if (item.kind === 'project') {
            return (
              <React.Fragment key={item.p.id}>
                {item.groupLabel && (
                  <div className={styles.groupLabel}>{item.groupLabel}</div>
                )}
                <button
                  className={`${styles.item} ${idx === focusedIndex ? styles.itemFocused : ''}`}
                  onClick={() => onSelect(item.p.id)}
                  role="option"
                  type="button"
                >
                  <span className={styles.dot} style={{ background: item.p.space.color }} />
                  {item.p.name}
                </button>
              </React.Fragment>
            );
          }
          return null;
        })}
      </div>
    );
  }

  // Date picker (dueDate or workingDate)
  return (
    <div className={dropdownClass} role="listbox">
      <div className={styles.quickPicks}>
        {flatItems.map((item, idx) => {
          if (item.kind !== 'date') return null;
          return (
            <button
              key={item.label}
              className={`${styles.quickPick} ${idx === focusedIndex ? styles.quickPickFocused : ''}`}
              onClick={() => onSelect(item.date ?? parseQuickDate(item.label))}
              role="option"
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
