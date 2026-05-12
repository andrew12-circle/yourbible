CREATE TABLE public.artifact_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  start_seconds double precision NOT NULL,
  end_seconds double precision,
  kind text NOT NULL CHECK (kind IN ('bookmark', 'note', 'belief_seed')),
  body text,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artifact_moments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.artifact_moments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.artifact_moments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.artifact_moments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.artifact_moments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_artifact_moments_artifact ON public.artifact_moments(artifact_id, start_seconds);
CREATE INDEX idx_artifact_moments_user ON public.artifact_moments(user_id, created_at DESC);
