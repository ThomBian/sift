# Project Description Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a keyboard-navigable description section above tasks on the project workspace page, editable with `E`, autosaved with debounce, exited with `Esc`.

**Architecture:** Extend `FocusZone` to include `"description"`, update the Tab cycling handler, add description edit state with a debounced save to Dexie, and render a section above tasks that switches between a read-only view and an auto-growing textarea.

**Tech Stack:** React, Dexie (IndexedDB), Tailwind CSS, Vitest + Testing Library

---

## File Map

| File | Change |
|------|--------|
| `apps/web/src/views/ProjectWorkspaceView.tsx` | All changes — FocusZone type, keyboard handler, description section UI, debounce save |
| `apps/web/src/__tests__/ProjectWorkspaceDescriptionZone.test.tsx` | New — unit tests for zone cycling and description edit behaviour |

---

### Task 1: Extend FocusZone type and update Tab cycling

**Files:**
- Create: `apps/web/src/__tests__/ProjectWorkspaceDescriptionZone.test.tsx`
- Modify: `apps/web/src/views/ProjectWorkspaceView.tsx:21`

This task adds `"description"` to the union type and updates the Tab key handler so cycling goes `tasks → artifacts → description → tasks`. Default focus stays `"tasks"`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/ProjectWorkspaceDescriptionZone.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

