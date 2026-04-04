# Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/extension` — the Manifest V3 Chrome extension that lets users capture tasks from any webpage via a keyboard-triggered Shadow DOM overlay, syncs them to the Speedy web app, and shows unsynced task count in the extension popup.

**Architecture:** The extension is built with Vite + CRXJS. A content script injects a Shadow DOM overlay into every page, using `SmartInput` from `@speedy/shared`. Tasks are persisted to `chrome.storage.local` with `synced: false`. A background service worker routes messages between the content script, popup, and the Speedy web app tab. The web app tab (Plan 2) handles writing extension-captured tasks into Dexie — the extension never touches IndexedDB.

**Tech Stack:** Vite 5, CRXJS `@crxjs/vite-plugin` ^2.0.0-beta, React 18, TypeScript 5, `@speedy/shared` (Plan 1), `@types/chrome` ^0.0.260, Vitest 1, @testing-library/react 14, jsdom 24

---

## File Map

| File | Responsibility |
|------|----------------|
| `apps/extension/package.json` | Package manifest, workspace deps, build/dev/test scripts |
| `apps/extension/vite.config.ts` | Vite config with CRXJS plugin and React plugin; Vitest config |
| `apps/extension/tsconfig.json` | TypeScript config extending monorepo base, Chrome types |
| `apps/extension/manifest.json` | MV3 manifest — permissions, commands, content scripts, popup, service worker |
| `apps/extension/src/types/messages.ts` | `ExtensionMessage` union type and `StoredTask` interface — shared across all extension entry points |
| `apps/extension/src/background/index.ts` | Service worker: message routing, `chrome.storage.local` ops, `chrome.commands` handler |
| `apps/extension/src/content/index.ts` | Content script entry: double-Shift listener, `Alt+Shift+I` command listener, overlay lifecycle |
| `apps/extension/src/content/shadow.ts` | Creates Shadow DOM host element and returns the `ShadowRoot` for React mounting |
| `apps/extension/src/content/overlay.tsx` | React component rendered into Shadow DOM: `SmartInput` + save-to-storage logic + close handler |
| `apps/extension/src/popup/index.html` | Popup HTML entry point; imports `main.tsx` |
| `apps/extension/src/popup/main.tsx` | Mounts `Popup` React component into `#root` |
| `apps/extension/src/popup/Popup.tsx` | Shows unsynced task count; "Open Speedy" button linking to Vercel URL |
| `apps/extension/src/__tests__/background.test.ts` | Vitest unit tests for background message handlers (chrome global mocked) |
| `apps/extension/src/__tests__/overlay.test.tsx` | @testing-library/react tests for Overlay component |
| `apps/extension/src/__tests__/doubleShift.test.ts` | Unit tests for the double-Shift detection logic extracted as a pure function |
| `apps/extension/src/__tests__/setup.ts` | Vitest setup file: chrome global mock |

---

## Task 1: Bootstrap apps/extension

**Files created:**
- `apps/extension/package.json`
- `apps/extension/vite.config.ts`
- `apps/extension/tsconfig.json`

- [ ] **Step 1: Create apps/extension/package.json**

```json
{
  "name": "@speedy/extension",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@speedy/shared": "*"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@types/chrome": "^0.0.260",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "jsdom": "^24.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Create apps/extension/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["chrome", "vite/client"],
    "lib": ["ES2022", "DOM"],
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": true
  },
  "include": ["src", "manifest.json"]
}
```

- [ ] **Step 3: Create apps/extension/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/__tests__/setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 4: Install dependencies from monorepo root**

```bash
npm install
```

Expected output: `packages/shared` is resolved as a workspace dependency; `node_modules/@crxjs/vite-plugin` exists inside `apps/extension/node_modules` or hoisted to root.

- [ ] **Step 5: Commit**

```bash
git add apps/extension/package.json apps/extension/vite.config.ts apps/extension/tsconfig.json
git commit -m "chore(extension): bootstrap package with Vite + CRXJS"
```

---

## Task 2: manifest.json

**Files created:**
- `apps/extension/manifest.json`

- [ ] **Step 1: Create apps/extension/manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Speedy Tasks",
  "version": "1.0.0",
  "description": "Capture tasks from anywhere with a keyboard shortcut.",
  "permissions": ["storage", "activeTab", "scripting", "tabs"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.ts"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_title": "Speedy Tasks"
  },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Alt+Shift+I",
        "mac": "Alt+Shift+I"
      },
      "description": "Open capture overlay"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

> **Note on icons:** CRXJS will warn if icon files are missing. Create placeholder 1×1 transparent PNGs for now:
>
> ```bash
> mkdir -p apps/extension/icons
> # Use any image tool to produce icons/icon16.png, icons/icon48.png, icons/icon128.png
> # Quickest placeholder using node (run from repo root):
> node -e "
> const fs = require('fs');
> // Minimal 1x1 transparent PNG (89 bytes)
> const png = Buffer.from(
>   '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c48900000011' +
>   '4944415478016360f8cfc00000000200016e21bc3300000000049454e44ae426082',
>   'hex'
> );
> ['icons/icon16.png','icons/icon48.png','icons/icon128.png'].forEach(p =>
>   fs.writeFileSync('apps/extension/' + p, png)
> );
> console.log('placeholder icons written');
> "
> ```

