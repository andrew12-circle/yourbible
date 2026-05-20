-- Transcript segments + semantic chunks for artifact memory/search

create type public.transcript_segment_source as enum (
  'caption',
  'third_party',
  'deepgram',
  'gemini',
  'paste'
);

create table if not exists public.artifact_transcript_segments (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seq int not null,
  start_seconds int not null default 0,
  end_seconds int,
  text text not null,
  speaker text,
  confidence real,
  source public.transcript_segment_source not null default 'caption',
  created_at timestamptz not null default now()
);

create index if not exists artifact_transcript_segments_artifact_seq_idx
  on public.artifact_transcript_segments (artifact_id, seq);

create table if not exists public.artifact_transcript_chunks (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_seconds int not null default 0,
  end_seconds int,
  text text not null,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists artifact_transcript_chunks_artifact_idx
  on public.artifact_transcript_chunks (artifact_id);

create index if not exists artifact_transcript_chunks_embedding_idx
  on public.artifact_transcript_chunks using hnsw (embedding vector_cosine_ops);

alter table public.artifact_transcript_segments enable row level security;
alter table public.artifact_transcript_chunks enable row level security;

create policy artifact_transcript_segments_select_own on public.artifact_transcript_segments
  for select using (user_id = auth.uid());

create policy artifact_transcript_chunks_select_own on public.artifact_transcript_chunks
  for select using (user_id = auth.uid());

-- Service role / edge functions insert via service role (bypasses RLS)

create or replace function public.match_artifact_transcript(
  query_embedding vector(768),
  match_count int default 8,
  filter_artifact_id uuid default null
)
returns table (
  id uuid,
  artifact_id uuid,
  start_seconds int,
  end_seconds int,
  text text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select c.id, c.artifact_id, c.start_seconds, c.end_seconds, c.text, c.metadata,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.artifact_transcript_chunks c
  where c.user_id = auth.uid()
    and c.embedding is not null
    and (filter_artifact_id is null or c.artifact_id = filter_artifact_id)
  order by c.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

grant execute on function public.match_artifact_transcript(vector, int, uuid) to authenticated;

create or replace function public.trg_enqueue_transcript_chunk_embedding()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') or new.text is distinct from old.text then
    perform public.enqueue_embedding_job(new.user_id, 'artifact_transcript_chunks', new.id);
  end if;
  return new;
end; $$;

drop trigger if exists artifact_transcript_chunks_embedding_enqueue on public.artifact_transcript_chunks;
create trigger artifact_transcript_chunks_embedding_enqueue
  after insert or update on public.artifact_transcript_chunks
  for each row execute function public.trg_enqueue_transcript_chunk_embedding();
