-- Anchor claims to YouTube description chapters when extraction runs per-chapter.
ALTER TABLE public.artifact_claims
  ADD COLUMN IF NOT EXISTS chapter_start_seconds integer NULL;

COMMENT ON COLUMN public.artifact_claims.chapter_start_seconds IS
  'Seconds marker of the YouTube chapter this claim was extracted under; null for whole-artifact or legacy rows.';

CREATE INDEX IF NOT EXISTS idx_artifact_claims_artifact_chapter
  ON public.artifact_claims (artifact_id, chapter_start_seconds);
