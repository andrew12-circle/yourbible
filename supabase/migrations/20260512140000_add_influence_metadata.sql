-- Enrichment fields for belief_sources (grouped as "influences" in the UI).
ALTER TABLE public.belief_sources
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.belief_sources.metadata IS 'Optional enrichment: bio, source_url, enrichment_source, enriched_at, etc.';
COMMENT ON COLUMN public.belief_sources.avatar_url IS 'Remote avatar URL from public sources (not cached in Storage yet).';
