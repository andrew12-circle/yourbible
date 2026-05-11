
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_at date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  entry_at_ts timestamptz NOT NULL DEFAULT now(),
  title text,
  body text NOT NULL DEFAULT '',
  mood smallint,
  weather text,
  location_name text,
  lat double precision,
  lng double precision,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  verse_ref text,
  belief_id uuid,
  analyze_for_mirror boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_journal_entries_user_date ON public.journal_entries (user_id, entry_at DESC);
CREATE INDEX idx_journal_entries_tags ON public.journal_entries USING GIN (tags);
CREATE TRIGGER trg_journal_entries_updated BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.journal_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.journal_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.journal_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.journal_photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.journal_photos FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_journal_photos_entry ON public.journal_photos (entry_id);

CREATE TABLE public.journal_entry_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL UNIQUE REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  axes jsonb NOT NULL DEFAULT '{}'::jsonb,
  themes text[] NOT NULL DEFAULT '{}'::text[],
  assumptions text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entry_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.journal_entry_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.journal_entry_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.journal_entry_scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.journal_entry_scores FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_journal_scores_user ON public.journal_entry_scores (user_id, created_at DESC);

CREATE TABLE public.journal_mirror_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  range_start timestamptz NOT NULL,
  range_end timestamptz NOT NULL,
  kind text NOT NULL DEFAULT 'on_demand',
  aggregate jsonb NOT NULL DEFAULT '{}'::jsonb,
  conflicts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_mirror_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.journal_mirror_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.journal_mirror_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.journal_mirror_reports FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_journal_mirror_user ON public.journal_mirror_reports (user_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public) VALUES ('journal-photos', 'journal-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "journal-photos own select" ON storage.objects FOR SELECT
  USING (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "journal-photos own insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "journal-photos own update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "journal-photos own delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
