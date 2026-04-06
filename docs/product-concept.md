# Product Concept: Browser-Tasker (Universal Chromium Edition)

**A High-Performance, Keyboard-First, Local-First Todo System for Chromium Browsers.**

## 1. Vision & Core Philosophy

- **Zero Inbox:** The "Inbox" is a temporary triage station. Tasks are moved to "Today" or "Projects."
- **Keyboard-Native:** 100% operable without a mouse. Inspired by Linear’s speed and density.
- **Universal Capture:** Capture tasks from *anywhere* in the browser via a Chromium Extension.
- **Local-First:** Sub-50ms latency using IndexedDB. No loading spinners or cloud-sync lag.

---

## 2. System Architecture: "The Courier Model"

1. **The Master Web App (`app.local`):** The primary dashboard for viewing "Today," "Inbox," and "Projects." It manages the primary database (**Dexie.js**).
2. **The Chromium Extension:** A Manifest V3 extension that injects a capture overlay into any website. It stores tasks temporarily in `chrome.storage.local` and "syncs" them to the Web App via a message bridge.

---

## 3. Technical Specifications

### A. Data Schema (TypeScript)

```typescript
interface Task {
  id: string;
  title: string;
  project: string;         // Default: "General"
  status: 'inbox' | 'todo' | 'done' | 'archived';
  workingDate: Date | null; // The "Planned" date (for Today view)
  dueDate: Date | null;    // The "Deadline" date (for Late alerts)
  createdAt: Date;
  completedAt: Date | null;
  sourceUrl?: string;      // The URL of the tab where the task was captured
}
```

### B. The Smart Input Engine (Interactive Typing)

Both the Web App and the Extension must use a shared "Smart Input" component.

- **Trigger `@p`**: Opens a dropdown to select or create a Project.
- **Trigger `@w`**: Sets the **Working Date**. (Accepts: "today", "tomorrow", "monday").
- **Trigger `@d`**: Sets the **Due Date**.
- **Interactive UI**: As the user types `@`, a menu appears to filter options. Pressing `Tab` or `Enter` on an option "commits" it to the task metadata.

---

## 4. Key Functional Features

### Universal Capture (Extension)

- **Manifest V3 Commands:** Register `Alt + Shift + I` (or `Cmd + I` where available) as a global command.
- **Double-Shift Listener:** A content script monitors `keyup` events. If `Shift` is pressed twice within 300ms, it triggers the overlay.
- **UI:** A floating, centered "Linear-style" bar. It saves to `chrome.storage.local` with a `synced: false` flag.
- **Auto-Sync:** When the Web App is open, it uses `chrome.runtime.sendMessage` to pull unsynced tasks from the extension.

### Dashboard & Triage (Web App)

- **Active Focus:** One task is always highlighted (2px left-border primary color).
- **Views:**
  - **Inbox:** All tasks where `workingDate == null`.
  - **Today:** All tasks where `workingDate <= Today`.
  - **Projects:** Grouped list with progress bars `(Done / Total)`.
- **Late Status:** If `dueDate < Today` and task is not done, the date text turns "Linear Red" (#ff4d4d).

---

## 5. Keyboard Shortcut Map


| Key                        | Context      | Action                         |
| -------------------------- | ------------ | ------------------------------ |
| `Alt/Cmd + I` / `Shift x2` | Anywhere     | Open Universal Capture Overlay |
| `j` / `k`                  | List View    | Move focus down / up           |
| `w`                        | Task Focused | Open `@w` to set Working Date  |
| `p`                        | Task Focused | Open `@p` to assign Project    |
| `d`                        | Task Focused | Open `@d` to set Due Date      |
| `Enter`                    | Task Focused | Toggle Done / Confirm Input    |
| `Backspace`                | Task Focused | Delete/Archive Task            |
| `Esc`                      | Any Modal    | Close / Cancel                 |


---

## 6. Design & UX (Linear-Inspired)

- **Colors:** Deep Black (#080808), Surface (#121212), Border (#222222), Accent (#5E6AD2).
- **Density:** High-density rows (approx 36px height).
- **Animations:** Subtle CSS transitions (slide-out) when tasks move from Inbox to Today.

---

## 7. Canonical implementation (repo)

The monorepo implements the same product with a **normalized** data model in `@sift/shared`: tasks reference `projectId` (FK), and each project belongs to a `Space` (name + color dot). Default seed data creates a **Personal** space and **General** project. See [docs/superpowers/specs/2026-04-04-speedy-tasks-design.md](superpowers/specs/2026-04-04-speedy-tasks-design.md) for the full schema and [docs/superpowers/plans/2026-04-04-plan-1-foundation.md](superpowers/plans/2026-04-04-plan-1-foundation.md) for what shipped in Plan 1.

---

## 8. Instructions for the AI Agent

1. **Prioritize Speed:** Use optimistic UI updates. The user should never wait for a database confirmation.
2. **Shared Components:** Ensure the "Smart Input" logic is reusable between the extension (content script) and the main React app.
3. **Conflict Prevention:** In the extension, use a **Shadow DOM** for the capture overlay to ensure the host website's CSS does not break the task bar's styling.
4. **Local First:** Ensure Dexie.js is correctly configured for IndexedDB persistence.

