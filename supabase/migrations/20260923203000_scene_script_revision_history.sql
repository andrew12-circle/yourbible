-- Private recovery history for targeted scene-script edits; never shipped in the frontend.
create table if not exists public.living_hope_scene_script_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id text not null,
  revision_label text not null,
  before_story jsonb not null,
  after_text_hash text not null,
  created_at timestamptz not null default now(),
  unique (user_id, scene_id, revision_label)
);
alter table public.living_hope_scene_script_revisions enable row level security;
revoke all on public.living_hope_scene_script_revisions from anon, authenticated;
grant select on public.living_hope_scene_script_revisions to authenticated;
grant all on public.living_hope_scene_script_revisions to service_role;
drop policy if exists scene_script_revisions_read_own on public.living_hope_scene_script_revisions;
create policy scene_script_revisions_read_own on public.living_hope_scene_script_revisions
  for select to authenticated using ((select auth.uid()) = user_id);
