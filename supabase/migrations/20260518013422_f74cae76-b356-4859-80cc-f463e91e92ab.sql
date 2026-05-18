-- 1. Extension
create extension if not exists vector;

-- 2. Embedding columns (768 dims for text-embedding-004)
alter table public.belief_nodes        add column if not exists embedding vector(768);
alter table public.journal_entries     add column if not exists embedding vector(768);
alter table public.journal_entries     add column if not exists summary   text;
alter table public.artifact_claims     add column if not exists embedding vector(768);
alter table public.knowledge_entities  add column if not exists embedding vector(768);
alter table public.my_ai_messages      add column if not exists embedding vector(768);

-- 3. HNSW indexes (work on empty tables; cosine distance)
create index if not exists belief_nodes_embedding_idx
  on public.belief_nodes using hnsw (embedding vector_cosine_ops);
create index if not exists journal_entries_embedding_idx
  on public.journal_entries using hnsw (embedding vector_cosine_ops);
create index if not exists artifact_claims_embedding_idx
  on public.artifact_claims using hnsw (embedding vector_cosine_ops);
create index if not exists knowledge_entities_embedding_idx
  on public.knowledge_entities using hnsw (embedding vector_cosine_ops);
create index if not exists my_ai_messages_embedding_idx
  on public.my_ai_messages using hnsw (embedding vector_cosine_ops);

-- 4. Job queue
create table if not exists public.embedding_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  table_name  text not null,
  row_id      uuid not null,
  status      text not null default 'pending' check (status in ('pending','processing','done','error')),
  attempts    int  not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  processed_at timestamptz
);
create unique index if not exists embedding_jobs_unique_pending
  on public.embedding_jobs (table_name, row_id) where status in ('pending','processing');
create index if not exists embedding_jobs_status_created_idx
  on public.embedding_jobs (status, created_at);

alter table public.embedding_jobs enable row level security;

drop policy if exists embedding_jobs_select_own on public.embedding_jobs;
create policy embedding_jobs_select_own on public.embedding_jobs
  for select to authenticated using (user_id = auth.uid());

drop policy if exists embedding_jobs_insert_own on public.embedding_jobs;
create policy embedding_jobs_insert_own on public.embedding_jobs
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists embedding_jobs_delete_own on public.embedding_jobs;
create policy embedding_jobs_delete_own on public.embedding_jobs
  for delete to authenticated using (user_id = auth.uid());

-- 5. Enqueue helper + trigger functions
create or replace function public.enqueue_embedding_job(p_user_id uuid, p_table text, p_row_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.embedding_jobs (user_id, table_name, row_id, status)
  values (p_user_id, p_table, p_row_id, 'pending')
  on conflict (table_name, row_id) where status in ('pending','processing') do nothing;
end;
$$;

-- belief_nodes: enqueue when statement / topic / answer / notes change
create or replace function public.trg_enqueue_belief_embedding()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT')
     or new.statement is distinct from old.statement
     or new.topic     is distinct from old.topic
     or coalesce(new.answer,'') is distinct from coalesce(old.answer,'')
     or coalesce(new.notes,'')  is distinct from coalesce(old.notes,'') then
    perform public.enqueue_embedding_job(new.user_id, 'belief_nodes', new.id);
  end if;
  return new;
end; $$;
drop trigger if exists belief_nodes_embedding_enqueue on public.belief_nodes;
create trigger belief_nodes_embedding_enqueue
  after insert or update on public.belief_nodes
  for each row execute function public.trg_enqueue_belief_embedding();

-- journal_entries: enqueue on text/title/summary change, skip vents
create or replace function public.trg_enqueue_journal_embedding()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.entry_kind,'') = 'vent' then return new; end if;
  if (tg_op = 'INSERT')
     or new.body is distinct from old.body
     or coalesce(new.title,'')   is distinct from coalesce(old.title,'')
     or coalesce(new.summary,'') is distinct from coalesce(old.summary,'') then
    perform public.enqueue_embedding_job(new.user_id, 'journal_entries', new.id);
  end if;
  return new;
end; $$;
drop trigger if exists journal_entries_embedding_enqueue on public.journal_entries;
create trigger journal_entries_embedding_enqueue
  after insert or update on public.journal_entries
  for each row execute function public.trg_enqueue_journal_embedding();

-- artifact_claims: enqueue on claim change
create or replace function public.trg_enqueue_claim_embedding()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') or new.claim is distinct from old.claim then
    perform public.enqueue_embedding_job(new.user_id, 'artifact_claims', new.id);
  end if;
  return new;
end; $$;
drop trigger if exists artifact_claims_embedding_enqueue on public.artifact_claims;
create trigger artifact_claims_embedding_enqueue
  after insert or update on public.artifact_claims
  for each row execute function public.trg_enqueue_claim_embedding();

-- knowledge_entities: enqueue on title/subtitle change
create or replace function public.trg_enqueue_entity_embedding()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT')
     or new.title is distinct from old.title
     or coalesce(new.subtitle,'') is distinct from coalesce(old.subtitle,'') then
    perform public.enqueue_embedding_job(new.user_id, 'knowledge_entities', new.id);
  end if;
  return new;
end; $$;
drop trigger if exists knowledge_entities_embedding_enqueue on public.knowledge_entities;
create trigger knowledge_entities_embedding_enqueue
  after insert or update on public.knowledge_entities
  for each row execute function public.trg_enqueue_entity_embedding();

-- my_ai_messages: enqueue assistant turns only (user turns get embedded at query time)
create or replace function public.trg_enqueue_ai_msg_embedding()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role <> 'assistant' then return new; end if;
  if (tg_op = 'INSERT') or new.content is distinct from old.content then
    perform public.enqueue_embedding_job(new.user_id, 'my_ai_messages', new.id);
  end if;
  return new;
end; $$;
drop trigger if exists my_ai_messages_embedding_enqueue on public.my_ai_messages;
create trigger my_ai_messages_embedding_enqueue
  after insert or update on public.my_ai_messages
  for each row execute function public.trg_enqueue_ai_msg_embedding();