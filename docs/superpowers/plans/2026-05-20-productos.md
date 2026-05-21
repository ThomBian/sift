# ProductOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Sift projects with a markdown artifact repository and a prompt-template engine that packages live project context into clipboard-ready LLM prompts.

**Architecture:** Dexie v6 adds an `artifacts` table (same push/pull sync pattern as tasks). A full-page `/project/:id` route replaces the expand/collapse project row with a sovereign workspace: tasks + artifact card grid, artifact drawer overlay, and `S`-key skill picker. A `/skills` route (reached via avatar dropdown) provides CRUD for `prompt_templates`, which live in Supabase only.

**Tech Stack:** React 19, Dexie 4, Supabase JS v2, react-markdown v9, Tailwind v4, Vitest + Testing Library, nanoid.

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260520000000_productos.sql` | Add `description` to projects; create `artifacts` + `prompt_templates` tables |
| `packages/shared/src/injectContext.ts` | Pure `injectContext()` function |
| `packages/shared/src/__tests__/injectContext.test.ts` | Tests for context injection |
| `apps/web/src/hooks/useArtifacts.ts` | Dexie live query for artifacts by project + token counter |
| `apps/web/src/__tests__/useArtifacts.test.ts` | Tests |
| `apps/web/src/contexts/SkillsContext.tsx` | Fetch/cache `prompt_templates` from Supabase |
| `apps/web/src/views/ProjectWorkspaceView.tsx` | Full-page `/project/:id` view |
| `apps/web/src/components/ArtifactDrawer.tsx` | Slide-in artifact editor/viewer |
| `apps/web/src/components/SkillPicker.tsx` | `S`-key skill picker (CommandPalette shell) |
| `apps/web/src/views/SkillsView.tsx` | `/skills` CRUD route |

### Modified files
| File | Change |
|------|--------|
| `packages/shared/src/types.ts` | Add `description` to `Project`; add `Artifact`, `PromptTemplate` types |
| `packages/shared/src/db.ts` | Dexie version 6: `artifacts` table + project `description` upgrade |
| `packages/shared/src/index.ts` | Export `Artifact`, `PromptTemplate`, `injectContext` |
| `apps/web/src/App.tsx` | Register `/project/:id`, `/skills` routes; wrap with `SkillsProvider` |
| `apps/web/src/components/layout/Topbar.tsx` | Avatar → dropdown (Skills Library + Sign out) |
| `apps/web/src/services/SyncService.ts` | Add `syncArtifacts()`, extend `sync()` and `bootstrap()` |
| `apps/web/src/views/ProjectsView.tsx` | `O` key → `navigate('/project/:id')` instead of expand/collapse |
| `apps/web/src/__tests__/SyncService.test.ts` | Update `makeProject()` factory to include `description` |

---

## Task 1: Types + Dexie v6

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/db.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/__tests__/SyncService.test.ts` (update `makeProject` factory)

- [ ] **Step 1: Add `description` to `Project` and new types in `types.ts`**

```ts
// packages/shared/src/types.ts

export interface Space {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export interface Project {
  id: string;
  name: string;
  emoji: string | null;
  spaceId: string;
  dueDate: Date | null;
  archived: boolean;
  url: string | null;
  description: string;   // ← new
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export type TaskStatus = "inbox" | "todo" | "done" | "archived";

export interface Task {
  id: string;
  title: string;
  projectId: string | null;
  status: TaskStatus;
  workingDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  url: string | null;
  synced: boolean;
}

export interface Artifact {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  createdAt: string;
}
```

- [ ] **Step 2: Add Dexie version 6 with `artifacts` table and project `description` upgrade in `db.ts`**

Add after the existing `version(5)` block and update the class declaration and `clearLocalDB`:

```ts
// At top, add import:
import type { Space, Project, Task, Artifact } from "./types";

// In class body, add:
artifacts!: Table<Artifact>;

// After version(5) block, add:
this.version(6)
  .stores({
    artifacts: "id, projectId, updatedAt, synced",
  })
  .upgrade((tx) => {
    return tx
      .table("projects")
      .toCollection()
      .modify((project: any) => {
        if (project.description === undefined) {
          project.description = "";
        }
      });
  });
```

Update `clearLocalDB`:

```ts
export async function clearLocalDB(): Promise<void> {
  await db.transaction("rw", db.spaces, db.projects, db.tasks, db.artifacts, async () => {
    await Promise.all([
      db.spaces.clear(),
      db.projects.clear(),
      db.tasks.clear(),
      db.artifacts.clear(),
    ]);
  });
}
```

Update `_seed()` to include `description`:

```ts
await this.projects.add({
  id: nanoid(),
  name: "General",
  emoji: getRandomEmoji(),
  spaceId,
  dueDate: null,
  archived: false,
  url: null,
  description: "",   // ← add this line
  createdAt: now,
  updatedAt: now,
  synced: false,
});
```

- [ ] **Step 3: Export new types from `packages/shared/src/index.ts`**

```ts
// Add to existing exports:
export type { Space, Project, Task, TaskStatus, Artifact, PromptTemplate } from "./types";
export { injectContext } from "./injectContext";
```

(The `injectContext` export will be wired in Task 3. For now just add the type exports.)

- [ ] **Step 4: Fix `makeProject` factory in SyncService tests**

In `apps/web/src/__tests__/SyncService.test.ts`, update `makeProject`:

```ts
function makeProject(overrides?: Partial<Project>): Project {
  return {
    id: "project-1",
    name: "General",
    emoji: "📚",
    spaceId: "space-1",
    dueDate: null,
    archived: false,
    url: null,
    description: "",   // ← add this line
    createdAt: now,
    updatedAt: now,
    synced: false,
    ...overrides,
  };
}
```

- [ ] **Step 5: Build shared package and verify no type errors**

```bash
npm run build --workspace=@sift/shared
```

Expected: exits 0, `dist/` updated.

- [ ] **Step 6: Run existing tests to verify nothing broke**

```bash
npm run test --workspace=@sift/shared
npm run test --workspace=web
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/db.ts packages/shared/src/index.ts apps/web/src/__tests__/SyncService.test.ts
git commit -m "feat: add Artifact + PromptTemplate types, Dexie v6 with artifacts table"
```

---

## Task 2: Supabase Migration

**Files:**
- Create: `supabase/migrations/20260520000000_productos.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260520000000_productos.sql

-- 1. Add description column to projects
alter table public.projects
  add column if not exists description text not null default '';

-- 2. Artifacts table
create table if not exists public.artifacts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id text not null references public.projects (id) on delete cascade,
  title text not null,
  content text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  synced boolean not null default true
);

create index if not exists artifacts_project_updated_idx
  on public.artifacts (project_id, updated_at);
create index if not exists artifacts_user_updated_idx
  on public.artifacts (user_id, updated_at);

alter table public.artifacts enable row level security;

drop policy if exists "artifacts_select_own" on public.artifacts;
drop policy if exists "artifacts_insert_own" on public.artifacts;
drop policy if exists "artifacts_update_own" on public.artifacts;
drop policy if exists "artifacts_delete_own" on public.artifacts;

create policy "artifacts_select_own" on public.artifacts
  for select using (auth.uid() = user_id);
create policy "artifacts_insert_own" on public.artifacts
  for insert with check (auth.uid() = user_id);
create policy "artifacts_update_own" on public.artifacts
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "artifacts_delete_own" on public.artifacts
  for delete using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'artifacts'
  ) then
    alter publication supabase_realtime add table public.artifacts;
  end if;
end;
$$;

-- 3. Prompt templates table (Supabase-only, no Dexie sync)
create table if not exists public.prompt_templates (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '⚡',
  description text not null default '',
  system_prompt text not null default '',
  user_prompt_template text not null default '',
  created_at timestamptz not null default now()
);

alter table public.prompt_templates enable row level security;

drop policy if exists "prompt_templates_select_own" on public.prompt_templates;
drop policy if exists "prompt_templates_insert_own" on public.prompt_templates;
drop policy if exists "prompt_templates_update_own" on public.prompt_templates;
drop policy if exists "prompt_templates_delete_own" on public.prompt_templates;

create policy "prompt_templates_select_own" on public.prompt_templates
  for select using (auth.uid() = user_id);
create policy "prompt_templates_insert_own" on public.prompt_templates
  for insert with check (auth.uid() = user_id);
create policy "prompt_templates_update_own" on public.prompt_templates
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "prompt_templates_delete_own" on public.prompt_templates
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Paste the contents of `20260520000000_productos.sql` into the Supabase SQL Editor and execute.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260520000000_productos.sql
git commit -m "feat: add artifacts and prompt_templates Supabase migration"
```

