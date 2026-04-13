-- Allow tasks without a project (local-first inbox capture before @p).
alter table public.tasks alter column project_id drop not null;
