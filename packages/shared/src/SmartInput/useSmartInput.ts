// packages/shared/src/SmartInput/useSmartInput.ts
import { useState, useCallback, useRef, useEffect } from "react";
import type { Task } from "../types";

export type ChipFocus = "project" | "dueDate" | "workingDate" | "url";
export type FocusTarget = "text" | ChipFocus;

const FOCUS_CYCLE: FocusTarget[] = [
  "text",
  "project",
  "dueDate",
  "workingDate",
  "url",
];

const AT_TRIGGERS: Record<string, ChipFocus> = {
  "@p": "project",
  "@d": "dueDate",
  "@w": "workingDate",
  "@u": "url",
};

export interface SmartInputValues {
  title: string;
  projectId: string | null;
  dueDate: Date | null;
  workingDate: Date | null;
  url: string | null;
}

function isFilled(chip: ChipFocus, values: SmartInputValues): boolean {
  if (chip === "project") return values.projectId !== null;
  if (chip === "dueDate") return values.dueDate !== null;
  if (chip === "workingDate") return values.workingDate !== null;
  return values.url != null && values.url.trim() !== "";
}

// Forward Tab: from text → first unfilled chip (or full cycle restart — see ref below); from chip → one step
function nextFocus(
  current: FocusTarget,
  values: SmartInputValues,
  fullCycleFromText: boolean,
): FocusTarget {
  if (current === "text") {
    if (fullCycleFromText) {
      // Just finished text → … → workingDate → text via Tab; continue the full ring from project
      return FOCUS_CYCLE[1];
    }
    // First Tab from title (after select / escape / initial): jump to first unfilled chip, or project if all filled
    const first = (FOCUS_CYCLE.slice(1) as ChipFocus[]).find(
      (c) => !isFilled(c, values),
    );
    return first ?? FOCUS_CYCLE[1];
  }
  const i = FOCUS_CYCLE.indexOf(current);
  return FOCUS_CYCLE[(i + 1) % FOCUS_CYCLE.length];
}

// Backward Shift+Tab: simple one-step reverse, no skip
function prevFocus(current: FocusTarget): FocusTarget {
  const i = FOCUS_CYCLE.indexOf(current);
  return FOCUS_CYCLE[(i - 1 + FOCUS_CYCLE.length) % FOCUS_CYCLE.length];
}

export interface UseSmartInputReturn {
  values: SmartInputValues;
  focus: FocusTarget;
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUrlKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleChipKeyDown: (chip: ChipFocus, e: React.KeyboardEvent) => void;
  handleChipClick: (chip: ChipFocus) => void;
  handleSelect: (chip: ChipFocus, value: string | Date | null) => void;
  cancelChipSelection: () => void;
  reset: () => void;
  /** Brief post-commit highlight on project / date chips (empty when idle). */
  commitFlash: ChipFocus | null;
}

const EMPTY: SmartInputValues = {
  title: "",
  projectId: null,
  dueDate: null,
  workingDate: null,
  url: null,
};