---

## Task 3: `injectContext` Utility

**Files:**
- Create: `packages/shared/src/injectContext.ts`
- Create: `packages/shared/src/__tests__/injectContext.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/shared/src/__tests__/injectContext.test.ts
import { describe, it, expect } from "vitest";
import { injectContext } from "../injectContext";
import type { Project, Task, Artifact } from "../types";

const now = new Date("2026-05-20T10:00:00Z");

const project: Project = {
  id: "p1",
  name: "Sift v2",
  description: "A sovereign task OS",
  emoji: "🚀",
  spaceId: "s1",
  dueDate: null,
  archived: false,
  url: null,
  createdAt: now,
  updatedAt: now,
  synced: false,
};

const tasks: Task[] = [
  { id: "t1", title: "Define personas", projectId: "p1", status: "todo",
    workingDate: null, dueDate: null, createdAt: now, updatedAt: now,
    completedAt: null, url: null, synced: false },
  { id: "t2", title: "Competitive analysis", projectId: "p1", status: "done",
    workingDate: null, dueDate: null, createdAt: now, updatedAt: now,
    completedAt: now, url: null, synced: false },
];

const artifacts: Artifact[] = [
  { id: "a1", projectId: "p1", title: "Discovery Notes",
    content: "## Findings\nUsers want speed.", createdAt: now, updatedAt: now, synced: false },
];

describe("injectContext", () => {
  it("replaces PROJECT_NAME", () => {
    const result = injectContext("Hello {{PROJECT_NAME}}", "", project, [], []);
    expect(result).toBe("Hello Sift v2");
  });

  it("replaces PROJECT_DESCRIPTION", () => {
    const result = injectContext("Desc: {{PROJECT_DESCRIPTION}}", "", project, [], []);
    expect(result).toBe("Desc: A sovereign task OS");
  });

  it("replaces CURRENT_TASKS with markdown checklist", () => {
    const result = injectContext("{{CURRENT_TASKS}}", "", project, tasks, []);
    expect(result).toBe("- [ ] Define personas\n- [x] Competitive analysis");
  });

  it("replaces PREVIOUS_ARTIFACTS with titled sections", () => {
    const result = injectContext("{{PREVIOUS_ARTIFACTS}}", "", project, [], artifacts);
    expect(result).toBe("## Discovery Notes\n## Findings\nUsers want speed.");
  });

  it("prepends system prompt separated by double newline", () => {
    const result = injectContext("User: {{PROJECT_NAME}}", "System instructions", project, [], []);
    expect(result).toBe("System instructions\n\nUser: Sift v2");
  });

  it("replaces all occurrences of the same variable", () => {
    const result = injectContext("{{PROJECT_NAME}} / {{PROJECT_NAME}}", "", project, [], []);
    expect(result).toBe("Sift v2 / Sift v2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run packages/shared/src/__tests__/injectContext.test.ts
```

Expected: FAIL — `injectContext` not found.

- [ ] **Step 3: Implement `injectContext`**

```ts
// packages/shared/src/injectContext.ts
import type { Project, Task, Artifact } from "./types";

export function injectContext(
  userPromptTemplate: string,
  systemPrompt: string,
  project: Project,
  tasks: Task[],
  artifacts: Artifact[],
): string {
  const taskString = tasks
    .map((t) => `- [${t.status === "done" ? "x" : " "}] ${t.title}`)
    .join("\n");
  const artifactString = artifacts
    .map((a) => `## ${a.title}\n${a.content}`)
    .join("\n\n");

  const injected = userPromptTemplate
    .replace(/\{\{PROJECT_NAME\}\}/g, project.name)
    .replace(/\{\{PROJECT_DESCRIPTION\}\}/g, project.description)
    .replace(/\{\{CURRENT_TASKS\}\}/g, taskString)
    .replace(/\{\{PREVIOUS_ARTIFACTS\}\}/g, artifactString);

  return systemPrompt ? `${systemPrompt}\n\n${injected}` : injected;
}
```

- [ ] **Step 4: Export from `index.ts`**

In `packages/shared/src/index.ts`, the `injectContext` export line was already stubbed in Task 1 Step 3. Confirm it's present:

```ts
export { injectContext } from "./injectContext";
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run packages/shared/src/__tests__/injectContext.test.ts
```

Expected: 6 passing.

- [ ] **Step 6: Build shared**

```bash
npm run build --workspace=@sift/shared
```

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/injectContext.ts packages/shared/src/__tests__/injectContext.test.ts packages/shared/src/index.ts
git commit -m "feat: add injectContext utility with tests"
```

---

## Task 4: `useArtifacts` Hook

**Files:**
- Create: `apps/web/src/hooks/useArtifacts.ts`
- Create: `apps/web/src/__tests__/useArtifacts.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/src/__tests__/useArtifacts.test.ts
// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db, clearLocalDB } from "../lib/db";
import { useArtifacts } from "../hooks/useArtifacts";
import type { Artifact } from "@sift/shared";

const now = new Date("2026-05-20T10:00:00Z");

function makeArtifact(overrides?: Partial<Artifact>): Artifact {
  return {
    id: "a1",
    projectId: "p1",
    title: "Discovery Notes",
    content: "Some content here",
    createdAt: now,
    updatedAt: now,
    synced: false,
    ...overrides,
  };
}

beforeEach(async () => {
  await clearLocalDB();
});

describe("useArtifacts", () => {
  it("returns empty array when no artifacts exist", async () => {
    const { result } = renderHook(() => useArtifacts("p1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.artifacts).toEqual([]);
    expect(result.current.totalTokens).toBe(0);
  });

  it("returns artifacts for the given projectId", async () => {
    await db.artifacts.add(makeArtifact({ id: "a1", projectId: "p1" }));
    await db.artifacts.add(makeArtifact({ id: "a2", projectId: "p2" }));

    const { result } = renderHook(() => useArtifacts("p1"));
    await waitFor(() => result.current.artifacts.length === 1);
    expect(result.current.artifacts[0].id).toBe("a1");
  });

  it("computes totalTokens as ceil(contentLength / 4)", async () => {
    await db.artifacts.add(makeArtifact({ id: "a1", content: "abcdefgh" })); // 8 chars → 2 tok
    await db.artifacts.add(makeArtifact({ id: "a2", content: "abcd" }));     // 4 chars → 1 tok

    const { result } = renderHook(() => useArtifacts("p1"));
    await waitFor(() => result.current.artifacts.length === 2);
    expect(result.current.totalTokens).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run apps/web/src/__tests__/useArtifacts.test.ts
```

Expected: FAIL — `useArtifacts` not found.

- [ ] **Step 3: Implement `useArtifacts`**

```ts
// apps/web/src/hooks/useArtifacts.ts
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import type { Artifact } from "@sift/shared";

export interface UseArtifactsResult {
  artifacts: Artifact[];
  totalTokens: number;
  loading: boolean;
}

export function useArtifacts(projectId: string): UseArtifactsResult {
  const artifacts = useLiveQuery(
    () => db.artifacts.where("projectId").equals(projectId).sortBy("createdAt"),
    [projectId],
  );

  const totalTokens =
    artifacts?.reduce(
      (sum, a) => sum + Math.ceil(a.content.length / 4),
      0,
    ) ?? 0;

  return {
    artifacts: artifacts ?? [],
    totalTokens,
    loading: artifacts === undefined,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run apps/web/src/__tests__/useArtifacts.test.ts
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useArtifacts.ts apps/web/src/__tests__/useArtifacts.test.ts
git commit -m "feat: add useArtifacts hook with token counter"
```

---

## Task 5: SyncService — Artifact Sync

