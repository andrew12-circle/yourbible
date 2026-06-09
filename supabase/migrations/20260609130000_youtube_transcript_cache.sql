-- Global YouTube transcript cache (by video_id). Service role only; speeds repeat adds.

CREATE TABLE IF NOT EXISTS public.youtube_transcript_cache (
  video_id text PRIMARY KEY,
  raw_text text NOT NULL,
  provider text NOT NULL,
  source public.transcript_segment_source NOT NULL DEFAULT 'caption',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);

CREATE INDEX IF NOT EXISTS idx_youtube_transcript_cache_expires
  ON public.youtube_transcript_cache (expires_at);

ALTER TABLE public.youtube_transcript_cache ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.youtube_transcript_cache IS
  'Cached YouTube caption text by video id; written by framework-fetch-transcript.';
