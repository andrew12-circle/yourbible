CREATE TABLE IF NOT EXISTS public.todo_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  archived_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT todo_lists_user_slug UNIQUE (user_id, slug)
);
CREATE TABLE IF NOT EXISTS public.todo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  list_id uuid REFERENCES public.todo_lists (id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.todo_items (id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  due_date date,
  priority smallint NOT NULL DEFAULT 0 CHECK (priority >= 0 AND priority <= 3),
  sort_order int NOT NULL DEFAULT 0,
  notes text,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_lists TO authenticated;
GRANT ALL ON public.todo_lists TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_items TO authenticated;
GRANT ALL ON public.todo_items TO service_role;
CREATE INDEX IF NOT EXISTS idx_todo_lists_user_active ON public.todo_lists (user_id, sort_order) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_todo_items_user_open ON public.todo_items (user_id, done, sort_order) WHERE done = false;
CREATE INDEX IF NOT EXISTS idx_todo_items_user_list ON public.todo_items (user_id, list_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_todo_items_user_due ON public.todo_items (user_id, due_date) WHERE done = false AND due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todo_items_parent ON public.todo_items (parent_id) WHERE parent_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_todo_lists_updated ON public.todo_lists;
CREATE TRIGGER trg_todo_lists_updated BEFORE UPDATE ON public.todo_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_todo_items_updated ON public.todo_items;
CREATE TRIGGER trg_todo_items_updated BEFORE UPDATE ON public.todo_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.ensure_default_todo_lists()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.todo_lists tl WHERE tl.user_id = v_uid LIMIT 1) THEN RETURN; END IF;
  INSERT INTO public.todo_lists (user_id, name, slug, sort_order, color) VALUES (v_uid, 'Inbox', 'inbox', 0, 'zinc-500');
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_default_todo_lists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_todo_lists() TO authenticated;
ALTER TABLE public.todo_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "todo_lists_select_own" ON public.todo_lists;
CREATE POLICY "todo_lists_select_own" ON public.todo_lists FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "todo_lists_insert_own" ON public.todo_lists;
CREATE POLICY "todo_lists_insert_own" ON public.todo_lists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "todo_lists_update_own" ON public.todo_lists;
CREATE POLICY "todo_lists_update_own" ON public.todo_lists FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "todo_lists_delete_own" ON public.todo_lists;
CREATE POLICY "todo_lists_delete_own" ON public.todo_lists FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "todo_items_select_own" ON public.todo_items;
CREATE POLICY "todo_items_select_own" ON public.todo_items FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "todo_items_insert_own" ON public.todo_items;
CREATE POLICY "todo_items_insert_own" ON public.todo_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND (list_id IS NULL OR EXISTS (SELECT 1 FROM public.todo_lists l WHERE l.id = list_id AND l.user_id = auth.uid())) AND (parent_id IS NULL OR EXISTS (SELECT 1 FROM public.todo_items p WHERE p.id = parent_id AND p.user_id = auth.uid())));
DROP POLICY IF EXISTS "todo_items_update_own" ON public.todo_items;
CREATE POLICY "todo_items_update_own" ON public.todo_items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND (list_id IS NULL OR EXISTS (SELECT 1 FROM public.todo_lists l WHERE l.id = list_id AND l.user_id = auth.uid())) AND (parent_id IS NULL OR EXISTS (SELECT 1 FROM public.todo_items p WHERE p.id = parent_id AND p.user_id = auth.uid())));
DROP POLICY IF EXISTS "todo_items_delete_own" ON public.todo_items;
CREATE POLICY "todo_items_delete_own" ON public.todo_items FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.highlights ADD COLUMN IF NOT EXISTS start_offset integer, ADD COLUMN IF NOT EXISTS end_offset integer;
ALTER TABLE public.highlights DROP CONSTRAINT IF EXISTS highlights_offsets_check;
ALTER TABLE public.highlights ADD CONSTRAINT highlights_offsets_check CHECK ((start_offset IS NULL AND end_offset IS NULL) OR (start_offset IS NOT NULL AND end_offset IS NOT NULL AND start_offset >= 0 AND end_offset > start_offset));
DROP INDEX IF EXISTS uq_highlights_user_verse_kind;
CREATE UNIQUE INDEX uq_highlights_user_verse_kind ON public.highlights (user_id, book, chapter, verse, kind) WHERE start_offset IS NULL AND end_offset IS NULL;
ALTER TABLE public.artifact_claims ADD COLUMN IF NOT EXISTS deferred_at TIMESTAMPTZ;
COMMENT ON COLUMN public.artifact_claims.verdict IS 'User verdict: keep | reject | updated | defer (research later queue)';
COMMENT ON COLUMN public.artifact_claims.deferred_at IS 'When verdict was set to defer; used to sort the research-later queue';
CREATE INDEX IF NOT EXISTS idx_artifact_claims_user_deferred ON public.artifact_claims (user_id, deferred_at DESC NULLS LAST) WHERE verdict = 'defer';
ALTER TABLE public.artifact_claims ADD COLUMN IF NOT EXISTS epistemology JSONB NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.artifact_claims.epistemology IS 'AI epistemology layers: claim_types, confidence_level, hermeneutics, fruits, suggested_actions. Empty until framework-analyze.';
create type public.transcript_segment_source as enum ('caption','third_party','deepgram','gemini','paste');
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
create index if not exists artifact_transcript_segments_artifact_seq_idx on public.artifact_transcript_segments (artifact_id, seq);
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
create index if not exists artifact_transcript_chunks_artifact_idx on public.artifact_transcript_chunks (artifact_id);
create index if not exists artifact_transcript_chunks_embedding_idx on public.artifact_transcript_chunks using hnsw (embedding vector_cosine_ops);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artifact_transcript_segments TO authenticated;
GRANT ALL ON public.artifact_transcript_segments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artifact_transcript_chunks TO authenticated;
GRANT ALL ON public.artifact_transcript_chunks TO service_role;
alter table public.artifact_transcript_segments enable row level security;
alter table public.artifact_transcript_chunks enable row level security;
create policy artifact_transcript_segments_select_own on public.artifact_transcript_segments for select using (user_id = auth.uid());
create policy artifact_transcript_chunks_select_own on public.artifact_transcript_chunks for select using (user_id = auth.uid());
create or replace function public.match_artifact_transcript(query_embedding vector(768), match_count int default 8, filter_artifact_id uuid default null)
returns table (id uuid, artifact_id uuid, start_seconds int, end_seconds int, text text, metadata jsonb, similarity float)
language sql stable as $$
  select c.id, c.artifact_id, c.start_seconds, c.end_seconds, c.text, c.metadata, 1 - (c.embedding <=> query_embedding) as similarity
  from public.artifact_transcript_chunks c
  where c.user_id = auth.uid() and c.embedding is not null and (filter_artifact_id is null or c.artifact_id = filter_artifact_id)
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
create trigger artifact_transcript_chunks_embedding_enqueue after insert or update on public.artifact_transcript_chunks for each row execute function public.trg_enqueue_transcript_chunk_embedding();
CREATE TABLE public.artifact_playback_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  playback_seconds integer NOT NULL DEFAULT 0 CHECK (playback_seconds >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artifact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artifact_playback_progress TO authenticated;
GRANT ALL ON public.artifact_playback_progress TO service_role;
ALTER TABLE public.artifact_playback_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.artifact_playback_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.artifact_playback_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.artifact_playback_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.artifact_playback_progress FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_artifact_playback_progress_user_updated ON public.artifact_playback_progress (user_id, updated_at DESC);
CREATE TABLE public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  artifact_id uuid REFERENCES public.artifacts(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  chat_id uuid REFERENCES public.my_ai_chats(id) ON DELETE SET NULL,
  function_name text NOT NULL,
  operation text NOT NULL,
  provider text NOT NULL,
  model text,
  input_chars integer,
  output_chars integer,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  embedding_dims integer,
  batch_size integer NOT NULL DEFAULT 1,
  duration_ms integer,
  audio_seconds numeric(12, 2),
  status text NOT NULL CHECK (status IN ('ok', 'error', 'rate_limit', 'billing')),
  http_status integer,
  error_message text,
  estimated_usd numeric(14, 8),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select ai usage" ON public.ai_usage_events FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX idx_ai_usage_events_user_created ON public.ai_usage_events (user_id, created_at DESC);
CREATE INDEX idx_ai_usage_events_artifact ON public.ai_usage_events (artifact_id) WHERE artifact_id IS NOT NULL;
CREATE INDEX idx_ai_usage_events_function_created ON public.ai_usage_events (function_name, created_at DESC);
CREATE OR REPLACE FUNCTION public.get_ai_usage_totals(p_days integer DEFAULT 30)
RETURNS TABLE (provider text, operation text, call_count bigint, total_tokens bigint, estimated_usd numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.provider, e.operation, count(*)::bigint AS call_count, coalesce(sum(e.total_tokens), 0)::bigint AS total_tokens, coalesce(sum(e.estimated_usd), 0)::numeric AS estimated_usd
  FROM public.ai_usage_events e
  WHERE e.user_id = auth.uid() AND e.created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
  GROUP BY e.provider, e.operation ORDER BY estimated_usd DESC NULLS LAST, call_count DESC;
$$;
CREATE OR REPLACE FUNCTION public.get_ai_usage_daily(p_days integer DEFAULT 30)
RETURNS TABLE (day date, call_count bigint, total_tokens bigint, estimated_usd numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (e.created_at AT TIME ZONE 'UTC')::date AS day, count(*)::bigint AS call_count, coalesce(sum(e.total_tokens), 0)::bigint AS total_tokens, coalesce(sum(e.estimated_usd), 0)::numeric AS estimated_usd
  FROM public.ai_usage_events e
  WHERE e.user_id = auth.uid() AND e.created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
  GROUP BY (e.created_at AT TIME ZONE 'UTC')::date ORDER BY day ASC;
$$;
CREATE OR REPLACE FUNCTION public.get_ai_usage_by_function(p_days integer DEFAULT 30)
RETURNS TABLE (function_name text, call_count bigint, estimated_usd numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.function_name, count(*)::bigint AS call_count, coalesce(sum(e.estimated_usd), 0)::numeric AS estimated_usd
  FROM public.ai_usage_events e
  WHERE e.user_id = auth.uid() AND e.created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
  GROUP BY e.function_name ORDER BY estimated_usd DESC NULLS LAST, call_count DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_totals(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_daily(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_by_function(integer) TO authenticated;