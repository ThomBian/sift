# Supabase sign-in + production sync — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sign-in (Google + email magic link) works end-to-end, and production deployments on Vercel receive `VITE_SUPABASE_*` so the app uses Supabase for auth and `SyncService` in prod.

**Architecture:** The web app already creates a nullable Supabase client from `import.meta.env` (`apps/web/src/lib/supabase.ts`), runs auth via `AuthProvider` (`apps/web/src/contexts/AuthContext.tsx`), and syncs when `user` and `supabase` are both present (`apps/web/src/App.tsx`). Production work is primarily **Supabase project configuration** (schema, RLS, Realtime, Auth URLs, OAuth), **Vercel environment variables**, and **sanitizing repo examples** so secrets are not committed. No change to sync algorithms is required unless verification finds gaps.

**Tech stack:** Vite + `@supabase/supabase-js`, Supabase (Postgres + Auth + Realtime), Vercel (`vercel.json` builds `apps/web`).

---

## File structure (this effort)

| Path | Responsibility |
|------|----------------|
| `apps/web/.env` | Local secrets (gitignored); `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `apps/web/.env.example` | Documented placeholders only — must not contain real keys or project-specific URLs |
| `supabase/migrations/20260413000000_init_sync.sql` (new) | Versioned DDL + RLS + Realtime publication for `spaces`, `projects`, `tasks` |
| Vercel project settings | Production (+ optional Preview) env vars matching `.env` names |
| Supabase Dashboard | Auth providers, redirect URLs, Google OAuth credentials |

---

### Task 1: Sanitize `apps/web/.env.example` ✅ (repo)

**Files:**

- Modify: `apps/web/.env.example`

- [x] **Step 1: Replace real-looking values with placeholders**

Ensure the file contains only generic placeholders (no project URL, no publishable key):

```dotenv
# Supabase — Project Settings → API (use your own project, never commit real keys)
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [x] **Step 2: Commit** (`031fba3`)

```bash
git add apps/web/.env.example
git commit -m "chore(web): use placeholders in .env.example for Supabase"
```

---

### Task 2: Add versioned Supabase schema (DDL + RLS + Realtime)

**Files:**

- Create: `supabase/migrations/20260413000000_init_sync.sql`

- [x] **Step 1: Create migration file with full SQL**

`SyncService` upserts/pulls `spaces`, `projects`, `tasks` and maps columns as in `apps/web/src/services/SyncService.ts`. Pull queries filter by `updated_at` only; **RLS must restrict every row to `auth.uid() = user_id`** or data leaks across users.

Paste the following into `supabase/migrations/20260413000000_init_sync.sql`:

```sql
-- Sift / Speedy Tasks — tables for SyncService (push/pull + tasks Realtime)
-- Run in Supabase SQL Editor or via supabase db push if CLI linked.

create table if not exists public.spaces (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  synced boolean not null default true
);

create table if not exists public.projects (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text,
  space_id text not null,
  archived boolean not null default false,
  url text,
  due_date timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  synced boolean not null default true
);

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  project_id text not null,
  status text not null check (
    status in ('inbox', 'todo', 'done', 'archived')
  ),
  working_date timestamptz,
  due_date timestamptz,
  completed_at timestamptz,
  url text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  synced boolean not null default true
);

create index if not exists spaces_user_updated_idx
  on public.spaces (user_id, updated_at);
create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at);
create index if not exists tasks_user_updated_idx
  on public.tasks (user_id, updated_at);

alter table public.spaces enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- Idempotent policy drops (safe re-run in dev)
drop policy if exists "spaces_select_own" on public.spaces;
drop policy if exists "spaces_insert_own" on public.spaces;
drop policy if exists "spaces_update_own" on public.spaces;
drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;

create policy "spaces_select_own" on public.spaces
  for select using (auth.uid() = user_id);
create policy "spaces_insert_own" on public.spaces
  for insert with check (auth.uid() = user_id);
create policy "spaces_update_own" on public.spaces
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Realtime: SyncService.subscribe listens to public.tasks only
alter publication supabase_realtime add table public.tasks;
```

