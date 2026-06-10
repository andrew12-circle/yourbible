-- Living Hope workbook: vision, stories, manifesto, routines, metrics, weekly review.

ALTER TABLE public.living_hope_letters
  ADD COLUMN IF NOT EXISTS full_letter text;

ALTER TABLE public.living_hope_reviews
  ADD COLUMN IF NOT EXISTS vision_recall text,
  ADD COLUMN IF NOT EXISTS story_index smallint,
  ADD COLUMN IF NOT EXISTS manifesto_index smallint,
  ADD COLUMN IF NOT EXISTS routine_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metric_values jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.living_hope_workbook (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.living_hope_weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  week_start date NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT living_hope_weekly_reviews_user_week UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_living_hope_weekly_reviews_user
  ON public.living_hope_weekly_reviews (user_id, week_start DESC);

DROP TRIGGER IF EXISTS trg_living_hope_workbook_updated ON public.living_hope_workbook;
CREATE TRIGGER trg_living_hope_workbook_updated
  BEFORE UPDATE ON public.living_hope_workbook
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.living_hope_workbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_hope_weekly_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "living_hope_workbook_select_own" ON public.living_hope_workbook;
CREATE POLICY "living_hope_workbook_select_own" ON public.living_hope_workbook
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_workbook_insert_own" ON public.living_hope_workbook;
CREATE POLICY "living_hope_workbook_insert_own" ON public.living_hope_workbook
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_workbook_update_own" ON public.living_hope_workbook;
CREATE POLICY "living_hope_workbook_update_own" ON public.living_hope_workbook
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_weekly_reviews_select_own" ON public.living_hope_weekly_reviews;
CREATE POLICY "living_hope_weekly_reviews_select_own" ON public.living_hope_weekly_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_weekly_reviews_insert_own" ON public.living_hope_weekly_reviews;
CREATE POLICY "living_hope_weekly_reviews_insert_own" ON public.living_hope_weekly_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_weekly_reviews_update_own" ON public.living_hope_weekly_reviews;
CREATE POLICY "living_hope_weekly_reviews_update_own" ON public.living_hope_weekly_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_weekly_reviews_delete_own" ON public.living_hope_weekly_reviews;
CREATE POLICY "living_hope_weekly_reviews_delete_own" ON public.living_hope_weekly_reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid());