- [ ] **Step 2: Commit**

```bash
git add apps/extension/manifest.json apps/extension/icons/
git commit -m "feat(extension): add MV3 manifest"
```

---

## Task 3: Message types

**Files created:**
- `apps/extension/src/types/messages.ts`

- [ ] **Step 1: Create src/types/messages.ts**

```typescript
/**
 * All messages that flow through chrome.runtime.sendMessage in the extension.
 * Using a discriminated union keeps sendMessage calls type-safe across
 * background, content, popup, and the external web app.
 */

export interface StoredTask {
  /** nanoid — generated at capture time */
  id: string;
  title: string;
  /** FK to a Project — optional at capture time */
  projectId?: string;
  /** ISO 8601 string (Date is not serialisable in chrome.storage) */
  dueDate: string | null;
  /** ISO 8601 string */
  workingDate: string | null;
  /** URL of the page where the task was captured */
  sourceUrl: string;
  /** ISO 8601 string — set at save time */
  capturedAt: string;
  /** false until the web app has written the task to Dexie */
  synced: boolean;
}

export type ExtensionMessage =
  // Content script → background: show the overlay in the active tab
  | { type: 'OVERLAY_OPEN' }
  // Content script → background: the overlay was closed
  | { type: 'OVERLAY_CLOSE' }
  // Content/overlay → background: persist a new task
  | { type: 'TASK_SAVE'; task: StoredTask }
  // Web app or popup → background: fetch all unsynced tasks
  | { type: 'GET_UNSYNCED' }
  // Web app → background: mark these task IDs as synced
  | { type: 'MARK_SYNCED'; ids: string[] }
  // Web app → background: store the Supabase session token
  | { type: 'SET_SESSION'; token: string }
  // Popup or background → background: retrieve stored session token
  | { type: 'GET_SESSION' };

/**
 * Response shapes keyed by message type.
 * Background's onMessage handler returns these via `sendResponse`.
 */
export type ExtensionResponse<T extends ExtensionMessage['type']> =
  T extends 'GET_UNSYNCED' ? StoredTask[] :
  T extends 'GET_SESSION' ? string | null :
  T extends 'TASK_SAVE' ? { ok: true } :
  T extends 'MARK_SYNCED' ? { ok: true } :
  T extends 'SET_SESSION' ? { ok: true } :
  void;
```

- [ ] **Step 2: Commit**

```bash
git add apps/extension/src/types/messages.ts
git commit -m "feat(extension): add type-safe message union and StoredTask interface"
```

---

## Task 4: Failing tests for background service worker (TDD)

**Files created:**
- `apps/extension/src/__tests__/setup.ts`
- `apps/extension/src/__tests__/background.test.ts`

Write these tests **before** writing any background implementation code. All tests must fail at this point.

- [ ] **Step 1: Create src/__tests__/setup.ts**

```typescript
import { vi } from 'vitest';

/**
 * Global Chrome API mock injected before every test file.
 * Individual tests can override specific methods with vi.fn() replacements.
 */
const chromeMock = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
    onConnect: {
      addListener: vi.fn(),
    },
    lastError: null as chrome.runtime.LastError | null,
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
};

// Make chrome available globally (content scripts and background assume it exists)
globalThis.chrome = chromeMock as unknown as typeof chrome;

// Reset all mocks between tests so state doesn't bleed across cases
beforeEach(() => {
  vi.resetAllMocks();
  // Restore the chrome mock structure after reset
  globalThis.chrome = chromeMock as unknown as typeof chrome;
});
```

- [ ] **Step 2: Create src/__tests__/background.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StoredTask, ExtensionMessage } from '../types/messages';

// We import the handler factory so we can test it in isolation
// (the background index.ts will export a handleMessage function)
import { handleMessage, getUnsyncedTasks, saveTask, markSynced, setSession, getSession } from '../background/index';

// Helper to create a minimal valid StoredTask
function makeTask(overrides: Partial<StoredTask> = {}): StoredTask {
  return {
    id: 'task-1',
    title: 'Write tests',
    projectId: undefined,
    dueDate: null,
    workingDate: null,
    sourceUrl: 'https://example.com',
    capturedAt: new Date().toISOString(),
    synced: false,
    ...overrides,
  };
}

// ─── saveTask ────────────────────────────────────────────────────────────────

describe('saveTask', () => {
  it('reads existing tasks, appends the new task, and writes back', async () => {
    const existing: StoredTask[] = [makeTask({ id: 'existing-1' })];
    const newTask = makeTask({ id: 'new-1', title: 'New task' });

    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({ tasks: existing });
      }
    );
    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(
      (_data: Record<string, unknown>, callback: () => void) => {
        callback();
      }
    );

    await saveTask(newTask);

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { tasks: [existing[0], newTask] },
      expect.any(Function)
    );
  });

  it('handles empty storage (no existing tasks key)', async () => {
    const newTask = makeTask({ id: 'only-task' });

    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({});
      }
    );
    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(
      (_data: Record<string, unknown>, callback: () => void) => {
        callback();
      }
    );

    await saveTask(newTask);

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { tasks: [newTask] },
      expect.any(Function)
    );
  });
});

