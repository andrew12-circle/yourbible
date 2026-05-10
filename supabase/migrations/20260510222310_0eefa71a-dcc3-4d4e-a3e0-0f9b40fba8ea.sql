-- Voice memos bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-memos', 'voice-memos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "voice memos own read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "voice memos own insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "voice memos own delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Weekly digest runs
CREATE TABLE public.framework_digests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  range_start timestamptz NOT NULL,
  range_end timestamptz NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.framework_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.framework_digests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.framework_digests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.framework_digests FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_framework_digests_user ON public.framework_digests(user_id, created_at DESC);