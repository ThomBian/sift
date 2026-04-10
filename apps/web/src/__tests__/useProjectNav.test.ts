import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectNav, SHOW_ARCHIVED_TOGGLE_ID } from "../hooks/useProjectNav";

const PROJECT_IDS = ["p-a", "p-b", "p-c"];

function orderedWithToggle(ids: string[]) {
  return [...ids, SHOW_ARCHIVED_TOGGLE_ID];
}

function makeKeyEvent(key: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, bubbles: true });
}

describe("useProjectNav", () => {
  it("starts with focusedProjectId null", () => {
    const { result } = renderHook(() => useProjectNav());
    expect(result.current.focusedProjectId).toBeNull();
  });

  it("ArrowDown focuses first id when none selected", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowDown"), {
        orderedIds: PROJECT_IDS,
      });
    });
    expect(result.current.focusedProjectId).toBe("p-a");
  });

  it("ArrowDown moves to next id", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId("p-a");
    });
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowDown"), {
        orderedIds: PROJECT_IDS,
      });
    });
    expect(result.current.focusedProjectId).toBe("p-b");
  });

  it("ArrowDown from last id deselects (null)", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId("p-c");
    });
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowDown"), {
        orderedIds: PROJECT_IDS,
      });
    });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it("ArrowUp focuses last id when none selected", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowUp"), {
        orderedIds: PROJECT_IDS,
      });
    });
    expect(result.current.focusedProjectId).toBe("p-c");
  });

  it("ArrowUp moves to previous id", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId("p-c");
    });
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowUp"), {
        orderedIds: PROJECT_IDS,
      });
    });
    expect(result.current.focusedProjectId).toBe("p-b");
  });

  it("ArrowUp from first id deselects (null)", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId("p-a");
    });
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowUp"), {
        orderedIds: PROJECT_IDS,
      });
    });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it("Escape deselects", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId("p-b");
    });
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("Escape"), {
        orderedIds: PROJECT_IDS,
      });
    });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it("ignores modifier combos", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId("p-a");
    });
    const e = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      metaKey: true,
      bubbles: true,
    });
    act(() => {
      result.current.handleProjectKeyDown(e, { orderedIds: PROJECT_IDS });
    });
    expect(result.current.focusedProjectId).toBe("p-a");
  });

  it("does nothing when ordered list is empty", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowDown"), {
        orderedIds: [],
      });
    });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it("ArrowDown from last project moves to show-archived toggle when present", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId("p-c");
    });
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowDown"), {
        orderedIds: orderedWithToggle(PROJECT_IDS),
      });
    });
    expect(result.current.focusedProjectId).toBe(SHOW_ARCHIVED_TOGGLE_ID);
  });

  it("ArrowUp from toggle focuses last project", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId(SHOW_ARCHIVED_TOGGLE_ID);
    });
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowUp"), {
        orderedIds: orderedWithToggle(PROJECT_IDS),
      });
    });
    expect(result.current.focusedProjectId).toBe("p-c");
  });

  it("Space on toggle calls onSpaceOnToggle and preventDefault", () => {
    const { result } = renderHook(() => useProjectNav());
    let toggled = false;
    act(() => {
      result.current.setFocusedProjectId(SHOW_ARCHIVED_TOGGLE_ID);
    });
    const e = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      result.current.handleProjectKeyDown(e, {
        orderedIds: orderedWithToggle(PROJECT_IDS),
        onSpaceOnToggle: () => {
          toggled = true;
        },
      });
    });
    expect(toggled).toBe(true);
    expect(e.defaultPrevented).toBe(true);
  });

  it("Space on project id does not call onSpaceOnToggle", () => {
    const { result } = renderHook(() => useProjectNav());
    let toggled = false;
    act(() => {
      result.current.setFocusedProjectId("p-a");
    });
    const e = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      result.current.handleProjectKeyDown(e, {
        orderedIds: orderedWithToggle(PROJECT_IDS),
        onSpaceOnToggle: () => {
          toggled = true;
        },
      });
    });
    expect(toggled).toBe(false);
  });

  it("Escape on toggle clears focus", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId(SHOW_ARCHIVED_TOGGLE_ID);
    });
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("Escape"), {
        orderedIds: orderedWithToggle(PROJECT_IDS),
      });
    });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it("ArrowDown from toggle deselects when no ids follow the toggle", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId(SHOW_ARCHIVED_TOGGLE_ID);
    });
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowDown"), {
        orderedIds: orderedWithToggle(PROJECT_IDS),
      });
    });
    expect(result.current.focusedProjectId).toBeNull();
  });

  it("ArrowDown from toggle focuses first archived id when listed after toggle", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId(SHOW_ARCHIVED_TOGGLE_ID);
    });
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowDown"), {
        orderedIds: [...PROJECT_IDS, SHOW_ARCHIVED_TOGGLE_ID, "p-archived"],
      });
    });
    expect(result.current.focusedProjectId).toBe("p-archived");
  });

  it("ArrowUp from first archived id focuses toggle", () => {
    const { result } = renderHook(() => useProjectNav());
    act(() => {
      result.current.setFocusedProjectId("p-archived");
    });
    act(() => {
      result.current.handleProjectKeyDown(makeKeyEvent("ArrowUp"), {
        orderedIds: [...PROJECT_IDS, SHOW_ARCHIVED_TOGGLE_ID, "p-archived"],
      });
    });
    expect(result.current.focusedProjectId).toBe(SHOW_ARCHIVED_TOGGLE_ID);
  });
});