**Files:**
- Modify: `apps/web/src/services/SyncService.ts`
- Modify: `apps/web/src/__tests__/SyncService.test.ts`

- [ ] **Step 1: Add artifact mappers and `syncArtifacts` to SyncService**

Add these functions and method to `SyncService.ts`. Add the import at the top:

```ts
import type { Space, Project, Task, Artifact } from "@sift/shared";
```

Add mapper functions after `rowToTask`:

```ts
function artifactToRow(artifact: Artifact, userId: string) {
  return {
    id: artifact.id,
    user_id: userId,
    project_id: artifact.projectId,
    title: artifact.title,
    content: artifact.content,
    created_at: artifact.createdAt.toISOString(),
    updated_at: artifact.updatedAt.toISOString(),
    synced: true,
  };
}

function rowToArtifact(row: Record<string, unknown>): Artifact {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    title: row.title as string,
    content: (row.content as string) ?? "",
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    synced: true,
  };
}
```

Add `syncArtifacts` as a private method on `SyncService`:

```ts
private async syncArtifacts(userId: string, lastSyncedAt: Date): Promise<void> {
  const unsynced = await db.artifacts.filter((a) => !a.synced).toArray();
  if (unsynced.length > 0) {
    const { error } = await this.supabase.from("artifacts").upsert(
      unsynced.map((a) => artifactToRow(a, userId)),
      { onConflict: "id" },
    );
    if (!error) {
      await db.artifacts.bulkPut(unsynced.map((a) => ({ ...a, synced: true })));
    }
  }

  const { data, error: pullError } = await this.supabase
    .from("artifacts")
    .select("*")
    .gt("updated_at", lastSyncedAt.toISOString());

  if (pullError || !data) return;

  const remoteArtifacts = (data as Record<string, unknown>[]).map(rowToArtifact);
  const locals = await db.artifacts.bulkGet(remoteArtifacts.map((a) => a.id));
  const localMap = new Map(locals.filter(Boolean).map((a) => [a!.id, a!]));
  const toUpsert = remoteArtifacts.filter((remote) => {
    const local = localMap.get(remote.id);
    return !local || remote.updatedAt > local.updatedAt;
  });
  if (toUpsert.length > 0) await db.artifacts.bulkPut(toUpsert);
}
```

- [ ] **Step 2: Extend `sync()` to include artifacts**

In `sync()`, change:

```ts
await Promise.all([
  this.syncSpaces(userId, lastSyncedAt),
  this.syncProjects(userId, lastSyncedAt),
  this.syncTasks(userId, lastSyncedAt),
]);
```

to:

```ts
await Promise.all([
  this.syncSpaces(userId, lastSyncedAt),
  this.syncProjects(userId, lastSyncedAt),
  this.syncTasks(userId, lastSyncedAt),
  this.syncArtifacts(userId, lastSyncedAt),
]);
```

- [ ] **Step 3: Extend `bootstrap()` to include artifacts**

In `bootstrap()`, add to the parallel fetch:

```ts
const [spacesRes, projectsRes, tasksRes, artifactsRes] = await Promise.all([
  this.supabase.from("spaces").select("*").eq("user_id", userId),
  this.supabase.from("projects").select("*").eq("user_id", userId),
  this.supabase.from("tasks").select("*").eq("user_id", userId),
  this.supabase.from("artifacts").select("*").eq("user_id", userId),
]);

if (spacesRes.error) throw new Error(`bootstrap: spaces — ${spacesRes.error.message}`);
if (projectsRes.error) throw new Error(`bootstrap: projects — ${projectsRes.error.message}`);
if (tasksRes.error) throw new Error(`bootstrap: tasks — ${tasksRes.error.message}`);
if (artifactsRes.error) throw new Error(`bootstrap: artifacts — ${artifactsRes.error.message}`);
```

Then write artifacts:

```ts
const cloudArtifacts = artifactsRes.data
  ? (artifactsRes.data as Record<string, unknown>[]).map(rowToArtifact)
  : [];
if (cloudArtifacts.length > 0) await db.artifacts.bulkPut(cloudArtifacts);
```

- [ ] **Step 4: Also extend `subscribe()` to listen on `artifacts`**

```ts
.on(
  "postgres_changes",
  { event: "*", schema: "public", table: "artifacts", filter: `user_id=eq.${userId}` },
  onChange,
)
```

- [ ] **Step 5: Also extend `syncProjects` to include `description` in the row mapper**

Update `projectToRow`:

```ts
function projectToRow(project: Project, userId: string) {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    emoji: project.emoji,
    space_id: project.spaceId,
    archived: project.archived,
    url: project.url,
    description: project.description,   // ← add
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
    synced: true,
  };
}
```

Update `rowToProject`:

```ts
function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    emoji: (row.emoji as string | null | undefined) ?? null,
    spaceId: row.space_id as string,
    dueDate: row.due_date ? new Date(row.due_date as string) : null,
    archived: (row.archived as boolean | undefined) ?? false,
    url: (row.url as string | null | undefined) ?? null,
    description: (row.description as string | undefined) ?? "",   // ← add
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    synced: true,
  };
}
```

- [ ] **Step 6: Add artifact sync test**

In `apps/web/src/__tests__/SyncService.test.ts`, add a `makeArtifact` factory and a test after existing tests:

```ts
function makeArtifact(overrides?: Partial<Artifact>): Artifact {
  return {
    id: "artifact-1",
    projectId: "project-1",
    title: "Discovery Notes",
    content: "Some content",
    createdAt: now,
    updatedAt: now,
    synced: false,
    ...overrides,
  };
}
```

Add import at top:
```ts
import type { Space, Project, Task, Artifact } from "@sift/shared";
```

Add test:
```ts
it("pushes unsynced artifacts to Supabase", async () => {
  await db.artifacts.add(makeArtifact());
  mockGt.mockResolvedValue({ data: [], error: null });

  const service = new SyncService(createMockSupabase() as any);
  await service.sync("user-1");

  expect(mockUpsert).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ id: "artifact-1", title: "Discovery Notes" }),
    ]),
    { onConflict: "id" },
  );
});
```

- [ ] **Step 7: Run tests**

```bash
npm run test --workspace=web
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/services/SyncService.ts apps/web/src/__tests__/SyncService.test.ts
git commit -m "feat: extend SyncService to sync artifacts"
```

---

## Task 6: `SkillsContext`

**Files:**
- Create: `apps/web/src/contexts/SkillsContext.tsx`

- [ ] **Step 1: Create `SkillsContext`**

```tsx
// apps/web/src/contexts/SkillsContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { PromptTemplate } from "@sift/shared";

interface SkillsContextValue {
  skills: PromptTemplate[];
  refetch: () => void;
}

const SkillsContext = createContext<SkillsContextValue>({
  skills: [],
  refetch: () => {},
});

export function SkillsProvider({ children }: { children: ReactNode }) {
  const [skills, setSkills] = useState<PromptTemplate[]>([]);

  const fetch = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("prompt_templates")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      setSkills(
        (data as Record<string, unknown>[]).map((row) => ({
          id: row.id as string,
          name: row.name as string,
          emoji: row.emoji as string,
          description: (row.description as string) ?? "",
          systemPrompt: (row.system_prompt as string) ?? "",
          userPromptTemplate: (row.user_prompt_template as string) ?? "",
          createdAt: row.created_at as string,
        })),
      );
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  return (
    <SkillsContext.Provider value={{ skills, refetch: fetch }}>
      {children}
    </SkillsContext.Provider>
  );
}

export function useSkills(): SkillsContextValue {
  return useContext(SkillsContext);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/contexts/SkillsContext.tsx
git commit -m "feat: add SkillsContext for prompt_templates"
```

---

## Task 7: `ProjectsView` — wire `O` key to navigate

**Files:**
- Modify: `apps/web/src/views/ProjectsView.tsx`

The current `O` key opens/closes task expansion for a project. We replace that with navigation to `/project/:id`.

- [ ] **Step 1: Find the `O` key handler in `ProjectsView`**

