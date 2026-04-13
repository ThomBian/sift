// packages/shared/src/SmartInput/Dropdown.tsx
import React, { useState, useEffect, useMemo, useRef, useId } from "react";
import { startOfDay } from "date-fns";
import { matchBestDate } from "../parseLooseDate";
import { Calendar } from "../Calendar/Calendar";
import type { Project, Space } from "../types";
import type { ChipFocus, ProjectPickResult } from "./useSmartInput";
import styles from "./Dropdown.module.css";

export type DropdownChip = Exclude<ChipFocus, "url">;

export interface ProjectWithSpace extends Project {
  space: Space;
}

export type { ProjectPickResult };

interface DropdownProps {
  type: DropdownChip;
  projects: ProjectWithSpace[];
  query: string;
  /** Due / working date picker only. */
  onSelect?: (value: Date | null) => void;
  /** Project list only. */
  onProjectPick?: (result: ProjectPickResult) => void;
  mode?: "floating" | "inline";
  taskCounts?: Record<string, number>;
  /** Already-saved date for this chip (edit / reopen); keeps the grid in sync when the filter is empty. */
  committedDate?: Date | null;
}

type FlatItem =
  | { kind: "project"; p: ProjectWithSpace; groupLabel?: string }
  | { kind: "new" };

const DEFAULT_NEW_PROJECT_NAME = "New project";

