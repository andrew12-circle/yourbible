ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.artifact_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  start_seconds double precision NOT NULL,
  end_seconds double precision,
  kind text NOT NULL CHECK (kind IN ('bookmark','note','belief_seed')),
  body text,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.artifact_moments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own select" ON public.artifact_moments;
CREATE POLICY "own select" ON public.artifact_moments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own insert" ON public.artifact_moments;
CREATE POLICY "own insert" ON public.artifact_moments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own update" ON public.artifact_moments;
CREATE POLICY "own update" ON public.artifact_moments FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own delete" ON public.artifact_moments;
CREATE POLICY "own delete" ON public.artifact_moments FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_artifact_moments_artifact ON public.artifact_moments(artifact_id, start_seconds);
CREATE INDEX IF NOT EXISTS idx_artifact_moments_user ON public.artifact_moments(user_id, created_at DESC);

ALTER TABLE public.belief_sources
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_summary jsonb NULL,
  ADD COLUMN IF NOT EXISTS identity_generated_at timestamptz NULL;