-- Allow authenticated users to delete their own rows (project delete sync + future space/task deletes)

drop policy if exists "spaces_delete_own" on public.spaces;
drop policy if exists "projects_delete_own" on public.projects;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "spaces_delete_own" on public.spaces
  for delete using (auth.uid() = user_id);

create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);