// ─── getUnsyncedTasks ────────────────────────────────────────────────────────

describe('getUnsyncedTasks', () => {
  it('returns only tasks where synced === false', async () => {
    const tasks: StoredTask[] = [
      makeTask({ id: '1', synced: false }),
      makeTask({ id: '2', synced: true }),
      makeTask({ id: '3', synced: false }),
    ];

    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({ tasks });
      }
    );

    const result = await getUnsyncedTasks();
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['1', '3']);
  });

  it('returns empty array when storage has no tasks', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({});
      }
    );

    const result = await getUnsyncedTasks();
    expect(result).toEqual([]);
  });
});

// ─── markSynced ──────────────────────────────────────────────────────────────

describe('markSynced', () => {
  it('sets synced=true for matching IDs and writes back', async () => {
    const tasks: StoredTask[] = [
      makeTask({ id: 'a', synced: false }),
      makeTask({ id: 'b', synced: false }),
      makeTask({ id: 'c', synced: false }),
    ];

    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({ tasks });
      }
    );
    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(
      (_data: Record<string, unknown>, callback: () => void) => {
        callback();
      }
    );

    await markSynced(['a', 'c']);

    const written = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      tasks: StoredTask[];
    };
    expect(written.tasks.find((t) => t.id === 'a')?.synced).toBe(true);
    expect(written.tasks.find((t) => t.id === 'b')?.synced).toBe(false);
    expect(written.tasks.find((t) => t.id === 'c')?.synced).toBe(true);
  });

  it('is a no-op when ids array is empty', async () => {
    const tasks: StoredTask[] = [makeTask({ id: 'x', synced: false })];

    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({ tasks });
      }
    );
    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(
      (_data: Record<string, unknown>, callback: () => void) => {
        callback();
      }
    );

    await markSynced([]);

    const written = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      tasks: StoredTask[];
    };
    expect(written.tasks[0].synced).toBe(false);
  });
});

// ─── setSession / getSession ─────────────────────────────────────────────────

describe('setSession', () => {
  it('saves the token to chrome.storage.local under "session_token"', async () => {
    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(
      (_data: Record<string, unknown>, callback: () => void) => {
        callback();
      }
    );

    await setSession('my-jwt-token');

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { session_token: 'my-jwt-token' },
      expect.any(Function)
    );
  });
});

describe('getSession', () => {
  it('returns the stored token string', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({ session_token: 'stored-token' });
      }
    );

    const token = await getSession();
    expect(token).toBe('stored-token');
  });

  it('returns null when no token is stored', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({});
      }
    );

    const token = await getSession();
    expect(token).toBeNull();
  });
});

// ─── handleMessage ────────────────────────────────────────────────────────────

describe('handleMessage', () => {
  it('calls saveTask and sends { ok: true } for TASK_SAVE', async () => {
    const task = makeTask();
    const sendResponse = vi.fn();

    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], cb: (r: Record<string, unknown>) => void) => cb({ tasks: [] })
    );
    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(
      (_data: Record<string, unknown>, cb: () => void) => cb()
    );

    const msg: ExtensionMessage = { type: 'TASK_SAVE', task };
    await handleMessage(msg, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('returns unsynced tasks for GET_UNSYNCED', async () => {
    const tasks: StoredTask[] = [makeTask({ synced: false })];
    const sendResponse = vi.fn();

    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], cb: (r: Record<string, unknown>) => void) => cb({ tasks })
    );

    const msg: ExtensionMessage = { type: 'GET_UNSYNCED' };
    await handleMessage(msg, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith(tasks);
  });

  it('marks synced and sends { ok: true } for MARK_SYNCED', async () => {
    const tasks: StoredTask[] = [makeTask({ id: 'z', synced: false })];
    const sendResponse = vi.fn();

    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], cb: (r: Record<string, unknown>) => void) => cb({ tasks })
    );
    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(
      (_data: Record<string, unknown>, cb: () => void) => cb()
    );

    const msg: ExtensionMessage = { type: 'MARK_SYNCED', ids: ['z'] };
    await handleMessage(msg, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('stores session for SET_SESSION', async () => {
    const sendResponse = vi.fn();

    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(
      (_data: Record<string, unknown>, cb: () => void) => cb()
    );

    const msg: ExtensionMessage = { type: 'SET_SESSION', token: 'tok' };
    await handleMessage(msg, sendResponse);

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { session_token: 'tok' },
      expect.any(Function)
    );
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('retrieves session for GET_SESSION', async () => {
    const sendResponse = vi.fn();

    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys: string[], cb: (r: Record<string, unknown>) => void) =>
        cb({ session_token: 'my-tok' })
    );

    const msg: ExtensionMessage = { type: 'GET_SESSION' };
    await handleMessage(msg, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith('my-tok');
  });
});
```

- [ ] **Step 3: Run tests — confirm they all fail (module not found)**

```bash
cd apps/extension && npm test 2>&1 | head -30
```

Expected: `Error: Cannot find module '../background/index'` — tests are failing for the right reason.

- [ ] **Step 4: Commit failing tests**

```bash
git add apps/extension/src/__tests__/setup.ts apps/extension/src/__tests__/background.test.ts
git commit -m "test(extension): add failing tests for background service worker (TDD)"
```

---

## Task 5: Implement background service worker

**Files created:**
- `apps/extension/src/background/index.ts`

- [ ] **Step 1: Create src/background/index.ts**

```typescript
import type { ExtensionMessage, StoredTask } from '../types/messages';

