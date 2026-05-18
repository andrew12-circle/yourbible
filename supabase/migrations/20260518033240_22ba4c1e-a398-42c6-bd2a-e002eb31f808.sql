-- Hybrid retrieval RPCs: cosine similarity scoped to the caller (auth.uid()).
-- All functions are SECURITY INVOKER so RLS still applies.

create or replace function public.match_beliefs(
  query_embedding vector(768),
  match_count int default 12
)
returns table (
  id uuid,
  statement text,
  topic text,
  layer text,
  confidence int,
  is_core boolean,
  updated_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select b.id, b.statement, b.topic, b.layer, b.confidence, b.is_core, b.updated_at,
         1 - (b.embedding <=> query_embedding) as similarity
  from public.belief_nodes b
  where b.user_id = auth.uid() and b.embedding is not null
  order by b.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

create or replace function public.match_journals(
  query_embedding vector(768),
  match_count int default 10,
  exclude_id uuid default null
)
returns table (
  id uuid,
  title text,
  body text,
  summary text,
  entry_at_ts timestamptz,
  similarity float
)
language sql
stable
as $$
  select j.id, j.title, j.body, j.summary, j.entry_at_ts,
         1 - (j.embedding <=> query_embedding) as similarity
  from public.journal_entries j
  where j.user_id = auth.uid()
    and j.embedding is not null
    and (j.entry_kind is null or j.entry_kind <> 'vent')
    and (exclude_id is null or j.id <> exclude_id)
  order by j.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

create or replace function public.match_artifact_claims(
  query_embedding vector(768),
  match_count int default 8
)
returns table (
  id uuid,
  artifact_id uuid,
  claim text,
  verdict text,
  created_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select c.id, c.artifact_id, c.claim, c.verdict, c.created_at,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.artifact_claims c
  where c.user_id = auth.uid() and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

create or replace function public.match_entities(
  query_embedding vector(768),
  match_count int default 8
)
returns table (
  id uuid,
  title text,
  subtitle text,
  kind text,
  last_seen_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select e.id, e.title, e.subtitle, e.kind, e.last_seen_at,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.knowledge_entities e
  where e.user_id = auth.uid() and e.embedding is not null
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

create or replace function public.match_assistant_messages(
  query_embedding vector(768),
  match_count int default 6,
  exclude_chat_id uuid default null
)
returns table (
  id uuid,
  chat_id uuid,
  content text,
  created_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select m.id, m.chat_id, m.content, m.created_at,
         1 - (m.embedding <=> query_embedding) as similarity
  from public.my_ai_messages m
  where m.user_id = auth.uid()
    and m.embedding is not null
    and m.role = 'assistant'
    and (exclude_chat_id is null or m.chat_id <> exclude_chat_id)
  order by m.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

grant execute on function public.match_beliefs(vector, int) to authenticated;
grant execute on function public.match_journals(vector, int, uuid) to authenticated;
grant execute on function public.match_artifact_claims(vector, int) to authenticated;
grant execute on function public.match_entities(vector, int) to authenticated;
grant execute on function public.match_assistant_messages(vector, int, uuid) to authenticated;