# ProductOS — Design Spec

## Overview

Extend Sift's project management with a markdown artifact repository and a prompt template engine. Projects become sovereign workspaces: tasks live alongside written artifacts (discovery notes, strategy docs, specs), and a skill picker packages live project context into clipboard-ready LLM prompts.

No lifecycle states, no split panels, no sidebar. One full-page project workspace. Artifacts open as a focused side drawer.

---

## Data Model

### Dexie schema v4

```ts
// packages/shared/src/db.ts
projects:  '++id, spaceId, updatedAt, synced'
// additions: description: string (default '')

artifacts: '++id, projectId, updatedAt, synced'
// fields: id, projectId, title, content, createdAt, updatedAt, synced: boolean
```

### New types

```ts
// packages/shared/src/types.ts
export type Artifact = {
  id: string
  projectId: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  synced: boolean
}

export type PromptTemplate = {
  id: string
  name: string
  emoji: string
  description: string
  systemPrompt: string
  userPromptTemplate: string  // contains {{PROJECT_NAME}} etc.
  createdAt: string
}
```

### Supabase migrations

1. `ALTER TABLE projects ADD COLUMN description text NOT NULL DEFAULT ''`
2. New `artifacts` table — mirrors Dexie fields, RLS (user owns rows), Realtime enabled
3. New `prompt_templates` table — Supabase-only (no Dexie store), RLS per user (`user_id` column, policies filter by `auth.uid()`). Each user owns their own skill list; a new user starts with an empty list.

### SyncService extension

Artifacts follow the same push/pull pattern as tasks:
- Push: `synced: false` records upserted to Supabase
- Pull: records with `updated_at > last_synced_at` fetched and written to Dexie
- Conflict resolution: last-write-wins on `updatedAt`

`prompt_templates` are not synced to Dexie — fetched from Supabase on mount, stored in React context.

---

## Route: `/project/:id`

### Entry

- `O` on a focused project row in `ProjectsView` → `navigate('/project/:id')`
- This replaces the current `O` expand/collapse behavior in `ProjectsView`
- No global sidebar on this route — full page

### Layout

```
┌──────────────────────────────────────────────────────┐
│  ← ESC   Project Name   project description   [T]   │  topbar
├──────────────────────────────────────────────────────┤
│                                                      │
│  TASKS (n)                                           │
│  ○ done task (strikethrough)                         │
│  ◉ focused task          ← ↑↓ to navigate           │
│  ○ pending task                                      │
│                                                      │
│  ARTIFACTS (n) · ~1,240 tok                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │Discovery │ │  User    │ │ Problem  │ │  N     │  │
│  │  Notes   │ │ Research │ │  Frame   │ │  new   │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
│                                                      │
├──────────────────────────────────────────────────────┤
│  ↑↓ tasks · Tab artifacts · Space open · N new · S skills · ESC back │
└──────────────────────────────────────────────────────┘
```

### Keyboard nav

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate tasks |
| `Tab` | Jump focus to artifact grid |
| `↑↓←→` | Navigate artifact cards |
| `Space` | Open focused artifact in drawer |
| `Enter` | Toggle focused task done/undone (when task focused) |
| `Backspace` | Archive focused task (when task focused) |
| `N` | Create new artifact (inline title input in grid) |
| `E` | Edit focused artifact title (when artifact focused) |
| `Backspace` | Delete focused artifact via ConfirmModal (when artifact focused) |
| `S` | Open skill picker |
| `ESC` | Close drawer if open; else back to ProjectsView (focused on same project) |

### Token counter

Displayed inline with the ARTIFACTS section label: `ARTIFACTS (3) · ~1,240 tok`

Computed as `Math.ceil(totalContentLength / 4)` across all artifacts. Updates reactively as content changes.

---

## Artifact Drawer

Opens over the project page (right side, ~55% width). Project page dims to ~40% opacity behind it.

### Drawer anatomy

```
┌─ ESC ×   Discovery Notes        [ EDIT ] [ VIEW ] ─┐
│                                                      │
│  # Discovery Notes                                   │
│                                                      │
│  markdown content with blinking cursor...            │
│                                                      │
├──────────────────────────────────────────────────────┤
│  [ SAVED ]                               ~420 tok   │
├──────────────────────────────────────────────────────┤
│  ESC close · S skills · Cmd+Z undo                  │
└──────────────────────────────────────────────────────┘
```