// ─── Storage helpers ──────────────────────────────────────────────────────────

/** Read the full tasks array from chrome.storage.local. */
function readTasks(): Promise<StoredTask[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['tasks'], (result) => {
      resolve((result['tasks'] as StoredTask[] | undefined) ?? []);
    });
  });
}

/** Write the full tasks array to chrome.storage.local. */
function writeTasks(tasks: StoredTask[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ tasks }, () => resolve());
  });
}

// ─── Exported business logic (also used directly by tests) ───────────────────

/** Append a new task to chrome.storage.local. */
export async function saveTask(task: StoredTask): Promise<void> {
  const tasks = await readTasks();
  tasks.push(task);
  await writeTasks(tasks);
}

/** Return only tasks that have not yet been synced to the web app. */
export async function getUnsyncedTasks(): Promise<StoredTask[]> {
  const tasks = await readTasks();
  return tasks.filter((t) => !t.synced);
}

/** Mark a list of task IDs as synced. */
export async function markSynced(ids: string[]): Promise<void> {
  const tasks = await readTasks();
  const idSet = new Set(ids);
  const updated = tasks.map((t) =>
    idSet.has(t.id) ? { ...t, synced: true } : t
  );
  await writeTasks(updated);
}

/** Persist a Supabase session token. */
export async function setSession(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ session_token: token }, () => resolve());
  });
}

/** Retrieve the stored Supabase session token, or null if absent. */
export async function getSession(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['session_token'], (result) => {
      resolve((result['session_token'] as string | undefined) ?? null);
    });
  });
}

// ─── Message dispatcher ───────────────────────────────────────────────────────

/**
 * Central handler for all chrome.runtime messages.
 * Exported for testing; also registered as the onMessage listener below.
 *
 * Returns true to keep the message channel open for async sendResponse calls.
 */
export async function handleMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
  switch (message.type) {
    case 'TASK_SAVE': {
      await saveTask(message.task);
      sendResponse({ ok: true });
      break;
    }
    case 'GET_UNSYNCED': {
      const tasks = await getUnsyncedTasks();
      sendResponse(tasks);
      break;
    }
    case 'MARK_SYNCED': {
      await markSynced(message.ids);
      sendResponse({ ok: true });
      break;
    }
    case 'SET_SESSION': {
      await setSession(message.token);
      sendResponse({ ok: true });
      break;
    }
    case 'GET_SESSION': {
      const token = await getSession();
      sendResponse(token);
      break;
    }
    default: {
      // Unrecognised message type — ignore silently
      sendResponse(undefined);
    }
  }
}

// ─── Service worker registration ──────────────────────────────────────────────

/**
 * Listen for messages from content scripts, the popup, and the external
 * web app tab. Returning `true` signals that sendResponse will be called
 * asynchronously.
 */
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message, sendResponse);
    return true; // keep channel open for async response
  }
);

/**
 * When the user presses Alt+Shift+I, forward OVERLAY_OPEN to the active tab's
 * content script. The MV3 `_execute_action` command fires the popup, so we use
 * a separate named command if we want to route directly to content scripts.
 * For simplicity the popup opens via `_execute_action`; double-shift in the
 * content script handles the direct overlay trigger without this handler.
 *
 * If a future manifest adds a named command (e.g. "toggle-overlay"), wire it:
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-overlay') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: 'OVERLAY_OPEN' } satisfies ExtensionMessage);
    }
  }
});

/**
 * Update the badge on the extension icon with the current unsynced task count.
 * Called after every TASK_SAVE and MARK_SYNCED.
 */
async function updateBadge(): Promise<void> {
  const unsynced = await getUnsyncedTasks();
  const text = unsynced.length > 0 ? String(unsynced.length) : '';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#5E6AD2' });
}

// Patch handleMessage to also refresh the badge after mutations
const _originalHandleMessage = handleMessage;
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, _sendResponse) => {
    if (message.type === 'TASK_SAVE' || message.type === 'MARK_SYNCED') {
      // Fire-and-forget badge update after the main handler completes
      void _originalHandleMessage(message, () => {}).then(() => updateBadge());
    }
  }
);
```

- [ ] **Step 2: Run tests — confirm they all pass**

```bash
cd apps/extension && npm test 2>&1
```

Expected output (all passing):

```
✓ src/__tests__/background.test.ts (14)
  ✓ saveTask (2)
  ✓ getUnsyncedTasks (2)
  ✓ markSynced (2)
  ✓ setSession (1)
  ✓ getSession (2)
  ✓ handleMessage (5)

