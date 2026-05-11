-- =========================================================
-- Journals (multi-journal organization)
-- =========================================================
CREATE TABLE public.journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '211 100% 50%', -- HSL components
  icon text NOT NULL DEFAULT 'book',
  cover_kind text NOT NULL DEFAULT 'color' CHECK (cover_kind IN ('color','photo')),
  cover_value text,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  source_kind text NOT NULL DEFAULT 'manual' CHECK (source_kind IN ('manual','belief_layer','book','theme','verse_capture','daily','chat')),
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_journals_user ON public.journals(user_id, sort_order);
CREATE UNIQUE INDEX idx_journals_user_source ON public.journals(user_id, source_kind, source_ref) WHERE source_kind <> 'manual';

ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.journals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.journals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.journals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.journals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_journals_updated BEFORE UPDATE ON public.journals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Journal entry links (many-to-many with anything in the app)
-- =========================================================
CREATE TABLE public.journal_entry_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  target_kind text NOT NULL CHECK (target_kind IN ('verse','belief','tension','study','daily','chat_thread','artifact','prompt')),
  target_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_jel_entry ON public.journal_entry_links(entry_id);
CREATE INDEX idx_jel_user_kind ON public.journal_entry_links(user_id, target_kind);
CREATE INDEX idx_jel_target_ref_gin ON public.journal_entry_links USING GIN (target_ref);

ALTER TABLE public.journal_entry_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.journal_entry_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.journal_entry_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.journal_entry_links FOR DELETE USING (auth.uid() = user_id);

-- =========================================================
-- Journal prompts (global library + user-added)
-- =========================================================
CREATE TABLE public.journal_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  category text NOT NULL DEFAULT 'general',
  text text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prompts_category ON public.journal_prompts(category);
CREATE INDEX idx_prompts_user ON public.journal_prompts(user_id);

ALTER TABLE public.journal_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or global" ON public.journal_prompts FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "insert own" ON public.journal_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own" ON public.journal_prompts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "delete own" ON public.journal_prompts FOR DELETE
  USING (auth.uid() = user_id);

-- =========================================================
-- Extend journal_entries
-- =========================================================
ALTER TABLE public.journal_entries
  ADD COLUMN journal_id uuid,
  ADD COLUMN pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN prompt_id uuid,
  ADD COLUMN weather_temp_c numeric,
  ADD COLUMN weather_icon text;

CREATE INDEX idx_je_journal ON public.journal_entries(journal_id, entry_at_ts DESC);
CREATE INDEX idx_je_pinned ON public.journal_entries(user_id, pinned) WHERE pinned = true;

-- =========================================================
-- Backfill: a default "Journal" per user that owns existing entries
-- =========================================================
INSERT INTO public.journals (user_id, name, color, icon, sort_order, is_default, source_kind)
SELECT DISTINCT user_id, 'Journal', '211 100% 50%', 'book', 0, true, 'manual'
FROM public.journal_entries
ON CONFLICT DO NOTHING;

-- Assign existing entries to that default journal
UPDATE public.journal_entries je
SET journal_id = j.id
FROM public.journals j
WHERE je.journal_id IS NULL
  AND j.user_id = je.user_id
  AND j.is_default = true;

-- Migrate existing verse_ref / belief_id to links
INSERT INTO public.journal_entry_links (user_id, entry_id, target_kind, target_ref)
SELECT user_id, id, 'verse', jsonb_build_object('ref', verse_ref)
FROM public.journal_entries
WHERE verse_ref IS NOT NULL;

INSERT INTO public.journal_entry_links (user_id, entry_id, target_kind, target_ref)
SELECT user_id, id, 'belief', jsonb_build_object('belief_id', belief_id::text)
FROM public.journal_entries
WHERE belief_id IS NOT NULL;

-- =========================================================
-- Seed global prompts
-- =========================================================
INSERT INTO public.journal_prompts (category, text) VALUES
  ('gratitude', 'What is one specific thing you''re thankful for today, and why does it matter?'),
  ('gratitude', 'Who made you feel seen this week?'),
  ('gratitude', 'Name three small mercies from the last 24 hours.'),
  ('lament', 'What feels heavy right now? Describe it without trying to fix it.'),
  ('lament', 'Where do you feel abandoned, and what would presence look like?'),
  ('lament', 'What loss are you still carrying that you haven''t named?'),
  ('doubt', 'What belief are you currently struggling to hold?'),
  ('doubt', 'If you could ask God one question and get an honest answer, what would it be?'),
  ('doubt', 'Where is the gap between what you say you believe and how you actually live?'),
  ('scripture', 'Which verse is preaching to you this week, and what is it saying?'),
  ('scripture', 'Pick a passage that confused you. Sit with it. What questions surface?'),
  ('scripture', 'Where do you see yourself in today''s reading — hero, villain, bystander?'),
  ('relationships', 'Who do you owe a conversation? What''s holding you back?'),
  ('relationships', 'Describe a recent conflict from the other person''s perspective.'),
  ('relationships', 'Who in your life sharpens you? Who softens you?'),
  ('vocation', 'What did your work today reveal about what you actually value?'),
  ('vocation', 'If money weren''t a factor, what would you do tomorrow?'),
  ('vocation', 'What would integrity at work look like this week?'),
  ('reflection', 'What did today teach you about yourself?'),
  ('reflection', 'What pattern keeps showing up that you''d like to interrupt?'),
  ('reflection', 'What would 90-year-old you tell present-you right now?'),
  ('reflection', 'Where did you settle for a story that isn''t actually true?'),
  ('hope', 'What are you hoping for that you''re afraid to say out loud?'),
  ('hope', 'Where is something quietly getting better?'),
  ('confession', 'What needs to be brought into the light?'),
  ('confession', 'Where did pride show up today — small or large?'),
  ('prayer', 'Write today as a letter to God. No filter.'),
  ('prayer', 'What are you avoiding praying about?'),
  ('memory', 'Describe a moment from this year you don''t want to forget.'),
  ('memory', 'What was today''s smallest joy?');