### Editor behavior

- **Default state: VIEW mode** — artifact content rendered as markdown (Geist Sans, background `#F9F9FB`)
- **Click anywhere on the document** or press `E` → switches to EDIT mode (raw markdown textarea, JetBrains Mono)
- **ESC from EDIT mode** → returns to VIEW mode
- EDIT/VIEW buttons in the drawer toolbar reflect current mode and act as a secondary toggle
- Auto-save fires on 1000ms debounce while in EDIT mode
- Save status: `[ SAVING... ]` while debounce pending → `[ SAVED ]` on confirm
- Offline: writes to IndexedDB immediately, status shows `[ CACHED ]` until sync

### Drawer border

Left border of drawer uses `#FF4F00` (1px) to signal active focus context.

---

## Skill Picker

Triggered by `S` from anywhere in the project workspace (project page or inside drawer).

Reuses the existing `CommandPalette` component shell.

### Interaction

1. `S` → palette opens with list of all `prompt_templates` (emoji + name + description)
2. Type to filter, `↑↓` to navigate, `Enter` to execute
3. On execute:
   - Call `injectContext(template, project, tasks, artifacts)` client-side
   - Copy result to system clipboard
   - Create new empty `Artifact` named `{emoji} {name}` in Dexie + Supabase
   - Close palette
   - Auto-open the new artifact in the drawer (replaces any currently open artifact)
   - Hintbar shows for 4s: `COPIED TO CLIPBOARD — paste into your AI, then paste the response here`

### Context injection

```ts
function injectContext(
  template: string,
  project: Project,
  tasks: Task[],
  artifacts: Artifact[]
): string {
  const taskString = tasks
    .map(t => `- [${t.status === 'done' ? 'x' : ' '}] ${t.title}`)
    .join('\n')
  const artifactString = artifacts
    .map(a => `## ${a.title}\n${a.content}`)
    .join('\n\n')

  return template
    .replace(/\{\{PROJECT_NAME\}\}/g, project.name)
    .replace(/\{\{PROJECT_DESCRIPTION\}\}/g, project.description)
    .replace(/\{\{CURRENT_TASKS\}\}/g, taskString)
    .replace(/\{\{PREVIOUS_ARTIFACTS\}\}/g, artifactString)
}
```

The full injected string is `systemPrompt + '\n\n' + injectedUserPrompt` — both copied as one clipboard payload.

---

## Avatar Dropdown

The existing avatar/logout button in `Topbar.tsx` becomes a dropdown:

```
┌─────────────────┐
│  Skills Library │  → navigate('/skills')
│  ─────────────  │
│  Sign out       │
└─────────────────┘
```

Dropdown opens on click, closes on `ESC` or outside click.

---

## `/skills` Route — Skills Library

Full-page CRUD for `prompt_templates`. Accessed via avatar dropdown.

### List view

Table: `emoji · name · description`

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate rows |
| `N` | Create new (inline form expands) |
| `E` | Edit focused row (inline form expands) |
| `Backspace` | Delete (ConfirmModal) |
| `ESC` | Back |

### Create/Edit inline form

Fields:
- `emoji` — via EmojiPicker (existing shared component)
- `name` — text input
- `description` — single-line text input
- `systemPrompt` — large textarea, JetBrains Mono
- `userPromptTemplate` — large textarea, JetBrains Mono

Variable hint bar below `userPromptTemplate`:
```
{{PROJECT_NAME}}  {{PROJECT_DESCRIPTION}}  {{CURRENT_TASKS}}  {{PREVIOUS_ARTIFACTS}}
```
Each variable is clickable — inserts at cursor position.

Save → upsert to Supabase. Cancel → `ESC`. No Dexie involvement.

---

## Design Tokens (unchanged)

Follows the existing Sift design system:
- `#FF4F00` — focus accent, active borders, key highlights
- `0.5px solid #E2E2E2` — pane borders (light) / `0.5px solid #2a2a2a` (dark)
- `border-radius: 0` everywhere
- Geist Sans for prose, JetBrains Mono for metadata/code/status
- 150ms spring transitions on drawer open/close

---

## Out of Scope

- Lifecycle states (Discovery → Strategy → Specification → Execution) — deferred
- Per-skill state filtering — deferred
- Token guardrail warning — deferred (counter shows, no warning threshold yet)
- Offline skills availability — skills require Supabase connection by design