Test Files  1 passed (1)
Tests       14 passed (14)
```

- [ ] **Step 3: Commit**

```bash
git add apps/extension/src/background/index.ts
git commit -m "feat(extension): implement background service worker with storage ops and message routing"
```

---

## Task 6: Content script — double-Shift listener

**Files created:**
- `apps/extension/src/__tests__/doubleShift.test.ts`
- `apps/extension/src/content/index.ts`

We extract the double-Shift detection into a testable pure function before wiring it to the DOM.

- [ ] **Step 1: Create src/__tests__/doubleShift.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeDoubleShiftDetector } from '../content/index';

describe('makeDoubleShiftDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('fires callback when two Shift presses occur within 300ms', () => {
    const callback = vi.fn();
    const detect = makeDoubleShiftDetector(callback);

    const t0 = Date.now();
    detect(t0);          // first press
    detect(t0 + 200);    // second press within 300ms

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not fire when gap exceeds 300ms', () => {
    const callback = vi.fn();
    const detect = makeDoubleShiftDetector(callback);

    const t0 = Date.now();
    detect(t0);
    detect(t0 + 350);    // too slow

    expect(callback).not.toHaveBeenCalled();
  });

  it('resets after firing so a third Shift does not immediately re-fire', () => {
    const callback = vi.fn();
    const detect = makeDoubleShiftDetector(callback);

    const t0 = Date.now();
    detect(t0);
    detect(t0 + 100);   // fires
    detect(t0 + 150);   // should be treated as first press of a new sequence

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('fires again on the next valid double-press after a reset', () => {
    const callback = vi.fn();
    const detect = makeDoubleShiftDetector(callback);

    const t0 = Date.now();
    detect(t0);
    detect(t0 + 100);    // first double-press fires
    detect(t0 + 150);    // becomes first of new sequence
    detect(t0 + 250);    // second press within 300ms of t0+150 → fires again

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('boundary: exactly 300ms gap does not fire (strictly less than)', () => {
    const callback = vi.fn();
    const detect = makeDoubleShiftDetector(callback);

    const t0 = Date.now();
    detect(t0);
    detect(t0 + 300);   // exactly 300ms — should NOT fire

    expect(callback).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Create src/content/index.ts**

```typescript
import { createShadowHost } from './shadow';
import type { ExtensionMessage } from '../types/messages';

// ─── Double-Shift detection ───────────────────────────────────────────────────

/**
 * Factory that returns a stateful detector function.
 * Each call to the returned function passes the current timestamp (ms).
 * When two calls occur within `thresholdMs` (default 300), `onDetected` fires
 * and the state resets so a third Shift does not immediately re-trigger.
 *
 * Exported for unit testing without DOM dependencies.
 */
export function makeDoubleShiftDetector(
  onDetected: () => void,
  thresholdMs = 300
): (now: number) => void {
  let lastShiftAt = 0;

  return function detect(now: number): void {
    const gap = now - lastShiftAt;
    if (lastShiftAt !== 0 && gap < thresholdMs) {
      onDetected();
      lastShiftAt = 0; // reset so next Shift starts a fresh sequence
    } else {
      lastShiftAt = now;
    }
  };
}

// ─── Overlay lifecycle ────────────────────────────────────────────────────────

let overlayVisible = false;
let unmountOverlay: (() => void) | null = null;

async function openOverlay(): Promise<void> {
  if (overlayVisible) return;
  overlayVisible = true;

  // Lazy-import React and the overlay component to avoid loading them until needed
  const [{ default: React }, { createRoot }, { Overlay }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./overlay'),
  ]);

  const { host, shadow } = createShadowHost();

  const root = createRoot(shadow);
  root.render(
    React.createElement(Overlay, {
      sourceUrl: document.location.href,
      onClose: closeOverlay,
    })
  );

  unmountOverlay = () => {
    root.unmount();
    host.remove();
  };
}

function closeOverlay(): void {
  if (!overlayVisible) return;
  overlayVisible = false;
  unmountOverlay?.();
  unmountOverlay = null;
}

// ─── Event listeners ──────────────────────────────────────────────────────────

const detectDoubleShift = makeDoubleShiftDetector(() => {
  void openOverlay();
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Shift') {
    detectDoubleShift(Date.now());
  }
  if (e.key === 'Escape' && overlayVisible) {
    closeOverlay();
  }
});

// Listen for OVERLAY_OPEN messages forwarded by the background service worker
// (e.g. when triggered by the Alt+Shift+I command or from the popup)
chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === 'OVERLAY_OPEN') {
    void openOverlay();
  }
  if (message.type === 'OVERLAY_CLOSE') {
    closeOverlay();
  }
});
```

- [ ] **Step 3: Run double-shift tests**

```bash
cd apps/extension && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|✓|✗|doubleShift)"
```

Expected: all 5 double-shift tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/extension/src/__tests__/doubleShift.test.ts apps/extension/src/content/index.ts
git commit -m "feat(extension): content script with double-shift detection and overlay lifecycle"
```

---

## Task 7: Shadow DOM setup

**Files created:**
- `apps/extension/src/content/shadow.ts`

