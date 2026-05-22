-- Per-user resume position for YouTube artifact videos (YouTube-style watch progress).
CREATE TABLE public.artifact_playback_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  playback_seconds integer NOT NULL DEFAULT 0 CHECK (playback_seconds >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artifact_id)
);

ALTER TABLE public.artifact_playback_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.artifact_playback_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own insert" ON public.artifact_playback_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own update" ON public.artifact_playback_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "own delete" ON public.artifact_playback_progress
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_artifact_playback_progress_user_updated
  ON public.artifact_playback_progress (user_id, updated_at DESC);
