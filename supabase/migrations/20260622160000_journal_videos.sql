-- Video journal clips (Day One–style mirror recordings with live transcription)
CREATE TABLE public.journal_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  duration_ms integer,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_videos_entry ON public.journal_videos (entry_id);

ALTER TABLE public.journal_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.journal_videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.journal_videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.journal_videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.journal_videos FOR DELETE USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('journal-videos', 'journal-videos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "journal-videos own select" ON storage.objects FOR SELECT
  USING (bucket_id = 'journal-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "journal-videos own insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'journal-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "journal-videos own update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'journal-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "journal-videos own delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'journal-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