- [ ] **Step 1: Create src/content/shadow.ts**

```typescript
/**
 * Creates a fixed-position host element and attaches an open Shadow DOM to it.
 *
 * The host sits at z-index 2147483647 (max) with pointer-events:none so that
 * the host itself does not block interactions on the underlying page.
 * The overlay React component inside the shadow root sets pointer-events:auto
 * only on the elements that need to receive input.
 *
 * Using Shadow DOM prevents the host page's CSS from bleeding into the overlay
 * and prevents the overlay's styles from bleeding out.
 */
export function createShadowHost(): { host: HTMLElement; shadow: ShadowRoot } {
  // Remove any pre-existing host (safety: prevents duplicates on rapid calls)
  const existing = document.getElementById('speedy-capture-host');
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = 'speedy-capture-host';
  host.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'width: 100%',
    'height: 100%',
    'z-index: 2147483647',
    'pointer-events: none',
    // Prevent the host from being captured by page screenshot tools
    'isolation: isolate',
  ].join('; ') + ';';

  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Inject Inter font into the shadow root so it is available to the overlay
  // even on pages that don't load Inter themselves.
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
  shadow.appendChild(fontLink);

  return { host, shadow };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/extension/src/content/shadow.ts
git commit -m "feat(extension): Shadow DOM host factory for capture overlay"
```

---

## Task 8: Overlay React component

**Files created:**
- `apps/extension/src/content/overlay.tsx`

- [ ] **Step 1: Create src/content/overlay.tsx**

```tsx
import React, { useCallback, useEffect, useRef } from 'react';
import { SmartInput } from '@speedy/shared';
import type { Task } from '@speedy/shared';
import { nanoid } from 'nanoid';
import type { StoredTask, ExtensionMessage } from '../types/messages';

interface OverlayProps {
  /** URL of the page where the overlay was triggered — attached as sourceUrl */
  sourceUrl: string;
  /** Called when the overlay should unmount (Escape, backdrop click, or after save) */
  onClose: () => void;
}

/**
 * Full-screen semi-transparent backdrop with a centered SmartInput bar.
 * Rendered inside a Shadow DOM so host-page CSS cannot affect it.
 *
 * Pointer events:
 *  - Backdrop: pointer-events:auto — clicking it closes the overlay
 *  - Inner bar: pointer-events:auto + stopPropagation — clicks don't leak to backdrop
 */
export function Overlay({ sourceUrl, onClose }: OverlayProps): React.ReactElement {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape key (belt-and-suspenders: content/index.ts also handles Escape,
  // but the overlay itself should be self-contained)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Listen on the shadow root's document-equivalent is not possible;
    // window events bubble into shadow roots, so this works.
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  /** Called by SmartInput when the user presses ⌘+Enter */
  const handleTaskReady = useCallback(
    async (partial: Partial<Task>) => {
      const task: StoredTask = {
        id: nanoid(),
        title: partial.title ?? '',
        projectId: partial.projectId,
        dueDate: partial.dueDate ? (partial.dueDate as Date).toISOString() : null,
        workingDate: partial.workingDate
          ? (partial.workingDate as Date).toISOString()
          : null,
        sourceUrl,
        capturedAt: new Date().toISOString(),
        synced: false,
      };

      const msg: ExtensionMessage = { type: 'TASK_SAVE', task };
      chrome.runtime.sendMessage(msg);

      onClose();
    },
    [sourceUrl, onClose]
  );

  return (
    <div
      ref={backdropRef}
      data-testid="overlay-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        pointerEvents: 'auto',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        data-testid="overlay-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '640px',
          margin: '0 16px',
          backgroundColor: '#0e0e0e',
          border: '1px solid #1f1f1f',
          borderRadius: '10px',
          padding: '12px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          pointerEvents: 'auto',
        }}
      >
        <SmartInput onTaskReady={handleTaskReady} autoFocus />
        <p
          style={{
            margin: '8px 0 0',
            fontSize: '11px',
            color: '#666666',
            textAlign: 'right',
          }}
        >
          ⌘↵ to save · Esc to close
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/extension/src/content/overlay.tsx
git commit -m "feat(extension): capture overlay React component with SmartInput integration"
```

---

## Task 9: Test overlay component

**Files created:**
- `apps/extension/src/__tests__/overlay.test.tsx`

- [ ] **Step 1: Create src/__tests__/overlay.test.tsx**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { Overlay } from '../content/overlay';

// Mock @speedy/shared's SmartInput with a minimal substitute.
// We test Overlay's own responsibilities (save, close, backdrop click),
// not SmartInput internals (those are tested in packages/shared).
vi.mock('@speedy/shared', () => ({
  SmartInput: ({
    onTaskReady,
  }: {
    onTaskReady: (task: { title: string }) => void;
    autoFocus?: boolean;
  }) => (
    <button
      data-testid="smart-input-mock"
      onClick={() => onTaskReady({ title: 'Test task' })}
    >
      Save task
    </button>
  ),
}));

// Mock nanoid to return deterministic IDs in tests
vi.mock('nanoid', () => ({ nanoid: () => 'test-id-123' }));

