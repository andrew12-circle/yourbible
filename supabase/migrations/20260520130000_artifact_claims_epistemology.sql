-- Epistemology engine v1: layered belief decomposition per claim (AI-filled on re-analyze).
ALTER TABLE public.artifact_claims
  ADD COLUMN IF NOT EXISTS epistemology JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.artifact_claims.epistemology IS
  'AI epistemology layers: claim_types, confidence_level, hermeneutics, fruits, suggested_actions. Empty until framework-analyze.';