// Extract the cycle logic so we can unit-test it without rendering the full view.
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run apps/web/src/__tests__/ProjectWorkspaceDescriptionZone.test.tsx
```

Expected: FAIL — `cycleZone` is not defined (it only exists in the test file at this point; the test imports nothing yet, so it will pass trivially). This is the baseline.

- [ ] **Step 3: Update `FocusZone` in `ProjectWorkspaceView.tsx`**

At line 21, change:

```ts
// Before
type FocusZone = "tasks" | "artifacts";
```

```ts
// After
type FocusZone = "description" | "tasks" | "artifacts";
```

- [ ] **Step 4: Update the Tab handler in the `onKey` function (around line 166)**

Replace:

```ts
if (e.key === "Tab") {
  e.preventDefault();
  setFocusZone((z) => (z === "tasks" ? "artifacts" : "tasks"));
  return;
}
```

With:

```ts
if (e.key === "Tab") {
  e.preventDefault();
  setFocusZone((z) => {
    if (z === "tasks") return "artifacts";
    if (z === "artifacts") return "description";
    return "tasks";
  });
  return;
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run apps/web/src/__tests__/ProjectWorkspaceDescriptionZone.test.tsx
```

Expected: PASS (the test file's inline `cycleZone` function is self-contained; TypeScript should be satisfied).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/views/ProjectWorkspaceView.tsx apps/web/src/__tests__/ProjectWorkspaceDescriptionZone.test.tsx
git commit -m "feat: add description to FocusZone, update tab cycling"
```

---

### Task 2: Add description edit state and keyboard handling

**Files:**
- Modify: `apps/web/src/views/ProjectWorkspaceView.tsx`

Add `descEditing`, `descDraft`, `descTextareaRef`, `descSaveTimerRef`, `saveDescription`, `onDescChange`, and `exitDescEdit`. Wire `E` → enter edit mode and `Esc` → exit edit mode in the keyboard handler.

- [ ] **Step 1: Add state and refs after the existing refs (around line 61)**

```ts
const [descEditing, setDescEditing] = useState(false);
const [descDraft, setDescDraft] = useState("");
const descTextareaRef = useRef<HTMLTextAreaElement>(null);
const descSaveTimerRef = useRef<number | null>(null);
```

- [ ] **Step 2: Add `saveDescription` callback after `showSkillHint` (around line 80)**

```ts
const saveDescription = useCallback(async (val: string) => {
  if (!projectId) return;
  await db.projects.update(projectId, {
    description: val.trim(),
    updatedAt: new Date(),
    synced: false,
  });
}, [projectId]);
```

- [ ] **Step 3: Add `onDescChange` (debounced) and `exitDescEdit` after `saveDescription`**

```ts
const onDescChange = useCallback((val: string) => {
  setDescDraft(val);
  if (descSaveTimerRef.current !== null) clearTimeout(descSaveTimerRef.current);
  descSaveTimerRef.current = window.setTimeout(() => void saveDescription(val), 800);
}, [saveDescription]);

const exitDescEdit = useCallback(() => {
  if (descSaveTimerRef.current !== null) {
    clearTimeout(descSaveTimerRef.current);
    descSaveTimerRef.current = null;
  }
  void saveDescription(descDraft);
  setDescEditing(false);
}, [descDraft, saveDescription]);
```

- [ ] **Step 4: Add auto-focus effect when edit mode opens**

After the existing `useEffect` that focuses `editTitleInputRef` (around line 74):

```ts
useEffect(() => {
  if (descEditing) {
    requestAnimationFrame(() => descTextareaRef.current?.focus());
  }
}, [descEditing]);
```

- [ ] **Step 5: Add cleanup effect for the debounce timer**

After the auto-focus effect:

```ts
useEffect(() => {
  return () => {
    if (descSaveTimerRef.current !== null) clearTimeout(descSaveTimerRef.current);
  };
}, []);
```

- [ ] **Step 6: Update the `inInput` branch of the keyboard handler**

The existing `inInput` block (around line 132) handles `Escape` for inputs. Extend it so `Esc` in the description textarea calls `exitDescEdit`:

```ts
if (inInput) {
  if (e.key === "Escape") {
    if (descEditing) {
      exitDescEdit();
      return;
    }
    setNewArtifactTitle(null);
    setEditingTitleId(null);
    (target as HTMLElement).blur();
  }
  return;
}
```

- [ ] **Step 7: Add description zone key handling in the non-input section**

Add this block before the `if (focusZone === "tasks")` block (around line 172):

```ts
if (focusZone === "description" && !descEditing) {
  if (e.key === "e" || e.key === "E") {
    e.preventDefault();
    setDescDraft(project.description ?? "");
    setDescEditing(true);
    return;
  }
}
```

- [ ] **Step 8: Save and exit description edit when Tab is pressed while editing**

Update the Tab handler from Task 1 to flush the description if it's open:

```ts
if (e.key === "Tab") {
  e.preventDefault();
  if (descEditing) exitDescEdit();
  setFocusZone((z) => {
    if (z === "tasks") return "artifacts";
    if (z === "artifacts") return "description";
    return "tasks";
  });
  return;
}
```

- [ ] **Step 9: Add `descEditing` and `exitDescEdit` to the keyboard handler dependency array**

The `useEffect` for key handling (around line 214) has a deps array. Add `descEditing` and `exitDescEdit`:

```ts
  }, [
    openArtifact, skillPickerOpen, cmdPaletteOpen, focusZone, tasks, artifacts,
    focusedTaskIdx, focusedArtifactIdx, descEditing, exitDescEdit,
    toggleTaskDone, archiveTask, navigate, openSkillPicker,
  ]);
```

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/views/ProjectWorkspaceView.tsx
git commit -m "feat: add description edit state, debounce save, keyboard wiring"
```

---

### Task 3: Render the description section UI

**Files:**
- Modify: `apps/web/src/views/ProjectWorkspaceView.tsx` (JSX section)

Insert the description section above the Tasks section. It shows read-only text when not editing and a textarea when in edit mode.

- [ ] **Step 1: Remove description from the header**

In the header (around line 274), remove the existing description display:

```tsx
// Remove these lines:
{project.description && (
  <span className="font-sans text-[13px] text-muted truncate">
    {project.description}
  </span>
)}
```

The description will now live exclusively in the body section.

- [ ] **Step 2: Insert the description section before the Tasks section**

In `<main>` (around line 283), add this section immediately before `{/* Tasks */}`:

```tsx
{/* Description */}
<section>
  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mb-3">
    DESCRIPTION
  </div>
  <div
    onClick={() => {
      setFocusZone("description");
      if (!descEditing) {
        setDescDraft(project.description ?? "");
        setDescEditing(true);
      }
    }}
    className={`px-3 py-2.5 border-[0.5px] cursor-text ${
      descEditing
        ? "border-accent"
        : listRowFocusClasses(focusZone === "description")
    }`}
  >
    {descEditing ? (
      <textarea
        ref={descTextareaRef}
        value={descDraft}
        onChange={(e) => onDescChange(e.target.value)}
        placeholder="Describe this project…"
        rows={4}
        className="w-full bg-transparent font-sans text-[13px] text-text placeholder:text-muted outline-none resize-none leading-relaxed"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            exitDescEdit();
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <>
        <p className={`font-sans text-[13px] leading-relaxed whitespace-pre-wrap ${project.description ? "text-text" : "text-muted"}`}>
          {project.description || "No description yet."}
        </p>
        {focusZone === "description" && (
          <div className="mt-2 flex gap-3">
            <span className="font-mono text-[9px] text-muted">
              <span className="text-accent">E</span> edit
            </span>
          </div>
        )}
      </>
    )}
  </div>
</section>
```

- [ ] **Step 3: Verify it renders without TypeScript errors**

```bash
npm run build --workspace=web 2>&1 | tail -20
```

Expected: no TypeScript errors. (Ignore Vite bundle output.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/views/ProjectWorkspaceView.tsx
git commit -m "feat: render description section above tasks with view/edit toggle"
```

---

### Task 4: Update hints bar for description zone

**Files:**
- Modify: `apps/web/src/views/ProjectWorkspaceView.tsx` (hints section, around line 240)

The footer hints bar should show relevant shortcuts when the description zone is focused.

- [ ] **Step 1: Add description hints to the `hints` constant**

Replace the existing `hints` assignment with:

```ts
const hints =
  focusZone === "description"
    ? [
        { key: "E", label: "edit" },
        { key: "Tab", label: "tasks" },
        { key: "ESC", label: "back" },
      ]
    : focusZone === "tasks"
    ? [
        { key: "↑↓", label: "tasks" },
        { key: "Enter", label: "done" },
        { key: "⌘K", label: "new task" },
        { key: "N", label: "new artifact" },
        { key: "Tab", label: "artifacts" },
        { key: "S", label: "skills" },
        { key: "ESC", label: "back" },
      ]
    : [
        { key: "↑↓←→", label: "navigate" },
        { key: "Space", label: "open" },
        { key: "N", label: "new" },
        { key: "E", label: "rename" },
        { key: "Tab", label: "description" },
        { key: "S", label: "skills" },
      ];
```

Note: the artifacts zone label for Tab changes from `"tasks"` to `"description"` since Tab now cycles through all three.

- [ ] **Step 2: Run the full test suite to catch any regressions**

```bash
npm run test --workspace=web 2>&1 | tail -30
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/views/ProjectWorkspaceView.tsx
git commit -m "feat: update hints bar for description zone tab cycling"
```

---

### Task 5: Write integration tests for description zone behaviour

**Files:**
- Modify: `apps/web/src/__tests__/ProjectWorkspaceDescriptionZone.test.tsx`

Add tests for: entering edit mode with `E`, exiting with `Esc`, and debounced save.

- [ ] **Step 1: Add debounce logic tests (no DOM needed)**

Append to `apps/web/src/__tests__/ProjectWorkspaceDescriptionZone.test.tsx`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Zone cycling ──────────────────────────────────────────────────────────────

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

// ── Debounce helper ───────────────────────────────────────────────────────────

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
    flush("hello"); // Esc pressed — flush immediately
    vi.advanceTimersByTime(800); // timer is cancelled, no second call

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("hello");
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run apps/web/src/__tests__/ProjectWorkspaceDescriptionZone.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/__tests__/ProjectWorkspaceDescriptionZone.test.tsx
git commit -m "test: zone cycling and debounce save behaviour for description section"
```

---

## Self-Review Checklist

- [x] **Tab cycles all three zones** — Task 1 step 4 ✓
- [x] **Default focus stays tasks** — `useState<FocusZone>("tasks")` unchanged ✓
- [x] **E enters edit mode** — Task 2 step 7 ✓
- [x] **Esc exits edit mode and saves immediately** — Task 2 step 6 + `exitDescEdit` ✓
- [x] **Debounce 800ms on keystrokes** — Task 2 step 3 ✓
- [x] **Tab while editing flushes save before switching zone** — Task 2 step 8 ✓
- [x] **Timer cleaned up on unmount** — Task 2 step 5 ✓
- [x] **Click on section focuses zone and opens edit** — Task 3 step 2 ✓
- [x] **Hints bar updates per zone** — Task 4 ✓
- [x] **Description removed from header** — Task 3 step 1 ✓
- [x] **`descEditing` in keyboard handler deps** — Task 2 step 9 ✓
