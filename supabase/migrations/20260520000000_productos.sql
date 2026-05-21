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
