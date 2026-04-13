// packages/shared/src/__tests__/useSmartInput.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSmartInput } from "../SmartInput/useSmartInput";

const tab = {
  key: "Tab",
  shiftKey: false,
  preventDefault: vi.fn(),
} as unknown as React.KeyboardEvent;
const shiftTab = {
  key: "Tab",
  shiftKey: true,
  preventDefault: vi.fn(),
} as unknown as React.KeyboardEvent;
const esc = {
  key: "Escape",
  shiftKey: false,
  preventDefault: vi.fn(),
} as unknown as React.KeyboardEvent;
const cmdEnter = {
  key: "Enter",
  metaKey: true,
  ctrlKey: false,
  preventDefault: vi.fn(),
} as unknown as React.KeyboardEvent<HTMLInputElement>;

const mockProjects = [{ name: "General" }, { name: "Auth PR" }];

function make(projects: { name: string }[] = mockProjects) {
  const onTaskReady = vi.fn();
  const hook = renderHook(() =>
    useSmartInput(onTaskReady, {}, "text", projects),
  );
  return { hook, onTaskReady };
}

describe("useSmartInput — initial state", () => {
  it("starts with focus on text and empty values", () => {
    const { hook } = make();
    expect(hook.result.current.focus).toBe("text");
    expect(hook.result.current.values.title).toBe("");
    expect(hook.result.current.values.projectId).toBeNull();
    expect(hook.result.current.values.dueDate).toBeNull();
    expect(hook.result.current.values.workingDate).toBeNull();
    expect(hook.result.current.values.url).toBeNull();
  });
});

describe("useSmartInput — Tab rotation", () => {
  it("Tab cycles text → project → dueDate → workingDate → url → text", () => {
    const { hook } = make();

    act(() => hook.result.current.handleTitleKeyDown(tab as any));
    expect(hook.result.current.focus).toBe("project");

    act(() => hook.result.current.handleChipKeyDown("project", tab));
    expect(hook.result.current.focus).toBe("dueDate");

    act(() => hook.result.current.handleChipKeyDown("dueDate", tab));
    expect(hook.result.current.focus).toBe("workingDate");

    act(() => hook.result.current.handleChipKeyDown("workingDate", tab));
    expect(hook.result.current.focus).toBe("url");

    act(() => hook.result.current.handleChipKeyDown("url", tab));
    expect(hook.result.current.focus).toBe("text");
  });

  it("handleProjectPick existing advances focus to next unfilled chip (dueDate)", () => {
    const { hook } = make();
    act(() =>
      hook.result.current.handleProjectPick({ kind: "existing", id: "proj-1" }),
    );
    expect(hook.result.current.focus).toBe("dueDate");
    act(() => hook.result.current.handleChipKeyDown("dueDate", tab));
    expect(hook.result.current.focus).toBe("workingDate");
  });

  it("after full chip ring completes back to title, next Tab from title visits first unfilled chip", () => {
    const { hook } = make();
    act(() =>
      hook.result.current.handleProjectPick({ kind: "existing", id: "proj-1" }),
    );
    expect(hook.result.current.focus).toBe("dueDate");
    act(() => hook.result.current.handleChipKeyDown("dueDate", tab));
    expect(hook.result.current.focus).toBe("workingDate");
    act(() => hook.result.current.handleChipKeyDown("workingDate", tab));
    expect(hook.result.current.focus).toBe("url");
    act(() => hook.result.current.handleChipKeyDown("url", tab));
    expect(hook.result.current.focus).toBe("text");
    act(() => hook.result.current.handleTitleKeyDown(tab as any));
    expect(hook.result.current.focus).toBe("project");
    act(() => hook.result.current.handleChipKeyDown("project", tab));
    expect(hook.result.current.focus).toBe("dueDate");
  });

  it("Shift+Tab cycles in reverse (text → url)", () => {
    const { hook } = make();
    act(() => hook.result.current.handleTitleKeyDown(shiftTab as any));
    expect(hook.result.current.focus).toBe("url");
  });
});

describe("useSmartInput — @x trigger detection", () => {
  it("typing @p jumps focus to project and strips trigger from title", () => {
    const { hook } = make();
    act(() =>
      hook.result.current.handleTitleChange({
        target: { value: "Buy milk @p" },
      } as any),
    );
    expect(hook.result.current.focus).toBe("project");
    expect(hook.result.current.values.title).toBe("Buy milk ");
  });

  it("typing @d jumps focus to dueDate", () => {
    const { hook } = make();
    act(() =>
      hook.result.current.handleTitleChange({
        target: { value: "Task @d" },
      } as any),
    );
    expect(hook.result.current.focus).toBe("dueDate");
    expect(hook.result.current.values.title).toBe("Task ");
  });

  it("typing @w jumps focus to workingDate", () => {
    const { hook } = make();
    act(() =>
      hook.result.current.handleTitleChange({
        target: { value: "Task @w" },
      } as any),
    );
    expect(hook.result.current.focus).toBe("workingDate");
  });

  it("typing @u jumps focus to url", () => {
    const { hook } = make();
    act(() =>
      hook.result.current.handleTitleChange({
        target: { value: "Task @u" },
      } as any),
    );
    expect(hook.result.current.focus).toBe("url");
    expect(hook.result.current.values.title).toBe("Task ");
  });

  it("normal text change updates title without changing focus", () => {
    const { hook } = make();
    act(() =>
      hook.result.current.handleTitleChange({
        target: { value: "Hello" },
      } as any),
    );
    expect(hook.result.current.values.title).toBe("Hello");
    expect(hook.result.current.focus).toBe("text");
  });
});

