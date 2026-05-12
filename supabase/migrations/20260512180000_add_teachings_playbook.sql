-- Teachings extracted from artifacts + user review status; playbook items are generated plans.

create table if not exists public.teachings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid null references public.artifacts(id) on delete cascade,
  title text not null,
  summary text null,
  category text not null check (category in (
    'practice','principle','warning','identity','prayer','discipline','strategy','question'
  )),
  scriptures text[] not null default '{}',
  source_snippet text null,
  confidence numeric(3,2) null,
  status text not null default 'proposed' check (status in ('proposed','accepted','deferred','rejected')),
  notes text null,
  decided_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teachings_user_status_idx on public.teachings (user_id, status, updated_at desc);
create index if not exists teachings_artifact_idx on public.teachings (artifact_id, created_at);

create table if not exists public.playbook_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  teaching_id uuid not null references public.teachings(id) on delete cascade,
  title text not null,
  why text null,
  steps jsonb not null default '[]'::jsonb,
  watch_outs text[] not null default '{}',
  scriptures text[] not null default '{}',
  related_belief_ids uuid[] not null default '{}',
  status text not null default 'active' check (status in ('active','paused','complete','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists playbook_items_one_per_teaching on public.playbook_items (teaching_id);
create index if not exists playbook_items_user_status_idx on public.playbook_items (user_id, status, updated_at desc);

alter table public.teachings enable row level security;
alter table public.playbook_items enable row level security;

create policy "teachings_select_own" on public.teachings for select to authenticated using (user_id = auth.uid());
create policy "teachings_insert_own" on public.teachings for insert to authenticated with check (user_id = auth.uid());
create policy "teachings_update_own" on public.teachings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "teachings_delete_own" on public.teachings for delete to authenticated using (user_id = auth.uid());

create policy "playbook_items_select_own" on public.playbook_items for select to authenticated using (user_id = auth.uid());
create policy "playbook_items_insert_own" on public.playbook_items for insert to authenticated with check (user_id = auth.uid());
create policy "playbook_items_update_own" on public.playbook_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "playbook_items_delete_own" on public.playbook_items for delete to authenticated using (user_id = auth.uid());

create trigger trg_teachings_updated
  before update on public.teachings
  for each row execute function public.update_updated_at_column();

create trigger trg_playbook_items_updated
  before update on public.playbook_items
  for each row execute function public.update_updated_at_column();