- [ ] **Step 2: Apply in Supabase** _(operator — run migration in your Supabase project)_

**A. Open the right project**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click the **organization** that owns your app (if you have more than one).
3. Click the **project** whose URL matches `VITE_SUPABASE_URL` in your `apps/web/.env` (e.g. if the env is `https://abcdxyzcompany.supabase.co`, pick that project — the subdomain is the project ref).

**B. Run the migration SQL**

4. In the left sidebar, open **SQL Editor**.
5. Click **New query** (empty editor).
6. On your machine, open the file  
   `supabase/migrations/20260413000000_init_sync.sql`  
   in this repo, **select all**, copy.
7. Paste into the Supabase SQL Editor.
8. Click **Run** (or use the keyboard shortcut shown in the editor, often **Ctrl/Cmd + Enter**).

**C. Confirm it worked**

9. The bottom **Results** panel should show **Success** for the script (no red error). You may see multiple statement results; the important part is no failure.
10. Optional sanity check: left sidebar **Table Editor** → you should see **`spaces`**, **`projects`**, and **`tasks`** under the `public` schema. Open `tasks` and confirm columns like `user_id`, `updated_at`, `status` exist.

**D. If the last line fails (`alter publication …`)**

Supabase may error with something like *relation "tasks" is already member of publication* or *already exists*.

- **Option 1:** In **Database → Publications** (or **Realtime** settings, depending on dashboard version), open publication **`supabase_realtime`** and ensure table **`public.tasks`** is included. If it already is, **delete** the `alter publication supabase_realtime add table public.tasks;` line from your query, run **only** the rest of the file (only needed if you ever re-run from scratch on a DB that already had that line applied).
- **Option 2:** Run everything **except** the final `alter publication` line once; then add `tasks` to the realtime publication via the **Dashboard UI** as documented in Supabase’s Realtime docs for your project version.

**E. If tables already existed from an older attempt**

`CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` are safe. **Policies** are dropped and recreated by the script. If you customized RLS manually, back up those policies before re-running this file.

- [x] **Step 3: Commit** (`3d515a5`)

```bash
git add supabase/migrations/20260413000000_init_sync.sql
git commit -m "chore(supabase): add schema, RLS, and realtime for sync tables"
```

---

### Task 3: Configure Supabase Auth (redirects + email)

**Files:** none (dashboard only)

- [x] **Step 1: Site URL and redirect allowlist** _(done)_

In **Authentication → URL Configuration**:

- **Site URL:** production origin, e.g. `https://YOUR_APP.vercel.app`
- **Redirect URLs** (add every origin the app uses after OAuth/magic link):
  - `http://localhost:5173` (or your local Vite port)
  - `http://127.0.0.1:5173` (optional, if you use it)
  - `https://YOUR_APP.vercel.app`
  - `https://YOUR_APP.vercel.app/**` if the dashboard accepts wildcards (Supabase supports wildcard patterns in many projects)
  - For **Preview** deployments: either add each `https://*-git-*.vercel.app` pattern Supabase allows, or use a stable preview domain / skip preview auth until patterns are added

`AuthContext` uses `redirectTo: window.location.origin` and `emailRedirectTo: window.location.origin`, so the **exact origin** of the running app must be allowed.

- [x] **Step 2: Enable Email provider** _(done)_

**Authentication → Providers → Email:** enable. Confirm magic-link / OTP email works (check spam; configure custom SMTP under Project Settings if needed).

- [x] **Step 3: Smoke-test magic link locally** _(done)_

1. Create `apps/web/.env` with real `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. `npm run dev` from repo root (or web workspace).
3. Open `/auth`, send magic link, complete sign-in, land on `/inbox`.

Expected: session present; network shows successful Supabase auth requests.

---

### Task 4: Google OAuth ✅ (local)

**Files:** none (Google Cloud Console + Supabase dashboard)

- [x] **Step 1: Google Cloud OAuth client** _(done)_

In [Google Cloud Console](https://console.cloud.google.com/):

1. Create OAuth 2.0 **Web application** credentials.
2. Under **Authorized redirect URIs**, add the URI Supabase shows for Google — typically  
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`  
   (copy from **Supabase → Authentication → Providers → Google**).

