-- Weekly life-in-weeks closure: reflection when a new ISO week (Monday) begins.

CREATE TABLE IF NOT EXISTS public.life_week_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  week_index int NOT NULL CHECK (week_index >= 0 AND week_index < 6240),
  week_start date NOT NULL,
  reflection text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_week_reviews_user_week UNIQUE (user_id, week_index)
);

CREATE INDEX IF NOT EXISTS idx_life_week_reviews_user
  ON public.life_week_reviews (user_id, week_index DESC);

ALTER TABLE public.life_week_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "life_week_reviews_select_own" ON public.life_week_reviews;
CREATE POLICY "life_week_reviews_select_own" ON public.life_week_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "life_week_reviews_insert_own" ON public.life_week_reviews;
CREATE POLICY "life_week_reviews_insert_own" ON public.life_week_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "life_week_reviews_update_own" ON public.life_week_reviews;
CREATE POLICY "life_week_reviews_update_own" ON public.life_week_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "life_week_reviews_delete_own" ON public.life_week_reviews;
CREATE POLICY "life_week_reviews_delete_own" ON public.life_week_reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid());
