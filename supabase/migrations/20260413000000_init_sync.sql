-- Sift / Speedy Tasks — tables for SyncService (push/pull + tasks Realtime)
-- Run in Supabase SQL Editor or via supabase db push if CLI linked.
-- Realtime add is conditional so re-runs / db push do not error if tasks is already published.

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

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'spaces'
  ) then
    alter publication supabase_realtime add table public.spaces;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'projects'
  ) then
    alter publication supabase_realtime add table public.projects;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end;
$$;
