-- Unified "research later" / Defer verdict on artifact claims (per user, persisted on the claim row).
ALTER TABLE public.artifact_claims
  ADD COLUMN IF NOT EXISTS deferred_at TIMESTAMPTZ;

COMMENT ON COLUMN public.artifact_claims.verdict IS
  'User verdict: keep | reject | updated | defer (research later queue)';
COMMENT ON COLUMN public.artifact_claims.deferred_at IS
  'When verdict was set to defer; used to sort the research-later queue';

CREATE INDEX IF NOT EXISTS idx_artifact_claims_user_deferred
  ON public.artifact_claims (user_id, deferred_at DESC NULLS LAST)
  WHERE verdict = 'defer';
