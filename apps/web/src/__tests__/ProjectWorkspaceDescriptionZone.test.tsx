// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type FocusZone = "description" | "tasks" | "artifacts";

function cycleZone(current: FocusZone): FocusZone {
  if (current === "tasks") return "artifacts";
  if (current === "artifacts") return "description";
  return "tasks";
}

describe("cycleZone", () => {
  it("tasks → artifacts", () => expect(cycleZone("tasks")).toBe("artifacts"));
  it("artifacts → description", () => expect(cycleZone("artifacts")).toBe("description"));
  it("description → tasks", () => expect(cycleZone("description")).toBe("tasks"));
});

describe("debounce save timing", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not fire immediately on change", () => {
    const save = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function onChange(val: string) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => save(val), 800);
    }

    onChange("hello");
    expect(save).not.toHaveBeenCalled();
  });

  it("fires after 800ms", () => {
    const save = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function onChange(val: string) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => save(val), 800);
    }

    onChange("hello");
    vi.advanceTimersByTime(800);
    expect(save).toHaveBeenCalledWith("hello");
  });

  it("resets the timer on rapid changes — only fires once", () => {
    const save = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function onChange(val: string) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => save(val), 800);
    }

    onChange("a");
    vi.advanceTimersByTime(400);
    onChange("ab");
    vi.advanceTimersByTime(400);
    onChange("abc");
    vi.advanceTimersByTime(800);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("abc");
  });

  it("immediate flush cancels pending debounce and calls save once", () => {
    const save = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function onChange(val: string) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => save(val), 800);
    }

    function flush(val: string) {
      if (timer !== null) { clearTimeout(timer); timer = null; }
      save(val);
    }

    onChange("hello");
    flush("hello");
    vi.advanceTimersByTime(800);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("hello");
  });
});
