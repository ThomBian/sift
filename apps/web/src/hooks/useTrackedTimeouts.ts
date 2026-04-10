import { useEffect, useRef, useCallback } from "react";

/** Schedules timeouts that are cleared on unmount (avoids setState after teardown). */
export function useTrackedTimeouts(): (fn: () => void, ms: number) => void {
  const ids = useRef<Set<number>>(new Set());

  useEffect(
    () => () => {
      ids.current.forEach((id) => clearTimeout(id));
      ids.current.clear();
    },
    [],
  );

  return useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      ids.current.delete(id);
      fn();
    }, ms);
    ids.current.add(id);
  }, []);
}
