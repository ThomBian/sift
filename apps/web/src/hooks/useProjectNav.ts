import { useState, useCallback } from 'react';
import type { Project } from '@sift/shared';

export interface UseProjectNavReturn {
  focusedProjectId: string | null;
  setFocusedProjectId: (id: string | null) => void;
  handleProjectKeyDown: (e: KeyboardEvent, projects: Project[]) => void;
}

export function useProjectNav(): UseProjectNavReturn {
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);

  const handleProjectKeyDown = useCallback((e: KeyboardEvent, projects: Project[]) => {
    if (!projects.length) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const currentIndex = projects.findIndex((p) => p.id === focusedProjectId);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (currentIndex === -1) {
          setFocusedProjectId(projects[0].id);
        } else if (currentIndex === projects.length - 1) {
          setFocusedProjectId(null);
        } else {
          setFocusedProjectId(projects[currentIndex + 1].id);
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (currentIndex === -1) {
          setFocusedProjectId(projects[projects.length - 1].id);
        } else if (currentIndex === 0) {
          setFocusedProjectId(null);
        } else {
          setFocusedProjectId(projects[currentIndex - 1].id);
        }
        break;
      }
      case 'Escape': {
        setFocusedProjectId(null);
        break;
      }
      default:
        break;
    }
  }, [focusedProjectId]);

  return { focusedProjectId, setFocusedProjectId, handleProjectKeyDown };
}
