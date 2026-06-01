-- Reader page freehand ink (normalized stroke JSON per page + layout fingerprint)
CREATE TABLE public.reader_page_ink (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  page_index INTEGER NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('left', 'right')),
  layout_fingerprint TEXT NOT NULL,
  anchor_verse INTEGER,
  strokes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book, chapter, page_index, side, layout_fingerprint)
);

CREATE INDEX idx_reader_page_ink_user_ref
  ON public.reader_page_ink(user_id, book, chapter);

ALTER TABLE public.reader_page_ink ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reader page ink" ON public.reader_page_ink
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reader page ink" ON public.reader_page_ink
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reader page ink" ON public.reader_page_ink
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reader page ink" ON public.reader_page_ink
  FOR DELETE USING (auth.uid() = user_id);