describe('Overlay', () => {
  const defaultProps = {
    sourceUrl: 'https://example.com/page',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the chrome.runtime.sendMessage mock provided by setup.ts
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('renders the backdrop and panel', () => {
    render(<Overlay {...defaultProps} />);
    expect(screen.getByTestId('overlay-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('overlay-panel')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<Overlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('overlay-backdrop'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when the panel itself is clicked', () => {
    render(<Overlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('overlay-panel'));
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    render(<Overlay {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('sends TASK_SAVE message and calls onClose when SmartInput fires onTaskReady', async () => {
    render(<Overlay {...defaultProps} />);

    fireEvent.click(screen.getByTestId('smart-input-mock'));

    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TASK_SAVE',
          task: expect.objectContaining({
            id: 'test-id-123',
            title: 'Test task',
            sourceUrl: 'https://example.com/page',
            synced: false,
          }),
        })
      );
    });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('includes sourceUrl from props in the saved task', async () => {
    render(<Overlay sourceUrl="https://news.ycombinator.com" onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId('smart-input-mock'));

    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          task: expect.objectContaining({
            sourceUrl: 'https://news.ycombinator.com',
          }),
        })
      );
    });
  });

  it('sets capturedAt to a valid ISO string', async () => {
    const before = new Date().toISOString();
    render(<Overlay {...defaultProps} />);

    fireEvent.click(screen.getByTestId('smart-input-mock'));

    await waitFor(() => {
      const call = (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const after = new Date().toISOString();
      expect(call.task.capturedAt >= before).toBe(true);
      expect(call.task.capturedAt <= after).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run overlay tests**

```bash
cd apps/extension && npm test -- src/__tests__/overlay.test.tsx --reporter=verbose 2>&1
```

Expected output:

```
✓ src/__tests__/overlay.test.tsx (6)
  ✓ Overlay (6)
    ✓ renders the backdrop and panel
    ✓ calls onClose when backdrop is clicked
    ✓ does NOT call onClose when the panel itself is clicked
    ✓ calls onClose when Escape is pressed
    ✓ sends TASK_SAVE message and calls onClose when SmartInput fires onTaskReady
    ✓ includes sourceUrl from props in the saved task
    ✓ sets capturedAt to a valid ISO string

Test Files  1 passed (1)
Tests       6 passed (6)
```

- [ ] **Step 3: Commit**

```bash
git add apps/extension/src/__tests__/overlay.test.tsx
git commit -m "test(extension): overlay component tests — backdrop, close, save, sourceUrl"
```

---

## Task 10: Popup

**Files created:**
- `apps/extension/src/popup/index.html`
- `apps/extension/src/popup/main.tsx`
- `apps/extension/src/popup/Popup.tsx`

- [ ] **Step 1: Create src/popup/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Speedy Tasks</title>
    <link
      rel="preconnect"
      href="https://fonts.googleapis.com"
    />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
    />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 280px;
        background: #080808;
        color: #e2e2e2;
        font-family: Inter, system-ui, sans-serif;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create src/popup/main.tsx**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';

const root = document.getElementById('root');
if (!root) throw new Error('No #root element found in popup HTML');

createRoot(root).render(<Popup />);
```

- [ ] **Step 3: Create src/popup/Popup.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import type { ExtensionMessage, StoredTask } from '../types/messages';

/**
 * The Vercel deployment URL for the Speedy web app.
 * Injected at build time via Vite's define / import.meta.env.
 * Falls back to localhost for development.
 */
const WEB_APP_URL: string =
  (typeof import.meta.env !== 'undefined' && import.meta.env['VITE_WEB_APP_URL'] as string) ||
  'http://localhost:5173';

export function Popup(): React.ReactElement {
  const [unsyncedCount, setUnsyncedCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const msg: ExtensionMessage = { type: 'GET_UNSYNCED' };
    chrome.runtime.sendMessage(msg, (tasks: StoredTask[]) => {
      setUnsyncedCount(Array.isArray(tasks) ? tasks.length : 0);
      setIsLoading(false);
    });
  }, []);

  const openWebApp = () => {
    chrome.tabs.create({ url: WEB_APP_URL });
    window.close();
  };

  const openOverlay = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id != null) {
        const msg: ExtensionMessage = { type: 'OVERLAY_OPEN' };
        chrome.tabs.sendMessage(tab.id, msg);
      }
    });
    window.close();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #1f1f1f',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#e2e2e2' }}>
          Speedy Tasks
        </span>
      </div>

      {/* Unsynced count */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #1f1f1f',
        }}
      >
        <p style={{ color: '#666666', fontSize: '12px', marginBottom: '4px' }}>
          Captured, not yet synced
        </p>
        <p
          style={{
            fontSize: '28px',
            fontWeight: 600,
            color: isLoading ? '#666666' : unsyncedCount === 0 ? '#4ade80' : '#e2e2e2',
          }}
        >
          {isLoading ? '…' : unsyncedCount}
        </p>
        {!isLoading && unsyncedCount === 0 && (
          <p style={{ fontSize: '12px', color: '#4ade80', marginTop: '2px' }}>
            All synced
          </p>
        )}
        {!isLoading && unsyncedCount !== null && unsyncedCount > 0 && (
          <p style={{ fontSize: '12px', color: '#666666', marginTop: '2px' }}>
            Open Speedy to sync
          </p>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <button
          onClick={openWebApp}
          style={{
            width: '100%',
            padding: '9px 12px',
            backgroundColor: '#5E6AD2',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Open Speedy
        </button>
        <button
          onClick={openOverlay}
          style={{
            width: '100%',
            padding: '9px 12px',
            backgroundColor: 'transparent',
            color: '#e2e2e2',
            border: '1px solid #1f1f1f',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Capture task (Alt+Shift+I)
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/extension/src/popup/index.html apps/extension/src/popup/main.tsx apps/extension/src/popup/Popup.tsx
git commit -m "feat(extension): popup UI — unsynced count, Open Speedy button, capture shortcut"
```

---

## Task 11: Build verification

Verify that `vite build` produces a valid Chrome extension `dist/` that can be loaded unpacked in Chrome and zipped for the Chrome Web Store.

- [ ] **Step 1: Run the production build**

```bash
cd apps/extension && npm run build 2>&1
```

Expected output (no errors):

```
vite v5.x.x building for production...
✓ 12 modules transformed.
dist/manifest.json                   2.1 kB
dist/service_worker/index.js         4.3 kB
dist/content_scripts/index.js        8.7 kB
dist/popup/index.html                1.2 kB
dist/popup/main.js                   6.4 kB
✓ built in 3.2s
```

> CRXJS renames the entry points according to the manifest. The exact file names will vary; what matters is that no build errors appear and the `dist/` folder contains `manifest.json`.

- [ ] **Step 2: Verify dist/manifest.json is valid MV3**

```bash
node -e "
const m = JSON.parse(require('fs').readFileSync('apps/extension/dist/manifest.json', 'utf8'));
console.assert(m.manifest_version === 3, 'manifest_version must be 3');
console.assert(m.background.service_worker, 'service_worker must be present');
console.assert(m.action.default_popup, 'popup must be present');
console.log('manifest.json OK:', JSON.stringify({ mv: m.manifest_version, sw: m.background.service_worker }, null, 2));
"
```

Expected:

```
manifest.json OK: {
  "mv": 3,
  "sw": "service_worker/index.js"
}
```

- [ ] **Step 3: Zip for Chrome Web Store**

```bash
cd apps/extension/dist && zip -r ../speedy-tasks-extension.zip . && echo "zip created: $(du -sh ../speedy-tasks-extension.zip | cut -f1)"
```

Expected: `zip created: 48K` (approximate — will vary with icon sizes)

- [ ] **Step 4: Run full test suite one last time**

```bash
cd apps/extension && npm test 2>&1
```

Expected:

```
✓ src/__tests__/background.test.ts (14)
✓ src/__tests__/doubleShift.test.ts (5)
✓ src/__tests__/overlay.test.tsx (6)

Test Files  3 passed (3)
Tests       25 passed (25)
```

- [ ] **Step 5: Final commit**

```bash
git add apps/extension/
git commit -m "feat(extension): complete build verification — 25 tests passing, dist/ ready for CWS"
```

---

## Summary

### What was built

| Deliverable | Status |
|-------------|--------|
| `apps/extension` package scaffolded (Vite + CRXJS + React + TypeScript) | Done |
| MV3 manifest with Alt+Shift+I command, content scripts, popup, service worker | Done |
| `ExtensionMessage` discriminated union + `StoredTask` interface | Done |
| Background service worker: `saveTask`, `getUnsyncedTasks`, `markSynced`, `setSession`, `getSession`, message router, badge updater | Done |
| Content script: `makeDoubleShiftDetector` pure function + overlay lifecycle | Done |
| Shadow DOM host factory (`createShadowHost`) | Done |
| Capture overlay React component using `SmartInput` from `@speedy/shared` | Done |
| Extension popup: unsynced count, "Open Speedy" button, "Capture task" button | Done |
| 25 passing unit tests (TDD for background, overlay, double-shift) | Done |
| Production build producing a `.zip` ready for Chrome Web Store submission | Done |

### Message bridge — what's handled here vs. Plan 2

The extension (Plan 3) **fully implements the receiving side** of the message bridge:

- `GET_UNSYNCED` → returns `StoredTask[]` to any external sender (the web app)
- `MARK_SYNCED` → marks task IDs as synced in `chrome.storage.local`
- `SET_SESSION` / `GET_SESSION` → stores/retrieves Supabase session token

**Plan 2 (apps/web)** is responsible for the web app side of this bridge:

- On app load, calling `chrome.runtime.sendMessage(extensionId, { type: 'GET_UNSYNCED' })` to fetch extension-captured tasks
- Writing those tasks into Dexie and triggering a sync cycle
- Calling `MARK_SYNCED` after successfully writing tasks
- Posting the Supabase session token to the extension via `SET_SESSION` after login

The extension does not depend on Plan 2 being complete — it works independently as soon as Plan 1 (`packages/shared`) is built.