export function useSmartInput(
  onTaskReady: (
    task: Pick<Task, "title" | "dueDate" | "workingDate" | "url" | "projectId">,
  ) => void,
  initialValues: Partial<SmartInputValues> = {},
  initialFocus: FocusTarget = "text",
): UseSmartInputReturn {
  const [values, setValues] = useState<SmartInputValues>(() => ({
    ...EMPTY,
    ...initialValues,
  }));
  const [focus, setFocus] = useState<FocusTarget>(initialFocus);
  const [commitFlash, setCommitFlash] = useState<ChipFocus | null>(null);
  const commitFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /** After Tab advances workingDate → text, next Tab from title should walk all chips, not only empty ones. */
  const afterFullChipRingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (commitFlashTimeoutRef.current !== null) {
        clearTimeout(commitFlashTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = useCallback(() => {
    if (!values.title.trim()) return;
    const trimmedUrl = values.url?.trim();
    onTaskReady({
      title: values.title.trim(),
      projectId: values.projectId,
      dueDate: values.dueDate,
      workingDate: values.workingDate,
      url: trimmedUrl ? trimmedUrl : null,
    });
    if (commitFlashTimeoutRef.current !== null) {
      clearTimeout(commitFlashTimeoutRef.current);
      commitFlashTimeoutRef.current = null;
    }
    setCommitFlash(null);
    setValues(EMPTY);
    afterFullChipRingRef.current = false;
    setFocus("text");
  }, [values, onTaskReady]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      for (const [trigger, chip] of Object.entries(AT_TRIGGERS)) {
        if (val.endsWith(trigger)) {
          setValues((v) => ({ ...v, title: val.slice(0, -trigger.length) }));
          setFocus(chip);
          return;
        }
      }
      setValues((v) => ({ ...v, title: val }));
    },
    [],
  );

  const moveFocusOnTab = useCallback(
    (e: React.KeyboardEvent, f: FocusTarget): FocusTarget => {
      if (e.shiftKey) {
        const next = prevFocus(f);
        if (next === "text") afterFullChipRingRef.current = false;
        return next;
      }
      let fullCycleFromText = false;
      if (f === "text") {
        fullCycleFromText = afterFullChipRingRef.current;
        afterFullChipRingRef.current = false;
      }
      const next = nextFocus(f, values, fullCycleFromText);
      if (f === "url" && next === "text") {
        afterFullChipRingRef.current = true;
      }
      return next;
    },
    [values],
  );

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setFocus((f) => moveFocusOnTab(e, f));
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave, moveFocusOnTab],
  );

  const handleChipKeyDown = useCallback(
    (chip: ChipFocus, e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setFocus((f) => moveFocusOnTab(e, f));
      } else if (e.key === "Escape") {
        e.preventDefault();
        setFocus("text");
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave, moveFocusOnTab],
  );

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValues((prev) => ({ ...prev, url: v || null }));
    },
    [],
  );

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setFocus((f) => moveFocusOnTab(e, f));
      } else if (e.key === "Escape") {
        e.preventDefault();
        setFocus("text");
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Enter") {
        e.preventDefault();
        setFocus("text");
      }
    },
    [handleSave, moveFocusOnTab],
  );

  const handleChipClick = useCallback((chip: ChipFocus) => {
    setFocus(chip);
  }, []);

  const handleSelect = useCallback((chip: ChipFocus, value: string | Date | null) => {
    const shouldFlash =
      value != null &&
      (chip === "project" ||
        ((chip === "dueDate" || chip === "workingDate") && value instanceof Date));

    if (shouldFlash) {
      if (commitFlashTimeoutRef.current !== null) {
        clearTimeout(commitFlashTimeoutRef.current);
      }
      setCommitFlash(chip);
      commitFlashTimeoutRef.current = setTimeout(() => {
        setCommitFlash(null);
        commitFlashTimeoutRef.current = null;
      }, 220);
    }

    const key = chip === "project" ? "projectId" : chip;
    setValues((v) => {
      const updated = { ...v, [key]: value };
      // Advance to next unfilled chip, or back to text if this was the last one
      const chipIndex = FOCUS_CYCLE.indexOf(chip);
      const remaining = (
        FOCUS_CYCLE.slice(chipIndex + 1) as ChipFocus[]
      ).filter((c) => !isFilled(c, updated));
      afterFullChipRingRef.current = false;
      setFocus(remaining.length > 0 ? remaining[0] : "text");
      return updated;
    });
  }, []);

  const cancelChipSelection = useCallback(() => {
    afterFullChipRingRef.current = false;
    setFocus("text");
  }, []);

  const reset = useCallback(() => {
    if (commitFlashTimeoutRef.current !== null) {
      clearTimeout(commitFlashTimeoutRef.current);
      commitFlashTimeoutRef.current = null;
    }
    setCommitFlash(null);
    afterFullChipRingRef.current = false;
    setValues(EMPTY);
    setFocus("text");
  }, []);

  return {
    values,
    focus,
    handleTitleChange,
    handleTitleKeyDown,
    handleUrlChange,
    handleUrlKeyDown,
    handleChipKeyDown,
    handleChipClick,
    handleSelect,
    cancelChipSelection,
    reset,
    commitFlash,
  };
}
