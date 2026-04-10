import { useState, useCallback } from "react";

export const SHOW_ARCHIVED_TOGGLE_ID = "__sift_show_archived_toggle__";

export interface ProjectKeyDownContext {
  /**
   * Ids in focus/DOM order: active projects, then `SHOW_ARCHIVED_TOGGLE_ID` when shown,
   * then archived project ids when the archived section is visible.
   */
  orderedIds: string[];
  onSpaceOnToggle?: () => void;
}

export interface UseProjectNavReturn {
  focusedProjectId: string | null;
  setFocusedProjectId: (id: string | null) => void;
  handleProjectKeyDown: (e: KeyboardEvent, ctx: ProjectKeyDownContext) => void;
}

export function useProjectNav(): UseProjectNavReturn {
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);

  const handleProjectKeyDown = useCallback(
    (e: KeyboardEvent, ctx: ProjectKeyDownContext) => {
      const { orderedIds, onSpaceOnToggle } = ctx;
      if (!orderedIds.length) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const currentIndex = focusedProjectId
        ? orderedIds.indexOf(focusedProjectId)
        : -1;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (currentIndex === -1) {
            setFocusedProjectId(orderedIds[0] ?? null);
          } else if (currentIndex === orderedIds.length - 1) {
            setFocusedProjectId(null);
          } else {
            setFocusedProjectId(orderedIds[currentIndex + 1] ?? null);
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (currentIndex === -1) {
            setFocusedProjectId(orderedIds[orderedIds.length - 1] ?? null);
          } else if (currentIndex === 0) {
            setFocusedProjectId(null);
          } else {
            setFocusedProjectId(orderedIds[currentIndex - 1] ?? null);
          }
          break;
        }
        case "Escape": {
          setFocusedProjectId(null);
          break;
        }
        case " ": {
          if (focusedProjectId === SHOW_ARCHIVED_TOGGLE_ID) {
            e.preventDefault();
            onSpaceOnToggle?.();
          }
          break;
        }
        default:
          break;
      }
    },
    [focusedProjectId],
  );

  return { focusedProjectId, setFocusedProjectId, handleProjectKeyDown };
}
