import { describe, it, expect } from "vitest";
import { listRowFocusClasses } from "../lib/listRowFocus";

describe("listRowFocusClasses", () => {
  it("returns laser focus treatment when focused", () => {
    const classes = listRowFocusClasses(true);
    expect(classes).toMatch(/bg-accent\/5/);
    expect(classes).toMatch(/laser-focus/);
    expect(classes).not.toMatch(/hover:bg-surface-2/);
  });

  it("returns hover treatment when not focused", () => {
    const classes = listRowFocusClasses(false);
    expect(classes).toMatch(/hover:bg-surface-2/);
    expect(classes).not.toMatch(/laser-focus/);
    expect(classes).not.toMatch(/bg-accent\/5/);
  });
});
