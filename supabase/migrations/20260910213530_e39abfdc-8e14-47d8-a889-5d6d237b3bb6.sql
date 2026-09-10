CREATE TABLE IF NOT EXISTS public.living_hope_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Letter to myself in 2 years',
  timeframe_years smallint NOT NULL DEFAULT 2 CHECK (timeframe_years >= 1 AND timeframe_years <= 10),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sealed', 'opened')),
  mission_statement text,
  gratitude text,
  realizations text,
  outlook text,
  wishes text,
  scripture_anchor text,
  surrender_prayer text,
  sealed_at timestamptz NULL,
  unlock_at timestamptz NULL,
  opened_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.living_hope_letters TO authenticated;
GRANT ALL ON public.living_hope_letters TO service_role;
CREATE INDEX IF NOT EXISTS idx_living_hope_letters_user ON public.living_hope_letters (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.living_hope_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  letter_id uuid NULL REFERENCES public.living_hope_letters (id) ON DELETE SET NULL,
  parent_goal_id uuid NULL REFERENCES public.living_hope_goals (id) ON DELETE CASCADE,
  title text NOT NULL,
  domain text NOT NULL DEFAULT 'others' CHECK (domain IN ('god', 'health', 'family', 'work', 'others')),
  vivid_detail text,
  target_metric text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  scripture_refs text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'released')),
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.living_hope_goals TO authenticated;
GRANT ALL ON public.living_hope_goals TO service_role;
CREATE INDEX IF NOT EXISTS idx_living_hope_goals_user ON public.living_hope_goals (user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_living_hope_goals_letter ON public.living_hope_goals (letter_id) WHERE letter_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.living_hope_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  review_date date NOT NULL,
  surrender_note text,
  goal_touches jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT living_hope_reviews_user_day UNIQUE (user_id, review_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.living_hope_reviews TO authenticated;
GRANT ALL ON public.living_hope_reviews TO service_role;
CREATE INDEX IF NOT EXISTS idx_living_hope_reviews_user_date ON public.living_hope_reviews (user_id, review_date DESC);
DROP TRIGGER IF EXISTS trg_living_hope_letters_updated ON public.living_hope_letters;
CREATE TRIGGER trg_living_hope_letters_updated BEFORE UPDATE ON public.living_hope_letters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_living_hope_goals_updated ON public.living_hope_goals;
CREATE TRIGGER trg_living_hope_goals_updated BEFORE UPDATE ON public.living_hope_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.living_hope_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_hope_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_hope_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "living_hope_letters_select_own" ON public.living_hope_letters;
CREATE POLICY "living_hope_letters_select_own" ON public.living_hope_letters FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_letters_insert_own" ON public.living_hope_letters;
CREATE POLICY "living_hope_letters_insert_own" ON public.living_hope_letters FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_letters_update_own" ON public.living_hope_letters;
CREATE POLICY "living_hope_letters_update_own" ON public.living_hope_letters FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_letters_delete_own" ON public.living_hope_letters;
CREATE POLICY "living_hope_letters_delete_own" ON public.living_hope_letters FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_goals_select_own" ON public.living_hope_goals;
CREATE POLICY "living_hope_goals_select_own" ON public.living_hope_goals FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_goals_insert_own" ON public.living_hope_goals;
CREATE POLICY "living_hope_goals_insert_own" ON public.living_hope_goals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_goals_update_own" ON public.living_hope_goals;
CREATE POLICY "living_hope_goals_update_own" ON public.living_hope_goals FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_goals_delete_own" ON public.living_hope_goals;
CREATE POLICY "living_hope_goals_delete_own" ON public.living_hope_goals FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_reviews_select_own" ON public.living_hope_reviews;
CREATE POLICY "living_hope_reviews_select_own" ON public.living_hope_reviews FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_reviews_insert_own" ON public.living_hope_reviews;
CREATE POLICY "living_hope_reviews_insert_own" ON public.living_hope_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_reviews_update_own" ON public.living_hope_reviews;
CREATE POLICY "living_hope_reviews_update_own" ON public.living_hope_reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_reviews_delete_own" ON public.living_hope_reviews;
CREATE POLICY "living_hope_reviews_delete_own" ON public.living_hope_reviews FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.living_hope_letters ADD COLUMN IF NOT EXISTS full_letter text;
ALTER TABLE public.living_hope_reviews ADD COLUMN IF NOT EXISTS vision_recall text, ADD COLUMN IF NOT EXISTS story_index smallint, ADD COLUMN IF NOT EXISTS manifesto_index smallint, ADD COLUMN IF NOT EXISTS routine_checks jsonb NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN IF NOT EXISTS metric_values jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS public.living_hope_workbook (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.living_hope_workbook TO authenticated;
GRANT ALL ON public.living_hope_workbook TO service_role;
CREATE TABLE IF NOT EXISTS public.living_hope_weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  week_start date NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT living_hope_weekly_reviews_user_week UNIQUE (user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.living_hope_weekly_reviews TO authenticated;
GRANT ALL ON public.living_hope_weekly_reviews TO service_role;
CREATE INDEX IF NOT EXISTS idx_living_hope_weekly_reviews_user ON public.living_hope_weekly_reviews (user_id, week_start DESC);
DROP TRIGGER IF EXISTS trg_living_hope_workbook_updated ON public.living_hope_workbook;
CREATE TRIGGER trg_living_hope_workbook_updated BEFORE UPDATE ON public.living_hope_workbook FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.living_hope_workbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_hope_weekly_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "living_hope_workbook_select_own" ON public.living_hope_workbook;
CREATE POLICY "living_hope_workbook_select_own" ON public.living_hope_workbook FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_workbook_insert_own" ON public.living_hope_workbook;
CREATE POLICY "living_hope_workbook_insert_own" ON public.living_hope_workbook FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_workbook_update_own" ON public.living_hope_workbook;
CREATE POLICY "living_hope_workbook_update_own" ON public.living_hope_workbook FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_weekly_reviews_select_own" ON public.living_hope_weekly_reviews;
CREATE POLICY "living_hope_weekly_reviews_select_own" ON public.living_hope_weekly_reviews FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_weekly_reviews_insert_own" ON public.living_hope_weekly_reviews;
CREATE POLICY "living_hope_weekly_reviews_insert_own" ON public.living_hope_weekly_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_weekly_reviews_update_own" ON public.living_hope_weekly_reviews;
CREATE POLICY "living_hope_weekly_reviews_update_own" ON public.living_hope_weekly_reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "living_hope_weekly_reviews_delete_own" ON public.living_hope_weekly_reviews;
CREATE POLICY "living_hope_weekly_reviews_delete_own" ON public.living_hope_weekly_reviews FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.journal_entry_links DROP CONSTRAINT IF EXISTS journal_entry_links_target_kind_check;
ALTER TABLE public.journal_entry_links ADD CONSTRAINT journal_entry_links_target_kind_check CHECK (target_kind IN ('verse', 'belief', 'tension', 'study', 'daily', 'chat_thread', 'artifact', 'prompt', 'entry', 'entity'));
CREATE INDEX IF NOT EXISTS idx_jel_entry_target ON public.journal_entry_links (user_id, target_kind) WHERE target_kind = 'entry';
ALTER TABLE public.living_hope_reviews ADD COLUMN IF NOT EXISTS connection_notes jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS public.my_ai_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_ai_projects TO authenticated;
GRANT ALL ON public.my_ai_projects TO service_role;
ALTER TABLE public.my_ai_chats ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.my_ai_projects (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS my_ai_projects_user_sort_idx ON public.my_ai_projects (user_id, sort_order);
CREATE INDEX IF NOT EXISTS my_ai_chats_project_idx ON public.my_ai_chats (user_id, project_id, updated_at DESC) WHERE project_id IS NOT NULL;
DROP TRIGGER IF EXISTS update_my_ai_projects_updated_at ON public.my_ai_projects;
CREATE TRIGGER update_my_ai_projects_updated_at BEFORE UPDATE ON public.my_ai_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.my_ai_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "my_ai_projects_select_own" ON public.my_ai_projects;
CREATE POLICY "my_ai_projects_select_own" ON public.my_ai_projects FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "my_ai_projects_insert_own" ON public.my_ai_projects;
CREATE POLICY "my_ai_projects_insert_own" ON public.my_ai_projects FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "my_ai_projects_update_own" ON public.my_ai_projects;
CREATE POLICY "my_ai_projects_update_own" ON public.my_ai_projects FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "my_ai_projects_delete_own" ON public.my_ai_projects;
CREATE POLICY "my_ai_projects_delete_own" ON public.my_ai_projects FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TABLE public.questions_for_god (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  context text,
  notes text NOT NULL DEFAULT '',
  insight text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'insight', 'released', 'unknown')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions_for_god TO authenticated;
GRANT ALL ON public.questions_for_god TO service_role;
CREATE INDEX idx_questions_for_god_user_status ON public.questions_for_god (user_id, status, updated_at DESC);
ALTER TABLE public.questions_for_god ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_for_god_select_own" ON public.questions_for_god FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "questions_for_god_insert_own" ON public.questions_for_god FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "questions_for_god_update_own" ON public.questions_for_god FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "questions_for_god_delete_own" ON public.questions_for_god FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER trg_questions_for_god_updated BEFORE UPDATE ON public.questions_for_god FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.living_hope_reviews ADD COLUMN IF NOT EXISTS journal_entry_id uuid NULL REFERENCES public.journal_entries (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_living_hope_reviews_journal_entry ON public.living_hope_reviews (journal_entry_id) WHERE journal_entry_id IS NOT NULL;
alter table public.journals drop constraint if exists journals_source_kind_check;
alter table public.journals add constraint journals_source_kind_check check (source_kind in ('manual', 'belief_layer', 'book', 'theme', 'verse_capture', 'daily', 'chat', 'private', 'notes'));
CREATE TABLE public.journal_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  duration_ms integer,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_videos TO authenticated;
GRANT ALL ON public.journal_videos TO service_role;
CREATE INDEX idx_journal_videos_entry ON public.journal_videos (entry_id);
ALTER TABLE public.journal_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.journal_videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.journal_videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.journal_videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.journal_videos FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "journal-videos own select" ON storage.objects FOR SELECT USING (bucket_id = 'journal-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "journal-videos own insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'journal-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "journal-videos own update" ON storage.objects FOR UPDATE USING (bucket_id = 'journal-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "journal-videos own delete" ON storage.objects FOR DELETE USING (bucket_id = 'journal-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
ALTER TABLE public.journal_videos ADD COLUMN IF NOT EXISTS transcript text;
ALTER TABLE public.journal_videos ADD COLUMN IF NOT EXISTS anchor_offset integer NOT NULL DEFAULT 0;
ALTER TABLE public.todo_lists ADD COLUMN IF NOT EXISTS kind text CHECK (kind IS NULL OR kind IN ('work', 'personal'));
CREATE OR REPLACE FUNCTION public.ensure_default_todo_lists()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.todo_lists tl WHERE tl.user_id = v_uid AND tl.slug = 'inbox') THEN
    INSERT INTO public.todo_lists (user_id, name, slug, sort_order, color, kind) VALUES (v_uid, 'Inbox', 'inbox', 0, 'zinc-500', NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.todo_lists tl WHERE tl.user_id = v_uid AND tl.slug = 'work') THEN
    INSERT INTO public.todo_lists (user_id, name, slug, sort_order, color, kind) VALUES (v_uid, 'Work', 'work', 1, 'blue-500', 'work');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.todo_lists tl WHERE tl.user_id = v_uid AND tl.slug = 'personal') THEN
    INSERT INTO public.todo_lists (user_id, name, slug, sort_order, color, kind) VALUES (v_uid, 'Personal', 'personal', 2, 'emerald-500', 'personal');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.todo_lists tl WHERE tl.user_id = v_uid AND tl.slug = 'home') THEN
    INSERT INTO public.todo_lists (user_id, name, slug, sort_order, color, kind) VALUES (v_uid, 'Home & Projects', 'home', 3, 'amber-600', NULL);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_default_todo_lists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_todo_lists() TO authenticated;
ALTER TABLE public.todo_items
  ADD COLUMN IF NOT EXISTS task_type text CHECK (task_type IS NULL OR task_type IN ('work', 'educational', 'familiar', 'financial', 'friends', 'health', 'home', 'laboral', 'meeting', 'personal')),
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'done', 'cancelled')),
  ADD COLUMN IF NOT EXISTS pinned_for_date date;
UPDATE public.todo_items SET end_date = due_date WHERE end_date IS NULL AND due_date IS NOT NULL;
UPDATE public.todo_items SET status = 'done' WHERE done = true AND status = 'not_started';
CREATE INDEX IF NOT EXISTS idx_todo_items_user_end_date ON public.todo_items (user_id, end_date) WHERE done = false AND end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todo_items_user_pinned ON public.todo_items (user_id, pinned_for_date) WHERE pinned_for_date IS NOT NULL;