Search for where `O` is handled — it will be inside a `keydown` handler checking `e.key === 'o'` or similar, likely in the block that handles `handleProjectKeyDown` or a local `useEffect`. Read the relevant section:

```bash
grep -n "key.*[Oo]" /Users/tbianchini/workspace/sift/apps/web/src/views/ProjectsView.tsx
grep -n "expand" /Users/tbianchini/workspace/sift/apps/web/src/views/ProjectsView.tsx
```

- [ ] **Step 2: Replace expand/collapse with navigate**

Add `useNavigate` import if not already present:

```tsx
import { useNavigate } from "react-router-dom";
```

Inside the component, add:

```tsx
const navigate = useNavigate();
```

Find the `O` key handler (it will look like `e.key.toLowerCase() === 'o'`) and replace its body with:

```ts
if (focusedProjectId && focusedProjectId !== SHOW_ARCHIVED_TOGGLE_ID) {
  navigate(`/project/${focusedProjectId}`);
}
```

Remove the `expandedProjectId` state and its usages if they are no longer needed after this change. If `expandedProjectId` is only used for the `O` key expand behavior, delete:
- `const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);`
- Any JSX that conditionally renders tasks based on `expandedProjectId`

(If removing `expandedProjectId` is complex due to other usages, keep it but just change the `O` key action. The important thing is `O` navigates.)

- [ ] **Step 3: Run existing ProjectsView tests**

```bash
npx vitest run apps/web/src/__tests__/useProjectNav.test.ts
npm run test --workspace=web
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/views/ProjectsView.tsx
git commit -m "feat: O key opens project workspace instead of expand/collapse"
```

---

## Task 8: Install `react-markdown`

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install**

```bash
npm install react-markdown --workspace=web
```

Expected: package added to `apps/web/package.json` dependencies.

- [ ] **Step 2: Commit**

```bash
git add apps/web/package.json package-lock.json
git commit -m "feat: add react-markdown dependency"
```

---

## Task 9: `ArtifactDrawer` Component

**Files:**
- Create: `apps/web/src/components/ArtifactDrawer.tsx`

- [ ] **Step 1: Create `ArtifactDrawer`**