describe("useSmartInput — chip interaction", () => {
  it("handleChipClick focuses the chip", () => {
    const { hook } = make();
    act(() => hook.result.current.handleChipClick("dueDate"));
    expect(hook.result.current.focus).toBe("dueDate");
  });

  it("handleProjectPick existing sets value and advances focus to next unfilled chip", () => {
    const { hook } = make();
    act(() => hook.result.current.handleChipClick("project"));
    act(() =>
      hook.result.current.handleProjectPick({ kind: "existing", id: "proj-123" }),
    );
    expect(hook.result.current.values.projectId).toBe("proj-123");
    expect(hook.result.current.focus).toBe("dueDate");
  });

  it("Escape on chip returns focus to text without clearing value", () => {
    const { hook } = make();
    act(() =>
      hook.result.current.handleProjectPick({ kind: "existing", id: "proj-123" }),
    );
    act(() => hook.result.current.handleChipClick("project"));
    act(() => hook.result.current.handleChipKeyDown("project", esc));
    expect(hook.result.current.focus).toBe("text");
    expect(hook.result.current.values.projectId).toBe("proj-123");
  });
});

describe("useSmartInput — save", () => {
  it("⌘+Enter calls onTaskReady with trimmed values and resets", () => {
    const { hook, onTaskReady } = make();
    act(() =>
      hook.result.current.handleTitleChange({
        target: { value: "  My task  " },
      } as any),
    );
    act(() =>
      hook.result.current.handleProjectPick({ kind: "existing", id: "proj-abc" }),
    );
    act(() => hook.result.current.handleTitleKeyDown(cmdEnter));

    expect(onTaskReady).toHaveBeenCalledWith({
      title: "My task",
      projectId: "proj-abc",
      dueDate: null,
      workingDate: null,
      url: null,
    });
    expect(hook.result.current.values.title).toBe("");
    expect(hook.result.current.values.projectId).toBeNull();
    expect(hook.result.current.focus).toBe("text");
  });

  it("⌘+Enter does nothing when title is empty", () => {
    const { hook, onTaskReady } = make();
    act(() => hook.result.current.handleTitleKeyDown(cmdEnter));
    expect(onTaskReady).not.toHaveBeenCalled();
  });

  it("⌘+Enter also works from a chip via handleChipKeyDown", () => {
    const { hook, onTaskReady } = make();
    act(() =>
      hook.result.current.handleTitleChange({
        target: { value: "My task" },
      } as any),
    );
    act(() =>
      hook.result.current.handleChipKeyDown(
        "project",
        cmdEnter as unknown as React.KeyboardEvent,
      ),
    );
    expect(onTaskReady).toHaveBeenCalledWith({
      title: "My task",
      projectId: null,
      dueDate: null,
      workingDate: null,
      url: null,
    });
  });

  it("⌘+Enter saves without a project when none selected", () => {
    const { hook, onTaskReady } = make();
    act(() =>
      hook.result.current.handleTitleChange({
        target: { value: "Inbox only" },
      } as any),
    );
    act(() => hook.result.current.handleTitleKeyDown(cmdEnter));
    expect(onTaskReady).toHaveBeenCalledWith({
      title: "Inbox only",
      projectId: null,
      dueDate: null,
      workingDate: null,
      url: null,
    });
  });

  it("⌘+Enter from project chip with unmatched filter includes newProjectName", () => {
    const { hook, onTaskReady } = make();
    act(() =>
      hook.result.current.handleTitleChange({
        target: { value: "Task title" },
      } as any),
    );
    act(() => hook.result.current.handleChipClick("project"));
    act(() => hook.result.current.setChipQuery("BrandNewThing"));
    act(() =>
      hook.result.current.handleChipKeyDown(
        "project",
        cmdEnter as unknown as React.KeyboardEvent,
      ),
    );
    expect(onTaskReady).toHaveBeenCalledWith({
      title: "Task title",
      projectId: null,
      newProjectName: "BrandNewThing",
      dueDate: null,
      workingDate: null,
      url: null,
    });
  });

  it("handleProjectPick new then ⌘+Enter includes newProjectName", () => {
    const { hook, onTaskReady } = make();
    act(() =>
      hook.result.current.handleTitleChange({
        target: { value: "Do thing" },
      } as any),
    );
    act(() => hook.result.current.handleChipClick("project"));
    act(() => hook.result.current.setChipQuery("MyProj"));
    act(() =>
      hook.result.current.handleProjectPick({ kind: "new", name: "MyProj" }),
    );
    act(() =>
      hook.result.current.handleChipKeyDown(
        "dueDate",
        cmdEnter as unknown as React.KeyboardEvent,
      ),
    );
    expect(onTaskReady).toHaveBeenCalledWith({
      title: "Do thing",
      projectId: null,
      newProjectName: "MyProj",
      dueDate: null,
      workingDate: null,
      url: null,
    });
  });

  it("reset clears all values and returns focus to text", () => {
    const { hook } = make();
    act(() =>
      hook.result.current.handleTitleChange({
        target: { value: "task" },
      } as any),
    );
    act(() =>
      hook.result.current.handleProjectPick({ kind: "existing", id: "proj-1" }),
    );
    act(() => hook.result.current.reset());
    expect(hook.result.current.values.title).toBe("");
    expect(hook.result.current.values.projectId).toBeNull();
    expect(hook.result.current.focus).toBe("text");
  });
});