- [x] **Step 2: Enable Google in Supabase** _(done)_

Paste **Client ID** and **Client Secret** into Supabase Google provider settings; save.

- [x] **Step 3: Smoke-test Google sign-in** _(done — local)_

From local app `/auth`, click **Continue with Google**. Complete flow; expect redirect back to app origin with session.

If redirect fails: compare browser final URL to **Redirect URLs** list in Supabase (Task 3).

---

### Task 5: Vercel production (and optional preview) env vars

**Files:** none (Vercel dashboard or CLI)

- [ ] **Step 1: Set Production environment variables**

In the Vercel project linked to this repo:

- `VITE_SUPABASE_URL` = same as local `.env`
- `VITE_SUPABASE_ANON_KEY` = anon key (not service role)

Vite inlines `VITE_*` at **build** time; a new deployment is required after changing vars.

- [ ] **Step 2: Redeploy**

Trigger a production deployment (push to main or **Redeploy** in Vercel).

- [ ] **Step 3: Production smoke test**

1. Open production URL `/auth`.
2. Sign in (Google or magic link).
3. Create a task; in Supabase **Table Editor**, confirm a `tasks` row with `user_id` = your `auth.users.id`.

Expected: `SyncService` runs (`App.tsx` effect); no 401/403 on `spaces`/`projects`/`tasks` REST calls in DevTools.

- [ ] **Step 4 (optional): Preview deployments**

Either duplicate env vars for **Preview** in Vercel, or accept that preview builds without vars stay local-only (same as missing `.env` locally). If previews should authenticate, add each preview origin to Supabase **Redirect URLs** or use a supported wildcard.

---

### Task 6: Verification and documentation touchpoint

**Files:**

- Optional modify: `CLAUDE.md` or `GEMINI.md` — only if you add a short pointer to `supabase/migrations/` and Vercel env (keep to 2–3 lines; YAGNI)

- [x] **Step 1: Run tests** — `npx vitest run` in `apps/web`: 64 passed (including `SyncService.test.ts`). _(Root `npm run test` / `turbo test` currently has no `test` script in workspace packages; use Vitest in `apps/web` until wired.)_

```bash
npm run test
```

Expected: all packages pass (including `apps/web/src/__tests__/SyncService.test.ts` with mocked Supabase).

- [ ] **Step 2: Manual regression**

| Check | Expected |
|--------|----------|
| No `.env` | `/auth` shows disabled cloud message; app usable offline |
| Local + `.env` + sign-in | Tasks sync rows to Supabase |
| Production + env | Same as local |
| Realtime | Second tab: task change triggers refresh after remote write (tasks table only) |

- [x] **Step 3: Optional doc commit** — `CLAUDE.md` + `GEMINI.md` updated with migration + Vercel note (commit with plan in this session).

If you updated `CLAUDE.md`:

```bash
git add CLAUDE.md
git commit -m "docs: point to Supabase migration and Vercel env for prod sync"
```

---

## Spec coverage (self-review)

| Requirement | Task |
|-------------|------|
| Sign-in working (email + Google) | Tasks 3–4 |
| Supabase used in production | Tasks 2, 5 |
| No secrets in repo examples | Task 1 |
| Data isolation per user | Task 2 (RLS) |
| Realtime for tasks | Task 2 |
| Vercel build receives env | Task 5 |

**Known product gap (out of scope unless you extend the plan):** `projectToRow` in `SyncService.ts` does not send `due_date` on upsert; DB column still supports future fix. **Pull** does not filter `user_id` in SQL — RLS is mandatory.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-13-supabase-auth-prod.md`.

**1. Subagent-driven (recommended)** — fresh subagent per task, review between tasks.

**2. Inline execution** — run tasks in this session with checkpoints between tasks.

Which approach do you want?
