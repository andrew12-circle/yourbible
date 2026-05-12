-- knowledge_entities: one row per unique entity per user
create table if not exists public.knowledge_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('book','person','scripture','dream_vision','fear','question','project','business','system','technology')),
  title text not null,
  subtitle text null,
  metadata jsonb not null default '{}'::jsonb,
  confidence numeric(3,2) null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists knowledge_entities_user_kind_title_uniq
  on public.knowledge_entities (user_id, kind, lower(title));

create index if not exists knowledge_entities_user_kind_idx
  on public.knowledge_entities (user_id, kind, last_seen_at desc);

-- entity_mentions: every place an entity was found
create table if not exists public.entity_mentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id uuid not null references public.knowledge_entities(id) on delete cascade,
  artifact_id uuid null references public.artifacts(id) on delete cascade,
  journal_entry_id uuid null references public.journal_entries(id) on delete cascade,
  belief_id uuid null references public.belief_nodes(id) on delete set null,
  snippet text null,
  confidence numeric(3,2) null,
  created_at timestamptz not null default now()
);

create unique index if not exists entity_mentions_dedupe_artifact_uniq
  on public.entity_mentions (entity_id, artifact_id)
  where artifact_id is not null;

create unique index if not exists entity_mentions_dedupe_journal_uniq
  on public.entity_mentions (entity_id, journal_entry_id)
  where journal_entry_id is not null;

create index if not exists entity_mentions_entity_idx on public.entity_mentions (entity_id, created_at desc);
create index if not exists entity_mentions_user_idx   on public.entity_mentions (user_id, created_at desc);

-- RLS: user-scoped
alter table public.knowledge_entities enable row level security;
alter table public.entity_mentions    enable row level security;

create policy "knowledge_entities_select_own"
  on public.knowledge_entities for select to authenticated
  using (user_id = auth.uid());
create policy "knowledge_entities_insert_own"
  on public.knowledge_entities for insert to authenticated
  with check (user_id = auth.uid());
create policy "knowledge_entities_update_own"
  on public.knowledge_entities for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "knowledge_entities_delete_own"
  on public.knowledge_entities for delete to authenticated
  using (user_id = auth.uid());

create policy "entity_mentions_select_own"
  on public.entity_mentions for select to authenticated
  using (user_id = auth.uid());
create policy "entity_mentions_insert_own"
  on public.entity_mentions for insert to authenticated
  with check (user_id = auth.uid());
create policy "entity_mentions_update_own"
  on public.entity_mentions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "entity_mentions_delete_own"
  on public.entity_mentions for delete to authenticated
  using (user_id = auth.uid());

-- updated_at (repo already defines public.update_updated_at_column)
create trigger trg_knowledge_entities_updated
  before update on public.knowledge_entities
  for each row execute function public.update_updated_at_column();

-- Service-role merge helper: expression unique index is not exposed cleanly to PostgREST upsert
create or replace function public.merge_knowledge_entity(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_subtitle text,
  p_metadata jsonb,
  p_confidence numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_title text := trim(p_title);
begin
  if v_title = '' then
    raise exception 'merge_knowledge_entity: empty title';
  end if;

  insert into public.knowledge_entities (user_id, kind, title, subtitle, metadata, confidence)
  values (
    p_user_id,
    p_kind,
    v_title,
    nullif(trim(coalesce(p_subtitle, '')), ''),
    coalesce(p_metadata, '{}'::jsonb),
    p_confidence
  )
  on conflict (user_id, kind, lower(title))
  do update set
    last_seen_at = now(),
    confidence = greatest(
      coalesce(public.knowledge_entities.confidence, excluded.confidence),
      coalesce(excluded.confidence, public.knowledge_entities.confidence)
    ),
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.merge_knowledge_entity(uuid, text, text, text, jsonb, numeric) from public;
grant execute on function public.merge_knowledge_entity(uuid, text, text, text, jsonb, numeric) to service_role;