```tsx
// apps/web/src/components/ArtifactDrawer.tsx
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import { db } from "../lib/db";
import { nanoid } from "nanoid";
import type { Artifact } from "@sift/shared";

export interface ArtifactDrawerProps {
  artifact: Artifact;
  onClose: () => void;
  onSkill: () => void;
}

export default function ArtifactDrawer({
  artifact,
  onClose,
  onSkill,
}: ArtifactDrawerProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [content, setContent] = useState(artifact.content);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "cached">("saved");
  const debounceRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync content if artifact changes (e.g. skill created a new one)
  useEffect(() => {
    setContent(artifact.content);
    setMode("view");
    setSaveStatus("saved");
  }, [artifact.id, artifact.content]);

  const save = useCallback(
    async (value: string) => {
      setSaveStatus("saving");
      const now = new Date();
      await db.artifacts.update(artifact.id, {
        content: value,
        updatedAt: now,
        synced: false,
      });
      setSaveStatus("saved");
    },
    [artifact.id],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);
      setSaveStatus("saving");
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => void save(value), 1000);
    },
    [save],
  );

  const enterEdit = useCallback(() => {
    setMode("edit");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape") {
          if (mode === "edit") {
            e.preventDefault();
            e.stopPropagation();
            setMode("view");
          }
        }
        return;
      }
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "e" || e.key === "E") {
        enterEdit();
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        onSkill();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onSkill, enterEdit, mode]);

  // Flush debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  const statusLabel =
    saveStatus === "saving"
      ? "[ SAVING... ]"
      : saveStatus === "cached"
        ? "[ CACHED ]"
        : "[ SAVED ]";
  const statusColor =
    saveStatus === "saved" ? "text-green" : "text-muted";
  const tokenCount = Math.ceil(content.length / 4);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-text/40 backdrop-blur-[12px]"
        style={{ zIndex: 40 }}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[55%] bg-bg border-[0.5px] border-accent flex flex-col"
        style={{ zIndex: 50 }}
        role="dialog"
        aria-label={`Artifact: ${artifact.title}`}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[0.5px] border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted border border-[0.5px] border-border px-1.5 py-0.5 hover:text-text transition-colors duration-150"
          >
            ESC ×
          </button>
          <span className="flex-1 font-sans text-[13px] font-medium text-text truncate leading-none">
            {artifact.title}
          </span>
          <div className="flex gap-1">
            {(["edit", "view"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => (m === "edit" ? enterEdit() : setMode("view"))}
                className={`font-mono text-[9px] uppercase tracking-[0.06em] px-2 py-0.5 border border-[0.5px] transition-colors duration-150 ${
                  mode === m
                    ? "border-accent text-accent bg-accent/10"
                    : "border-border text-muted hover:text-text"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {mode === "view" ? (
            <div
              className="h-full px-6 py-5 bg-surface cursor-text prose prose-sm max-w-none"
              style={{ fontFamily: "Geist, Inter, system-ui", fontSize: 15 }}
              onClick={enterEdit}
            >
              {content ? (
                <ReactMarkdown>{content}</ReactMarkdown>
              ) : (
                <p
                  className="font-mono text-[10px] text-muted"
                  style={{ letterSpacing: "0.06em" }}
                >
                  // Empty artifact. Click or press E to start writing.
                </p>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              className="w-full h-full px-6 py-5 bg-bg resize-none outline-none font-mono text-[13px] text-text leading-relaxed"
              placeholder="// Start writing markdown..."
              spellCheck={false}
            />
          )}
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-[0.5px] border-border shrink-0">
          <span className={`font-mono text-[9px] uppercase tracking-[0.06em] ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="font-mono text-[9px] text-muted">
            ~{tokenCount} tok
          </span>
        </div>

        {/* Hintbar */}
        <div className="flex items-center gap-4 px-4 py-1 border-t border-[0.5px] border-border bg-surface shrink-0">
          {[
            { key: "ESC", label: mode === "edit" ? "exit edit" : "close" },
            { key: "S", label: "skills" },
            { key: "E", label: "edit" },
          ].map(({ key, label }) => (
            <span key={key} className="font-mono text-[9px] text-muted">
              <span className="text-accent">{key}</span> {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Run full test suite to confirm nothing broken**

```bash
npm run test --workspace=web
```

Expected: all pass (no tests for ArtifactDrawer yet — visual component, tested manually).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ArtifactDrawer.tsx
git commit -m "feat: add ArtifactDrawer component with VIEW/EDIT modes and auto-save"
```

---

## Task 10: `ProjectWorkspaceView`

**Files:**
- Create: `apps/web/src/views/ProjectWorkspaceView.tsx`

- [ ] **Step 1: Create `ProjectWorkspaceView`**

```tsx
// apps/web/src/views/ProjectWorkspaceView.tsx
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { nanoid } from "nanoid";
import { db } from "../lib/db";
import { useArtifacts } from "../hooks/useArtifacts";
import ArtifactDrawer from "../components/ArtifactDrawer";
import ConfirmModal from "../components/ConfirmModal";
import type { Artifact, Task } from "@sift/shared";

type FocusZone = "tasks" | "artifacts";

export default function ProjectWorkspaceView() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const project = useLiveQuery(
    () => (projectId ? db.projects.get(projectId) : undefined),
    [projectId],
  );
  const tasks = useLiveQuery(
    () =>
      projectId
        ? db.tasks
            .where("projectId")
            .equals(projectId)
            .filter((t) => t.status !== "archived")
            .sortBy("createdAt")
        : [],
    [projectId],
  );
  const { artifacts, totalTokens } = useArtifacts(projectId ?? "");

  const [focusZone, setFocusZone] = useState<FocusZone>("tasks");
  const [focusedTaskIdx, setFocusedTaskIdx] = useState(0);
  const [focusedArtifactIdx, setFocusedArtifactIdx] = useState(0);
  const [openArtifact, setOpenArtifact] = useState<Artifact | null>(null);
  const [newArtifactTitle, setNewArtifactTitle] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [deleteArtifact, setDeleteArtifact] = useState<Artifact | null>(null);
  const [skillHint, setSkillHint] = useState(false);
  const skillHintTimerRef = useRef<number | null>(null);

  const newTitleInputRef = useRef<HTMLInputElement>(null);
  const editTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => newTitleInputRef.current?.focus());
  }, [newArtifactTitle !== null]);

  useEffect(() => {
    requestAnimationFrame(() => editTitleInputRef.current?.focus());
  }, [editingTitleId]);

  const showSkillHint = useCallback(() => {
    setSkillHint(true);
    if (skillHintTimerRef.current !== null) clearTimeout(skillHintTimerRef.current);
    skillHintTimerRef.current = window.setTimeout(() => setSkillHint(false), 4000);
  }, []);

  const openSkillPicker = useCallback(() => {
    window.dispatchEvent(new CustomEvent("sift:open-skill-picker"));
  }, []);

  const createArtifact = useCallback(
    async (title: string) => {
      if (!projectId || !title.trim()) return;
      const now = new Date();
      const artifact: Artifact = {
        id: nanoid(),
        projectId,
        title: title.trim(),
        content: "",
        createdAt: now,
        updatedAt: now,
        synced: false,
      };
      await db.artifacts.add(artifact);
      return artifact;
    },
    [projectId],
  );

  const toggleTaskDone = useCallback(async (task: Task) => {
    const now = new Date();
    const isDone = task.status === "done";
    await db.tasks.update(task.id, {
      status: isDone ? "todo" : "done",
      completedAt: isDone ? null : now,
      updatedAt: now,
      synced: false,
    });
  }, []);

  const archiveTask = useCallback(async (task: Task) => {
    const now = new Date();
    await db.tasks.update(task.id, {
      status: "archived",
      updatedAt: now,
      synced: false,
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;

      if (inInput) {
        if (e.key === "Escape") {
          setNewArtifactTitle(null);
          setEditingTitleId(null);
          (target as HTMLElement).blur();
        }
        return;
      }

      if (openArtifact) return; // drawer handles its own keys

      if (e.key === "Escape") {
        navigate("/projects");
        return;
      }

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        openSkillPicker();
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        setFocusZone((z) => (z === "tasks" ? "artifacts" : "tasks"));
        return;
      }

      if (focusZone === "tasks") {
        const taskList = tasks ?? [];
        if (e.key === "ArrowDown") {
          setFocusedTaskIdx((i) => Math.min(i + 1, taskList.length - 1));
        } else if (e.key === "ArrowUp") {
          setFocusedTaskIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
          const task = taskList[focusedTaskIdx];
          if (task) void toggleTaskDone(task);
        } else if (e.key === "Backspace") {
          const task = taskList[focusedTaskIdx];
          if (task) void archiveTask(task);
        }
        return;
      }

      if (focusZone === "artifacts") {
        const cols = 3; // approximate grid columns
        if (e.key === "ArrowRight") {
          setFocusedArtifactIdx((i) => Math.min(i + 1, artifacts.length - 1));
        } else if (e.key === "ArrowLeft") {
          setFocusedArtifactIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === "ArrowDown") {
          setFocusedArtifactIdx((i) => Math.min(i + cols, artifacts.length - 1));
        } else if (e.key === "ArrowUp") {
          setFocusedArtifactIdx((i) => Math.max(i - cols, 0));
        } else if (e.key === " ") {
          e.preventDefault();
          const a = artifacts[focusedArtifactIdx];
          if (a) setOpenArtifact(a);
        } else if (e.key === "n" || e.key === "N") {
          setNewArtifactTitle("");
        } else if (e.key === "e" || e.key === "E") {
          const a = artifacts[focusedArtifactIdx];
          if (a) setEditingTitleId(a.id);
        } else if (e.key === "Backspace") {
          const a = artifacts[focusedArtifactIdx];
          if (a) setDeleteArtifact(a);
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    openArtifact, focusZone, tasks, artifacts,
    focusedTaskIdx, focusedArtifactIdx,
    toggleTaskDone, archiveTask, navigate, openSkillPicker,
  ]);

  // Listen for skill picker result: new artifact to open
  useEffect(() => {
    function onNewArtifact(e: Event) {
      const artifact = (e as CustomEvent<Artifact>).detail;
      setOpenArtifact(artifact);
      showSkillHint();
    }
    window.addEventListener("sift:skill-artifact-created", onNewArtifact);
    return () => window.removeEventListener("sift:skill-artifact-created", onNewArtifact);
  }, [showSkillHint]);

  if (!project) return null;

  const taskList = tasks ?? [];

  const hints =
    focusZone === "tasks"
      ? [
          { key: "↑↓", label: "tasks" },
          { key: "Enter", label: "done" },
          { key: "Tab", label: "artifacts" },
          { key: "S", label: "skills" },
          { key: "ESC", label: "back" },
        ]
      : [
          { key: "↑↓←→", label: "navigate" },
          { key: "Space", label: "open" },
          { key: "N", label: "new" },
          { key: "E", label: "rename" },
          { key: "Tab", label: "tasks" },
          { key: "S", label: "skills" },
        ];

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Topbar */}
      <header className="flex items-center gap-3 h-12 px-6 border-b border-[0.5px] border-border bg-surface shrink-0">
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted border border-[0.5px] border-border px-1.5 py-0.5 hover:text-text transition-colors"
        >
          ← ESC
        </button>
        <span className="font-sans text-[15px] font-medium text-text tracking-[-0.02em]">
          {project.name}
        </span>
        {project.description && (
          <span className="font-sans text-[13px] text-muted truncate">
            {project.description}
          </span>
        )}
      </header>

      {/* Body */}
      <main className="flex-1 px-8 py-6 flex flex-col gap-8">
        {/* Tasks */}
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mb-3">
            TASKS ({taskList.length})
          </div>
          {taskList.length === 0 ? (
            <p className="font-mono text-[10px] text-muted">
              No tasks. Press Cmd+K to add one.
            </p>
          ) : (
            <div className="flex flex-col">
              {taskList.map((task, idx) => {
                const focused = focusZone === "tasks" && idx === focusedTaskIdx;
                const done = task.status === "done";
                return (
                  <div
                    key={task.id}
                    onClick={() => { setFocusZone("tasks"); setFocusedTaskIdx(idx); }}
                    className={`flex items-center gap-3 py-2 border-b border-[0.5px] border-border cursor-default transition-colors duration-100 ${
                      focused ? "bg-accent/5" : ""
                    }`}
                    style={focused ? { boxShadow: "0 0 8px rgba(255,79,0,0.08)" } : undefined}
                  >
                    <span
                      className={`w-1.5 h-1.5 shrink-0 ${
                        focused ? "bg-accent shadow-laser" : done ? "bg-border-2" : "border border-[0.5px] border-dim"
                      }`}
                    />
                    <span
                      className={`font-sans text-[14px] tracking-[-0.02em] ${
                        done ? "line-through text-muted" : focused ? "text-text font-medium" : "text-text"
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Artifacts */}
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mb-3">
            ARTIFACTS ({artifacts.length})
            {totalTokens > 0 && (
              <span className="ml-2 normal-case">· ~{totalTokens.toLocaleString()} tok</span>
            )}
          </div>

          {artifacts.length === 0 && newArtifactTitle === null ? (
            <p className="font-mono text-[10px] text-muted">
              No artifacts yet. Press N to start writing, or S to generate one from a skill.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {artifacts.map((artifact, idx) => {
                const focused = focusZone === "artifacts" && idx === focusedArtifactIdx;
                const isEditingTitle = editingTitleId === artifact.id;
                return (
                  <div
                    key={artifact.id}
                    onClick={() => { setFocusZone("artifacts"); setFocusedArtifactIdx(idx); }}
                    onDoubleClick={() => setOpenArtifact(artifact)}
                    className={`border border-[0.5px] p-3 cursor-default transition-colors duration-100 ${
                      focused ? "border-accent bg-bg" : "border-border bg-bg hover:border-dim"
                    }`}
                    style={focused ? { boxShadow: "0 0 12px rgba(255,79,0,0.08)" } : undefined}
                  >
                    {isEditingTitle ? (
                      <input
                        ref={editTitleInputRef}
                        defaultValue={artifact.title}
                        className="w-full font-sans text-[12px] font-medium bg-transparent outline-none border-b border-[0.5px] border-accent text-text pb-0.5"
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          if (val) {
                            await db.artifacts.update(artifact.id, {
                              title: val,
                              updatedAt: new Date(),
                              synced: false,
                            });
                          }
                          setEditingTitleId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="font-sans text-[12px] font-medium text-text mb-2 truncate">
                        {artifact.title}
                      </div>
                    )}
                    <div className="flex flex-col gap-1 mb-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-1.5 bg-surface"
                          style={{ width: i === 2 ? "60%" : i === 1 ? "80%" : "100%" }}
                        />
                      ))}
                    </div>
                    <div className="font-mono text-[9px] text-muted">
                      ~{Math.ceil(artifact.content.length / 4)} tok
                    </div>
                  </div>
                );
              })}

              {/* New artifact input card */}
              {newArtifactTitle !== null ? (
                <div className="border border-[0.5px] border-accent p-3 bg-bg">
                  <input
                    ref={newTitleInputRef}
                    value={newArtifactTitle}
                    onChange={(e) => setNewArtifactTitle(e.target.value)}
                    placeholder="Artifact title..."
                    className="w-full font-sans text-[12px] font-medium bg-transparent outline-none text-text placeholder:text-dim"
                    onBlur={async () => {
                      if (newArtifactTitle.trim()) {
                        await createArtifact(newArtifactTitle);
                      }
                      setNewArtifactTitle(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setNewArtifactTitle("")}
                  className="border border-[0.5px] border-dashed border-dim p-3 bg-transparent flex items-center justify-center hover:border-text transition-colors"
                >
                  <span className="font-mono text-[9px] text-muted">
                    <span className="text-accent">N</span> — new artifact
                  </span>
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Hintbar */}
      <footer className="flex items-center gap-5 px-6 py-1.5 border-t border-[0.5px] border-border bg-surface shrink-0">
        {skillHint ? (
          <span className="font-mono text-[9px] text-accent uppercase tracking-[0.06em]">
            COPIED TO CLIPBOARD — paste into your AI, then paste the response here
          </span>
        ) : (
          hints.map(({ key, label }) => (
            <span key={key} className="font-mono text-[9px] text-muted">
              <span className="text-accent">{key}</span> {label}
            </span>
          ))
        )}
      </footer>

      {/* Artifact drawer */}
      {openArtifact && (
        <ArtifactDrawer
          artifact={openArtifact}
          onClose={() => setOpenArtifact(null)}
          onSkill={openSkillPicker}
        />
      )}

      {/* Delete confirm */}
      {deleteArtifact && (
        <ConfirmModal
          message={`Delete "${deleteArtifact.title}"? This cannot be undone.`}
          onConfirm={async () => {
            await db.artifacts.delete(deleteArtifact.id);
            setDeleteArtifact(null);
            setFocusedArtifactIdx((i) => Math.max(0, i - 1));
          }}
          onCancel={() => setDeleteArtifact(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npm run test --workspace=web
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/views/ProjectWorkspaceView.tsx
git commit -m "feat: add ProjectWorkspaceView with tasks, artifact grid, and keyboard nav"
```

---

## Task 11: `SkillPicker` Component

**Files:**
- Create: `apps/web/src/components/SkillPicker.tsx`

- [ ] **Step 1: Create `SkillPicker`**

```tsx
// apps/web/src/components/SkillPicker.tsx
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { nanoid } from "nanoid";
import { db } from "../lib/db";
import { injectContext } from "@sift/shared";
import { useSkills } from "../contexts/SkillsContext";
import type { Project, Task, Artifact } from "@sift/shared";

export interface SkillPickerProps {
  project: Project;
  tasks: Task[];
  artifacts: Artifact[];
  onClose: () => void;
  onArtifactCreated: (artifact: Artifact) => void;
}

export default function SkillPicker({
  project,
  tasks,
  artifacts,
  onClose,
  onArtifactCreated,
}: SkillPickerProps) {
  const { skills } = useSkills();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const execute = useCallback(
    async (idx: number) => {
      const skill = filtered[idx];
      if (!skill) return;

      const injected = injectContext(
        skill.userPromptTemplate,
        skill.systemPrompt,
        project,
        tasks,
        artifacts,
      );

      await navigator.clipboard.writeText(injected);

      const now = new Date();
      const artifact: Artifact = {
        id: nanoid(),
        projectId: project.id,
        title: `${skill.emoji} ${skill.name}`,
        content: "",
        createdAt: now,
        updatedAt: now,
        synced: false,
      };
      await db.artifacts.add(artifact);

      onArtifactCreated(artifact);
      onClose();
    },
    [filtered, project, tasks, artifacts, onClose, onArtifactCreated],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        void execute(selectedIdx);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, filtered.length, selectedIdx, execute]);

  return (
    <>
      <div
        className="fixed inset-0 bg-text/20 backdrop-blur-[12px]"
        style={{ zIndex: 60 }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[480px] bg-bg border border-[0.5px] border-border flex flex-col"
        style={{ zIndex: 70 }}
        role="dialog"
        aria-label="Skill picker"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[0.5px] border-border">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted shrink-0">
            SKILLS
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter skills..."
            className="flex-1 bg-transparent outline-none font-sans text-[13px] text-text placeholder:text-dim"
          />
        </div>

        {/* Skill list */}
        <div className="flex flex-col max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 font-mono text-[10px] text-muted">
              No skills yet. Add one via the avatar menu → Skills Library.
            </div>
          ) : (
            filtered.map((skill, idx) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => void execute(idx)}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`flex items-start gap-3 px-4 py-2.5 text-left transition-colors duration-100 border-b border-[0.5px] border-border/50 ${
                  idx === selectedIdx ? "bg-accent/5" : "hover:bg-surface"
                }`}
              >
                <span className="text-[14px] shrink-0">{skill.emoji}</span>
                <div>
                  <div className="font-sans text-[13px] font-medium text-text">
                    {skill.name}
                  </div>
                  {skill.description && (
                    <div className="font-mono text-[10px] text-muted mt-0.5">
                      {skill.description}
                    </div>
                  )}
                </div>
                {idx === selectedIdx && (
                  <span className="ml-auto font-mono text-[9px] text-accent uppercase tracking-[0.06em] shrink-0 self-center">
                    Enter ↵
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire skill picker into `ProjectWorkspaceView`**

In `ProjectWorkspaceView.tsx`, import `SkillPicker` and add state:

```tsx
import SkillPicker from "../components/SkillPicker";

// Add state:
const [skillPickerOpen, setSkillPickerOpen] = useState(false);
```

Replace the `openSkillPicker` callback:

```ts
const openSkillPicker = useCallback(() => {
  setSkillPickerOpen(true);
}, []);
```

Listen for the custom event from `ArtifactDrawer`:

```tsx
useEffect(() => {
  function onOpen() { setSkillPickerOpen(true); }
  window.addEventListener("sift:open-skill-picker", onOpen);
  return () => window.removeEventListener("sift:open-skill-picker", onOpen);
}, []);
```

Add `SkillPicker` to the JSX (before `ArtifactDrawer`):

```tsx
{skillPickerOpen && tasks && (
  <SkillPicker
    project={project}
    tasks={tasks}
    artifacts={artifacts}
    onClose={() => setSkillPickerOpen(false)}
    onArtifactCreated={(artifact) => {
      setSkillPickerOpen(false);
      setOpenArtifact(artifact);
      showSkillHint();
    }}
  />
)}
```

- [ ] **Step 3: Run tests**

```bash
npm run test --workspace=web
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/SkillPicker.tsx apps/web/src/views/ProjectWorkspaceView.tsx
git commit -m "feat: add SkillPicker with context injection and clipboard copy"
```

---

## Task 12: Avatar Dropdown in Topbar

**Files:**
- Modify: `apps/web/src/components/layout/Topbar.tsx`

- [ ] **Step 1: Replace the avatar sign-out button with a dropdown**

Add state and ref for dropdown. Replace the existing avatar button block:

```tsx
// Add at top of Topbar component:
const [dropdownOpen, setDropdownOpen] = useState(false);
const dropdownRef = useRef<HTMLDivElement>(null);

// Close on outside click:
useEffect(() => {
  if (!dropdownOpen) return;
  function onPointerDown(e: PointerEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setDropdownOpen(false);
    }
  }
  window.addEventListener("pointerdown", onPointerDown);
  return () => window.removeEventListener("pointerdown", onPointerDown);
}, [dropdownOpen]);

// Close on ESC:
useEffect(() => {
  if (!dropdownOpen) return;
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") setDropdownOpen(false);
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [dropdownOpen]);
```

Replace the existing avatar `<button>` with:

```tsx
{user ? (
  <div ref={dropdownRef} className="relative">
    <button
      type="button"
      onClick={() => setDropdownOpen((o) => !o)}
      className="min-w-11 min-h-11 w-11 h-11 md:min-w-7 md:min-h-7 md:w-7 md:h-7 bg-accent flex items-center justify-center text-bg text-[11px] font-mono font-medium hover:bg-accent/80 transition-colors duration-150"
      aria-label="User menu"
      aria-expanded={dropdownOpen}
    >
      {(user.email ?? "U")[0].toUpperCase()}
    </button>

    {dropdownOpen && (
      <div className="absolute right-0 top-full mt-1 w-40 bg-bg border border-[0.5px] border-border z-50 flex flex-col">
        <button
          type="button"
          onClick={() => { setDropdownOpen(false); void navigate("/skills"); }}
          className="px-3 py-2 text-left font-sans text-[13px] text-text hover:bg-surface transition-colors duration-100"
        >
          Skills Library
        </button>
        <div className="border-t border-[0.5px] border-border" />
        <button
          type="button"
          onClick={() => { setDropdownOpen(false); void signOut(); }}
          className="px-3 py-2 text-left font-sans text-[13px] text-muted hover:bg-surface hover:text-text transition-colors duration-100"
        >
          Sign out
        </button>
      </div>
    )}
  </div>
) : null}
```

Add `useState`, `useRef` imports if not already present.

- [ ] **Step 2: Run Topbar tests**

```bash
npx vitest run apps/web/src/__tests__/Topbar.test.tsx
npm run test --workspace=web
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/Topbar.tsx
git commit -m "feat: avatar button opens dropdown with Skills Library and Sign out"
```

---

## Task 13: `SkillsView` — Skills Library CRUD

**Files:**
- Create: `apps/web/src/views/SkillsView.tsx`

- [ ] **Step 1: Create `SkillsView`**

```tsx
// apps/web/src/views/SkillsView.tsx
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import { supabase } from "../lib/supabase";
import { useSkills } from "../contexts/SkillsContext";
import { EmojiPicker } from "@sift/shared";
import ConfirmModal from "../components/ConfirmModal";
import type { PromptTemplate } from "@sift/shared";

const VARIABLES = [
  "{{PROJECT_NAME}}",
  "{{PROJECT_DESCRIPTION}}",
  "{{CURRENT_TASKS}}",
  "{{PREVIOUS_ARTIFACTS}}",
];

type FormState = {
  id: string | null; // null = creating
  emoji: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
};

function emptyForm(id: string | null = null): FormState {
  return { id, emoji: "⚡", name: "", description: "", systemPrompt: "", userPromptTemplate: "" };
}

export default function SkillsView() {
  const navigate = useNavigate();
  const { skills, refetch } = useSkills();
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [form, setForm] = useState<FormState | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deleteSkill, setDeleteSkill] = useState<PromptTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const userPromptRef = useRef<HTMLTextAreaElement>(null);

  const saveForm = useCallback(async () => {
    if (!form || !supabase) return;
    if (!form.name.trim()) return;
    setSaving(true);
    const now = new Date().toISOString();
    const row = {
      id: form.id ?? nanoid(),
      name: form.name.trim(),
      emoji: form.emoji,
      description: form.description.trim(),
      system_prompt: form.systemPrompt,
      user_prompt_template: form.userPromptTemplate,
      created_at: now,
    };
    await supabase.from("prompt_templates").upsert(row, { onConflict: "id" });
    await refetch();
    setForm(null);
    setSaving(false);
  }, [form, refetch]);

  const insertVariable = useCallback((variable: string) => {
    const ta = userPromptRef.current;
    if (!ta || !form) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const newVal =
      ta.value.substring(0, start) + variable + ta.value.substring(end);
    setForm((f) => f ? { ...f, userPromptTemplate: newVal } : f);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + variable.length, start + variable.length);
    });
  }, [form]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (inInput) {
        if (e.key === "Escape") {
          setForm(null);
          setShowEmojiPicker(false);
        }
        return;
      }
      if (e.key === "Escape") {
        if (form) { setForm(null); return; }
        navigate(-1);
        return;
      }
      if (form) return;
      if (e.key === "ArrowDown") {
        setFocusedIdx((i) => Math.min(i + 1, skills.length - 1));
      } else if (e.key === "ArrowUp") {
        setFocusedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "n" || e.key === "N") {
        setForm(emptyForm(null));
      } else if (e.key === "e" || e.key === "E") {
        const skill = skills[focusedIdx];
        if (skill) {
          setForm({
            id: skill.id,
            emoji: skill.emoji,
            name: skill.name,
            description: skill.description,
            systemPrompt: skill.systemPrompt,
            userPromptTemplate: skill.userPromptTemplate,
          });
        }
      } else if (e.key === "Backspace") {
        const skill = skills[focusedIdx];
        if (skill) setDeleteSkill(skill);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, skills, focusedIdx, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Topbar */}
      <header className="flex items-center gap-3 h-12 px-6 border-b border-[0.5px] border-border bg-surface shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted border border-[0.5px] border-border px-1.5 py-0.5 hover:text-text transition-colors"
        >
          ← ESC
        </button>
        <span className="font-sans text-[15px] font-medium text-text tracking-[-0.02em]">
          Skills Library
        </span>
        <button
          type="button"
          onClick={() => setForm(emptyForm(null))}
          className="ml-auto font-mono text-[9px] uppercase tracking-[0.06em] text-accent border border-[0.5px] border-accent px-2 py-0.5 hover:bg-accent/5 transition-colors"
        >
          N — New Skill
        </button>
      </header>

      <main className="flex-1 px-8 py-6 max-w-3xl">
        {/* Skill list */}
        {skills.length === 0 && !form && (
          <p className="font-mono text-[10px] text-muted">
            No skills yet. Press N to create your first prompt template.
          </p>
        )}

        <div className="flex flex-col">
          {skills.map((skill, idx) => {
            const focused = idx === focusedIdx && !form;
            return (
              <div
                key={skill.id}
                onClick={() => setFocusedIdx(idx)}
                className={`flex items-center gap-3 py-3 border-b border-[0.5px] border-border cursor-default transition-colors duration-100 ${
                  focused ? "bg-accent/5" : ""
                }`}
              >
                <span className="text-[16px] shrink-0">{skill.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-sans text-[14px] font-medium text-text">
                    {skill.name}
                  </div>
                  {skill.description && (
                    <div className="font-mono text-[10px] text-muted mt-0.5">
                      {skill.description}
                    </div>
                  )}
                </div>
                {focused && (
                  <div className="flex gap-3">
                    {[
                      { key: "E", label: "edit" },
                      { key: "⌫", label: "delete" },
                    ].map(({ key, label }) => (
                      <span key={key} className="font-mono text-[9px] text-muted">
                        <span className="text-accent">{key}</span> {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Inline create/edit form */}
        {form && (
          <div className="mt-4 border border-[0.5px] border-accent bg-bg p-6 flex flex-col gap-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent">
              {form.id ? "EDIT SKILL" : "NEW SKILL"}
            </div>

            {/* Emoji + name row */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="text-[20px] w-9 h-9 border border-[0.5px] border-border flex items-center justify-center hover:border-accent transition-colors"
                >
                  {form.emoji}
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 mt-1 z-50">
                    <EmojiPicker
                      onSelect={(emoji) => {
                        setForm((f) => f ? { ...f, emoji } : f);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>
                )}
              </div>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : f)}
                placeholder="Skill name..."
                className="flex-1 border-b border-[0.5px] border-border bg-transparent font-sans text-[14px] text-text pb-1 outline-none placeholder:text-dim focus:border-accent transition-colors"
              />
            </div>

            {/* Description */}
            <input
              value={form.description}
              onChange={(e) => setForm((f) => f ? { ...f, description: e.target.value } : f)}
              placeholder="Short description..."
              className="border-b border-[0.5px] border-border bg-transparent font-sans text-[13px] text-text pb-1 outline-none placeholder:text-dim focus:border-accent transition-colors"
            />

            {/* System prompt */}
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted mb-1.5">
                SYSTEM PROMPT
              </div>
              <textarea
                value={form.systemPrompt}
                onChange={(e) => setForm((f) => f ? { ...f, systemPrompt: e.target.value } : f)}
                placeholder="You are an elite product strategist..."
                rows={4}
                className="w-full border border-[0.5px] border-border bg-surface font-mono text-[12px] text-text p-2 outline-none placeholder:text-dim resize-none focus:border-accent transition-colors"
              />
            </div>

            {/* User prompt template */}
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted mb-1.5">
                USER PROMPT TEMPLATE
              </div>
              <textarea
                ref={userPromptRef}
                value={form.userPromptTemplate}
                onChange={(e) => setForm((f) => f ? { ...f, userPromptTemplate: e.target.value } : f)}
                placeholder="Using the project '{{PROJECT_NAME}}'..."
                rows={6}
                className="w-full border border-[0.5px] border-border bg-surface font-mono text-[12px] text-text p-2 outline-none placeholder:text-dim resize-none focus:border-accent transition-colors"
              />
              {/* Variable inserts */}
              <div className="flex flex-wrap gap-2 mt-2">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="font-mono text-[9px] text-muted border border-[0.5px] border-border px-1.5 py-0.5 hover:border-accent hover:text-accent transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void saveForm()}
                disabled={saving || !form.name.trim()}
                className="font-mono text-[10px] uppercase tracking-[0.06em] bg-accent text-bg px-4 py-1.5 hover:bg-accent/80 disabled:opacity-40 transition-colors"
              >
                {saving ? "SAVING..." : "SAVE"}
              </button>
              <button
                type="button"
                onClick={() => { setForm(null); setShowEmojiPicker(false); }}
                className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted hover:text-text transition-colors"
              >
                ESC cancel
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Hintbar */}
      <footer className="flex items-center gap-5 px-6 py-1.5 border-t border-[0.5px] border-border bg-surface shrink-0">
        {[
          { key: "↑↓", label: "navigate" },
          { key: "N", label: "new" },
          { key: "E", label: "edit" },
          { key: "⌫", label: "delete" },
          { key: "ESC", label: "back" },
        ].map(({ key, label }) => (
          <span key={key} className="font-mono text-[9px] text-muted">
            <span className="text-accent">{key}</span> {label}
          </span>
        ))}
      </footer>

      {deleteSkill && (
        <ConfirmModal
          message={`Delete skill "${deleteSkill.name}"? This cannot be undone.`}
          onConfirm={async () => {
            if (!supabase) return;
            await supabase.from("prompt_templates").delete().eq("id", deleteSkill.id);
            await refetch();
            setDeleteSkill(null);
            setFocusedIdx((i) => Math.max(0, i - 1));
          }}
          onCancel={() => setDeleteSkill(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npm run test --workspace=web
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/views/SkillsView.tsx
git commit -m "feat: add SkillsView with CRUD for prompt templates"
```

---

## Task 14: Wire Routes in `App.tsx`

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Update `App.tsx` to register new routes and providers**

```tsx
// apps/web/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import { useAuth } from './contexts/AuthContext';
import { useSync } from './hooks/useSync';
import { SkillsProvider } from './contexts/SkillsContext';
import AppLayout from './components/layout/AppLayout';
import AuthPage from './pages/AuthPage';
import InboxView from './views/InboxView';
import TodayView from './views/TodayView';
import ProjectsView from './views/ProjectsView';
import WeekView from './views/WeekView';
import MonthView from './views/MonthView';
import ProjectWorkspaceView from './views/ProjectWorkspaceView';
import SkillsView from './views/SkillsView';

export default function App() {
  const { user } = useAuth();
  const syncStatus = useSync(user);

  return (
    <SkillsProvider>
      <Analytics />
      <SpeedInsights />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<AppLayout syncStatus={syncStatus} />}>
          <Route index element={<Navigate to="/inbox" replace />} />
          <Route path="inbox" element={<InboxView />} />
          <Route path="today" element={<TodayView />} />
          <Route path="projects" element={<ProjectsView />} />
          <Route path="week" element={<WeekView />} />
          <Route path="month" element={<MonthView />} />
        </Route>
        <Route path="/project/:id" element={<ProjectWorkspaceView />} />
        <Route path="/skills" element={<SkillsView />} />
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Routes>
    </SkillsProvider>
  );
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm run build --workspace=@sift/shared
npm run test
```

Expected: all pass.

- [ ] **Step 3: Start dev server and manually verify the golden path**

```bash
npm run dev
```

Verify:
1. Navigate to `/projects`, focus a project, press `O` → lands on `/project/:id`
2. `↑↓` navigates tasks, `Tab` switches to artifacts
3. `N` creates new artifact card with inline title input
4. `Space` on artifact card → drawer slides in from right with accent border
5. Click inside drawer content → enters EDIT mode (textarea appears)
6. Type some markdown, pause 1s → `[ SAVED ]` status updates
7. `ESC` from textarea → returns to VIEW mode (rendered markdown)
8. `ESC` from VIEW → closes drawer
9. `S` → skill picker opens (empty state if no skills)
10. Navigate to `/skills` via avatar dropdown → Skills Library opens
11. `N` → inline form expands with emoji picker, text fields, variable buttons
12. Save a skill, then `S` in workspace → skill appears in picker
13. Execute skill → clipboard copy + new empty artifact opens in drawer
14. Sign out via avatar dropdown → redirects to auth

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat: register /project/:id and /skills routes, wrap app in SkillsProvider"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by task |
|-----------------|-----------------|
| `description` on `Project` | Task 1 |
| `Artifact` Dexie table | Task 1 |
| `PromptTemplate` type | Task 1 |
| Supabase migrations | Task 2 |
| SyncService artifacts | Task 5 |
| `injectContext` utility | Task 3 |
| `useArtifacts` with token counter | Task 4 |
| `SkillsContext` (Supabase-only fetch) | Task 6 |
| `O` key → navigate in ProjectsView | Task 7 |
| `ProjectWorkspaceView` full-page layout | Task 10 |
| Tasks section with keyboard nav | Task 10 |
| Artifact card grid | Task 10 |
| Token counter display | Task 10 (via `useArtifacts`) |
| Empty state for artifacts | Task 10 |
| `ArtifactDrawer` VIEW/EDIT | Task 9 |
| Auto-save 1000ms debounce | Task 9 |
| `[ SAVED ]` / `[ SAVING... ]` / `[ CACHED ]` | Task 9 |
| `border-[0.5px] border-accent` on drawer | Task 9 |
| Backdrop `blur(12px) + opacity-40` | Task 9 |
| `Space` to open drawer | Task 10 |
| `E` to enter edit in drawer | Task 9 |
| `ESC` from edit → VIEW, ESC from VIEW → close | Task 9 |
| `S` key skill picker | Task 10 + 11 |
| Context injection + clipboard | Task 11 |
| New artifact created + opened on skill execute | Task 11 |
| 4s hintbar confirmation message | Task 10 |
| Avatar dropdown | Task 12 |
| `/skills` route | Task 13 |
| Skills list with keyboard nav | Task 13 |
| Create/edit inline form | Task 13 |
| EmojiPicker in skills form | Task 13 |
| Variable hint bar with clickable inserts | Task 13 |
| `ConfirmModal` for delete | Tasks 10, 13 |
| `react-markdown` for VIEW mode | Tasks 8, 9 |

No gaps found.
