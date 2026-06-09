-- YouTube channel subscriptions: auto-import new uploads into the artifact library.

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

CREATE INDEX IF NOT EXISTS idx_youtube_channel_subscriptions_user
  ON public.youtube_channel_subscriptions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_channel_subscriptions_sync
  ON public.youtube_channel_subscriptions (auto_import, last_synced_at NULLS FIRST);

ALTER TABLE public.youtube_channel_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.youtube_channel_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own insert" ON public.youtube_channel_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own update" ON public.youtube_channel_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "own delete" ON public.youtube_channel_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.youtube_channel_subscriptions IS
  'Per-user YouTube channel follows; edge functions poll uploads and create youtube artifacts.';

-- Tracks when a user first opened an artifact (clears subscription "unwatched" state).
CREATE TABLE IF NOT EXISTS public.artifact_library_seen (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts (id) ON DELETE CASCADE,
  first_opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artifact_id)
);

CREATE INDEX IF NOT EXISTS idx_artifact_library_seen_user
  ON public.artifact_library_seen (user_id, first_opened_at DESC);

ALTER TABLE public.artifact_library_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.artifact_library_seen
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own insert" ON public.artifact_library_seen
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own update" ON public.artifact_library_seen
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "own delete" ON public.artifact_library_seen
  FOR DELETE USING (auth.uid() = user_id);