export function Dropdown({
  type,
  projects,
  query,
  onSelect,
  onProjectPick,
  mode = "floating",
  taskCounts,
  committedDate = null,
}: DropdownProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dateTitleId = useId();
  const dateHintId = useId();

  // Reset focused item when query changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [query]);

  const bestMatch = useMemo(() => matchBestDate(query), [query]);

  // localSelected tracks the calendar's visual selection. It starts from bestMatch
  // (the parsed query) but can be moved independently by arrow-key navigation.
  const [localSelected, setLocalSelected] = useState<Date | undefined>(
    () => bestMatch ?? committedDate ?? undefined,
  );
  const [displayMonth, setDisplayMonth] = useState(
    () => bestMatch ?? committedDate ?? new Date(),
  );

  // When the user types and bestMatch changes, sync localSelected and the visible month.
  useEffect(() => {
    if (bestMatch) {
      setLocalSelected(bestMatch);
      setDisplayMonth(bestMatch);
      return;
    }
    setLocalSelected(committedDate ?? undefined);
    if (committedDate) setDisplayMonth(committedDate);
  }, [bestMatch, committedDate]);

  const flatItems = useMemo((): FlatItem[] => {
    if (type !== "project") return [];
    const items: FlatItem[] = [];
    if (query) {
      projects
        .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
        .forEach((p) => items.push({ kind: "project", p }));
    } else {
      const spaceMap = new Map<
        string,
        { space: Space; projects: ProjectWithSpace[] }
      >();
      for (const p of projects) {
        if (!spaceMap.has(p.spaceId))
          spaceMap.set(p.spaceId, { space: p.space, projects: [] });
        spaceMap.get(p.spaceId)!.projects.push(p);
      }
      for (const { space, projects: sProjects } of spaceMap.values()) {
        sProjects.forEach((p, i) =>
          items.push({
            kind: "project",
            p,
            groupLabel: i === 0 ? space.name : undefined,
          }),
        );
      }
    }
    items.push({ kind: "new" });
    return items;
  }, [type, projects, query]);

  // Stable refs so the keyboard listener never goes stale without re-registering
  const flatItemsRef = useRef(flatItems);
  useEffect(() => {
    flatItemsRef.current = flatItems;
  }, [flatItems]);
  const focusedIndexRef = useRef(focusedIndex);
  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  const onProjectPickRef = useRef(onProjectPick);
  useEffect(() => {
    onProjectPickRef.current = onProjectPick;
  }, [onProjectPick]);
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);
  const bestMatchRef = useRef(bestMatch);
  useEffect(() => {
    bestMatchRef.current = bestMatch;
  }, [bestMatch]);
  const localSelectedRef = useRef(localSelected);
  useEffect(() => {
    localSelectedRef.current = localSelected;
  }, [localSelected]);
  const typeRef = useRef(type);
  useEffect(() => {
    typeRef.current = type;
  }, [type]);
  const committedDateRef = useRef(committedDate);
  useEffect(() => {
    committedDateRef.current = committedDate;
  }, [committedDate]);

  // Capture-phase listener fires before view bubble listeners and before React's synthetic events
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (typeRef.current === "dueDate" || typeRef.current === "workingDate") {
        const current =
          localSelectedRef.current || bestMatchRef.current || new Date();
        let next: Date | null = null;
        if (e.key === "ArrowDown") {
          next = new Date(current);
          next.setDate(next.getDate() + 7);
        } else if (e.key === "ArrowUp") {
          next = new Date(current);
          next.setDate(next.getDate() - 7);
        } else if (e.key === "ArrowRight") {
          next = new Date(current);
          next.setDate(next.getDate() + 1);
        } else if (e.key === "ArrowLeft") {
          next = new Date(current);
          next.setDate(next.getDate() - 1);
        }
        if (next) {
          e.stopImmediatePropagation();
          e.preventDefault();
          setLocalSelected(next);
          setDisplayMonth(next);
        }
      }

      if (e.key === "ArrowDown") {
        if (typeRef.current !== "project") return; // Let Calendar or other things handle it if we want, or just ignore
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex((i) =>
          Math.min(i + 1, flatItemsRef.current.length - 1),
        );
      } else if (e.key === "ArrowUp") {
        if (typeRef.current !== "project") return;
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        e.stopImmediatePropagation();
        e.preventDefault();
        if (typeRef.current !== "project") {
          let toConfirm =
            localSelectedRef.current ?? bestMatchRef.current ?? undefined;
          // Match Calendar defaultCursor: today is highlighted but not in `selected` until confirmed.
          if (toConfirm == null && committedDateRef.current == null) {
            toConfirm = startOfDay(new Date());
          }
          if (toConfirm) onSelectRef.current?.(toConfirm);
          return;
        }
        const idx = focusedIndexRef.current >= 0 ? focusedIndexRef.current : 0;
        const item = flatItemsRef.current[idx];
        if (!item) return;
        if (item.kind === "project")
          onProjectPickRef.current?.({ kind: "existing", id: item.p.id });
        else if (item.kind === "new") {
          const raw = queryRef.current.trim();
          const name = raw || DEFAULT_NEW_PROJECT_NAME;
          onProjectPickRef.current?.({ kind: "new", name });
        }
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const dropdownClass =
    mode === "inline" ? styles.dropdownInline : styles.dropdown;

  const dateMeta =
    type === "dueDate"
      ? {
          title: "Due date",
          hint: "When this must be finished.",
          headerClass: styles.dateHeaderDue,
        }
      : type === "workingDate"
        ? {
            title: "Working date",
            hint: "The day it appears on Today.",
            headerClass: styles.dateHeaderWorking,
          }
        : null;

  if (type === "project") {
    return (
      <div className={dropdownClass} role="listbox">
        {flatItems.map((item, idx) => {
          if (item.kind === "new") {
            return (
              <button
                key="new"
                className={`${styles.item} ${styles.newItem} ${idx === focusedIndex ? styles.itemFocused : ""}`}
                onClick={() =>
                  onProjectPick?.({
                    kind: "new",
                    name: query.trim() || DEFAULT_NEW_PROJECT_NAME,
                  })
                }
                type="button"
              >
                + New project…
              </button>
            );
          }
          if (item.kind === "project") {
            return (
              <React.Fragment key={item.p.id}>
                {item.groupLabel && (
                  <div className={styles.groupLabel}>{item.groupLabel}</div>
                )}
                <button
                  className={`${styles.item} ${idx === focusedIndex ? styles.itemFocused : ""}`}
                  onClick={() =>
                    onProjectPick?.({ kind: "existing", id: item.p.id })
                  }
                  role="option"
                  type="button"
                >
                  <span
                    className={styles.dot}
                    style={{ background: item.p.space.color }}
                  />
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
  if (!dateMeta) return null;

  const showDefaultCursor =
    !localSelected && !bestMatch && committedDate == null;
  const defaultCursorDay = showDefaultCursor ? startOfDay(new Date()) : undefined;

  return (
    <div
      className={dropdownClass}
      role="region"
      aria-labelledby={dateTitleId}
      aria-describedby={dateHintId}
    >
      <header className={`${styles.dateHeader} ${dateMeta.headerClass}`}>
        <h2 id={dateTitleId} className={styles.dateTitle}>
          {dateMeta.title}
        </h2>
        <p id={dateHintId} className={styles.dateHint}>
          {dateMeta.hint}
        </p>
      </header>
      <Calendar
        selected={localSelected}
        defaultCursor={defaultCursorDay}
        onSelect={(date) => {
          setLocalSelected(date);
          setDisplayMonth(date);
          onSelect?.(date);
        }}
        taskCounts={taskCounts}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
      />
    </div>
  );
}
