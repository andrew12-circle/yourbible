
create table if not exists public.user_cognitive_state (
  user_id uuid primary key,
  worldview_summary text not null default '',
  evolution_summary text not null default '',
  recurring_themes jsonb not null default '[]'::jsonb,
  unresolved_tensions jsonb not null default '[]'::jsonb,
  current_season text not null default '',
  voice_signature text not null default '',
  core_frameworks jsonb not null default '[]'::jsonb,
  model text,
  last_swept_at timestamptz,
  inputs_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_cognitive_state enable row level security;

create policy "ucs_select_own" on public.user_cognitive_state for select to authenticated using (user_id = auth.uid());
create policy "ucs_insert_own" on public.user_cognitive_state for insert to authenticated with check (user_id = auth.uid());
create policy "ucs_update_own" on public.user_cognitive_state for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ucs_delete_own" on public.user_cognitive_state for delete to authenticated using (user_id = auth.uid());

create trigger trg_ucs_updated_at before update on public.user_cognitive_state
for each row execute function public.update_updated_at_column();

create table if not exists public.user_cognitive_state_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists user_cognitive_state_versions_user_idx
  on public.user_cognitive_state_versions(user_id, created_at desc);

alter table public.user_cognitive_state_versions enable row level security;

create policy "ucsv_select_own" on public.user_cognitive_state_versions for select to authenticated using (user_id = auth.uid());
create policy "ucsv_insert_own" on public.user_cognitive_state_versions for insert to authenticated with check (user_id = auth.uid());
create policy "ucsv_delete_own" on public.user_cognitive_state_versions for delete to authenticated using (user_id = auth.uid());
