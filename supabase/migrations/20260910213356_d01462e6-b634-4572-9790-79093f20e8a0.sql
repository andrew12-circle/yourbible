CREATE TABLE public.reader_page_ink (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  page_index INTEGER NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('left', 'right')),
  layout_fingerprint TEXT NOT NULL,
  anchor_verse INTEGER,
  strokes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book, chapter, page_index, side, layout_fingerprint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reader_page_ink TO authenticated;
GRANT ALL ON public.reader_page_ink TO service_role;
CREATE INDEX idx_reader_page_ink_user_ref ON public.reader_page_ink(user_id, book, chapter);
ALTER TABLE public.reader_page_ink ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own reader page ink" ON public.reader_page_ink FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reader page ink" ON public.reader_page_ink FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reader page ink" ON public.reader_page_ink FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reader page ink" ON public.reader_page_ink FOR DELETE USING (auth.uid() = user_id);
CREATE TABLE IF NOT EXISTS public.reading_activity (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  chapters_read integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_activity TO authenticated;
GRANT ALL ON public.reading_activity TO service_role;
ALTER TABLE public.reading_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own reading activity" ON public.reading_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reading activity" ON public.reading_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reading activity" ON public.reading_activity FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TABLE IF NOT EXISTS public.reading_plan_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  day_index integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_id, day_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_plan_progress TO authenticated;
GRANT ALL ON public.reading_plan_progress TO service_role;
ALTER TABLE public.reading_plan_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plan progress" ON public.reading_plan_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own plan progress" ON public.reading_plan_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own plan progress" ON public.reading_plan_progress FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS reading_plan_progress_user_plan_idx ON public.reading_plan_progress (user_id, plan_id);
CREATE TABLE public.artifact_claim_research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_claim_id uuid NOT NULL REFERENCES public.artifact_claims(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  pack_type text NOT NULL DEFAULT 'validation' CHECK (pack_type IN ('standard', 'validation')),
  use_web boolean NOT NULL DEFAULT false,
  pack_json jsonb NOT NULL,
  brief_summary text,
  user_question text,
  opened_at timestamptz,
  first_chat_at timestamptz,
  verdict_at timestamptz,
  verdict text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artifact_claim_research_runs TO authenticated;
GRANT ALL ON public.artifact_claim_research_runs TO service_role;
CREATE INDEX idx_claim_research_runs_claim_created ON public.artifact_claim_research_runs (artifact_claim_id, created_at DESC);
CREATE INDEX idx_claim_research_runs_user_created ON public.artifact_claim_research_runs (user_id, created_at DESC);
ALTER TABLE public.artifact_claim_research_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select claim research runs" ON public.artifact_claim_research_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert claim research runs" ON public.artifact_claim_research_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update claim research runs" ON public.artifact_claim_research_runs FOR UPDATE USING (auth.uid() = user_id);
CREATE TABLE public.claim_research_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_claim_id uuid NOT NULL REFERENCES public.artifact_claims(id) ON DELETE CASCADE,
  artifact_id uuid REFERENCES public.artifacts(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('opened', 'brief_loaded', 'brief_cached', 'message_sent', 'verdict_set', 'reflect_saved', 'full_report_opened')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_research_events TO authenticated;
GRANT ALL ON public.claim_research_events TO service_role;
CREATE INDEX idx_claim_research_events_claim_created ON public.claim_research_events (artifact_claim_id, created_at DESC);
ALTER TABLE public.claim_research_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select claim research events" ON public.claim_research_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert claim research events" ON public.claim_research_events FOR INSERT WITH CHECK (auth.uid() = user_id);
alter table public.knowledge_entities add column if not exists avatar_url text;
comment on column public.knowledge_entities.avatar_url is 'Remote avatar URL for person entities from public enrichment (not cached in Storage yet).';
create or replace function public.match_corpus_peers_for_artifact(p_artifact_id uuid, min_similarity float default 0.72, match_count int default 12)
returns table (peer_artifact_id uuid, avg_similarity float, strong_match_count bigint, compared_claim_count bigint, top_source_claim text, top_peer_claim text, top_similarity float)
language sql stable security invoker set search_path = public as $$
  with owned as (select 1 from public.artifacts a where a.id = p_artifact_id and a.user_id = auth.uid()),
  source as (select c.id, c.claim, c.embedding from public.artifact_claims c where c.artifact_id = p_artifact_id and c.user_id = auth.uid() and c.embedding is not null),
  peers as (select c.id, c.artifact_id, c.claim, c.embedding from public.artifact_claims c where c.user_id = auth.uid() and c.artifact_id <> p_artifact_id and c.embedding is not null),
  pairs as (select s.id as source_claim_id, s.claim as source_claim, p.artifact_id as peer_artifact_id, p.claim as peer_claim, 1 - (s.embedding <=> p.embedding) as similarity from source s cross join peers p),
  best_per_pair as (select distinct on (source_claim_id, peer_artifact_id) source_claim_id, source_claim, peer_artifact_id, peer_claim, similarity from pairs order by source_claim_id, peer_artifact_id, similarity desc),
  peer_agg as (select b.peer_artifact_id, avg(b.similarity)::float as avg_similarity, count(*) filter (where b.similarity >= min_similarity) as strong_match_count, count(*) as compared_claim_count from best_per_pair b group by b.peer_artifact_id),
  top_pair as (select distinct on (b.peer_artifact_id) b.peer_artifact_id, b.source_claim as top_source_claim, b.peer_claim as top_peer_claim, b.similarity::float as top_similarity from best_per_pair b order by b.peer_artifact_id, b.similarity desc)
  select p.peer_artifact_id, p.avg_similarity, p.strong_match_count, p.compared_claim_count, t.top_source_claim, t.top_peer_claim, t.top_similarity
  from peer_agg p join top_pair t on t.peer_artifact_id = p.peer_artifact_id
  where exists (select 1 from owned)
  order by p.avg_similarity desc, p.strong_match_count desc
  limit greatest(1, match_count);
$$;
create or replace function public.get_library_corpus_stats()
returns table (artifact_id uuid, title text, kind text, created_at timestamptz, claim_count bigint, agree_count bigint, disagree_count bigint, new_count bigint, peer_library_count bigint)
language sql stable security invoker set search_path = public as $$
  with ready_peers as (select count(*)::bigint as n from public.artifacts a where a.user_id = auth.uid() and a.status = 'ready')
  select a.id as artifact_id, a.title, a.kind, a.created_at, count(c.id) as claim_count,
    count(c.id) filter (where c.match_relation = 'agree') as agree_count,
    count(c.id) filter (where c.match_relation = 'disagree') as disagree_count,
    count(c.id) filter (where c.match_relation is null or c.match_relation = 'new') as new_count,
    greatest(0, (select n from ready_peers) - 1) as peer_library_count
  from public.artifacts a
  left join public.artifact_claims c on c.artifact_id = a.id and c.user_id = auth.uid()
  where a.user_id = auth.uid() and a.status = 'ready'
  group by a.id, a.title, a.kind, a.created_at
  order by a.created_at desc;
$$;
grant execute on function public.match_corpus_peers_for_artifact(uuid, float, int) to authenticated;
grant execute on function public.get_library_corpus_stats() to authenticated;
CREATE TABLE IF NOT EXISTS public.youtube_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  state text NOT NULL UNIQUE,
  return_path text NOT NULL DEFAULT '/settings',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.youtube_oauth_states TO service_role;
CREATE INDEX IF NOT EXISTS idx_youtube_oauth_states_user ON public.youtube_oauth_states (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.youtube_oauth_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  access_token text NULL,
  access_token_expires_at timestamptz NULL,
  channel_id text NULL,
  channel_title text NULL,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.youtube_oauth_connections TO service_role;
ALTER TABLE public.youtube_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_oauth_connections ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.youtube_oauth_connections IS 'YouTube OAuth refresh tokens for captions.download on the user''s own uploads.';
CREATE TABLE IF NOT EXISTS public.youtube_transcript_cache (
  video_id text PRIMARY KEY,
  raw_text text NOT NULL,
  provider text NOT NULL,
  source public.transcript_segment_source NOT NULL DEFAULT 'caption',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);
GRANT ALL ON public.youtube_transcript_cache TO service_role;
CREATE INDEX IF NOT EXISTS idx_youtube_transcript_cache_expires ON public.youtube_transcript_cache (expires_at);
ALTER TABLE public.youtube_transcript_cache ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.youtube_transcript_cache IS 'Cached YouTube caption text by video id; written by framework-fetch-transcript.';
CREATE TABLE IF NOT EXISTS public.youtube_channel_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  channel_title text NULL,
  channel_thumbnail_url text NULL,
  channel_handle text NULL,
  auto_import boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz NULL,
  last_video_published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT youtube_channel_subscriptions_user_channel UNIQUE (user_id, channel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_channel_subscriptions TO authenticated;
GRANT ALL ON public.youtube_channel_subscriptions TO service_role;
CREATE INDEX IF NOT EXISTS idx_youtube_channel_subscriptions_user ON public.youtube_channel_subscriptions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_channel_subscriptions_sync ON public.youtube_channel_subscriptions (auto_import, last_synced_at NULLS FIRST);
ALTER TABLE public.youtube_channel_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.youtube_channel_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.youtube_channel_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.youtube_channel_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.youtube_channel_subscriptions FOR DELETE USING (auth.uid() = user_id);
COMMENT ON TABLE public.youtube_channel_subscriptions IS 'Per-user YouTube channel follows; edge functions poll uploads and create youtube artifacts.';
CREATE TABLE IF NOT EXISTS public.artifact_library_seen (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts (id) ON DELETE CASCADE,
  first_opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artifact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artifact_library_seen TO authenticated;
GRANT ALL ON public.artifact_library_seen TO service_role;
CREATE INDEX IF NOT EXISTS idx_artifact_library_seen_user ON public.artifact_library_seen (user_id, first_opened_at DESC);
ALTER TABLE public.artifact_library_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.artifact_library_seen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.artifact_library_seen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.artifact_library_seen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.artifact_library_seen FOR DELETE USING (auth.uid() = user_id);
CREATE TABLE public.framework_hard_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  framing text,
  why_it_matters text,
  current_thinking text,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'researching', 'concluded', 'parked')),
  conclusion text,
  confidence numeric(3, 2),
  layer text CHECK (layer IS NULL OR layer IN ('foundations', 'life', 'mechanics', 'emotional')),
  tags text[] NOT NULL DEFAULT '{}'::text[],
  scripture_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_belief_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  seed_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.framework_hard_questions TO authenticated;
GRANT ALL ON public.framework_hard_questions TO service_role;
CREATE INDEX idx_framework_hard_questions_user_status ON public.framework_hard_questions (user_id, status, updated_at DESC);
CREATE UNIQUE INDEX idx_framework_hard_questions_user_seed ON public.framework_hard_questions (user_id, seed_key) WHERE seed_key IS NOT NULL;
CREATE TABLE public.hard_question_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hard_question_id uuid NOT NULL REFERENCES public.framework_hard_questions(id) ON DELETE CASCADE,
  artifact_id uuid REFERENCES public.artifacts(id) ON DELETE SET NULL,
  url text,
  label text NOT NULL,
  snippet text,
  kind text NOT NULL DEFAULT 'note' CHECK (kind IN ('artifact', 'link', 'note', 'voice')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hard_question_sources TO authenticated;
GRANT ALL ON public.hard_question_sources TO service_role;
CREATE INDEX idx_hard_question_sources_question ON public.hard_question_sources (hard_question_id, created_at DESC);
CREATE TABLE public.hard_question_research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hard_question_id uuid NOT NULL REFERENCES public.framework_hard_questions(id) ON DELETE CASCADE,
  pack_type text NOT NULL DEFAULT 'standard' CHECK (pack_type IN ('standard', 'validation')),
  use_web boolean NOT NULL DEFAULT false,
  pack_json jsonb NOT NULL,
  brief_summary text,
  user_question text,
  opened_at timestamptz,
  first_chat_at timestamptz,
  verdict_at timestamptz,
  verdict text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hard_question_research_runs TO authenticated;
GRANT ALL ON public.hard_question_research_runs TO service_role;
CREATE INDEX idx_hard_question_research_runs_question_created ON public.hard_question_research_runs (hard_question_id, created_at DESC);
CREATE INDEX idx_hard_question_research_runs_user_created ON public.hard_question_research_runs (user_id, created_at DESC);
ALTER TABLE public.framework_hard_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hard_question_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hard_question_research_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "framework_hard_questions_select_own" ON public.framework_hard_questions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "framework_hard_questions_insert_own" ON public.framework_hard_questions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "framework_hard_questions_update_own" ON public.framework_hard_questions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "framework_hard_questions_delete_own" ON public.framework_hard_questions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hard_question_sources_select_own" ON public.hard_question_sources FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hard_question_sources_insert_own" ON public.hard_question_sources FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "hard_question_sources_update_own" ON public.hard_question_sources FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "hard_question_sources_delete_own" ON public.hard_question_sources FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hard_question_research_runs_select_own" ON public.hard_question_research_runs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hard_question_research_runs_insert_own" ON public.hard_question_research_runs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "hard_question_research_runs_update_own" ON public.hard_question_research_runs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_framework_hard_questions_updated BEFORE UPDATE ON public.framework_hard_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();