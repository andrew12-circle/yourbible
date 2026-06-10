-- Living Hope: future-self letter, fractal goals, and morning reviews (RLS owner-only).

-- ---------------------------------------------------------------------------
-- Future letter to self (Reflect-style, faith-grounded GROW sections)
-- ---------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_living_hope_letters_user
  ON public.living_hope_letters (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Goals attached to a letter (fractal: parent_goal_id for sub-steps)
-- ---------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_living_hope_goals_user
  ON public.living_hope_goals (user_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_living_hope_goals_letter
  ON public.living_hope_goals (letter_id)
  WHERE letter_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Daily morning review sessions
-- ---------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_living_hope_reviews_user_date
  ON public.living_hope_reviews (user_id, review_date DESC);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_living_hope_letters_updated ON public.living_hope_letters;
CREATE TRIGGER trg_living_hope_letters_updated
  BEFORE UPDATE ON public.living_hope_letters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_living_hope_goals_updated ON public.living_hope_goals;
CREATE TRIGGER trg_living_hope_goals_updated
  BEFORE UPDATE ON public.living_hope_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.living_hope_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_hope_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_hope_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "living_hope_letters_select_own" ON public.living_hope_letters;
CREATE POLICY "living_hope_letters_select_own" ON public.living_hope_letters
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_letters_insert_own" ON public.living_hope_letters;
CREATE POLICY "living_hope_letters_insert_own" ON public.living_hope_letters
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_letters_update_own" ON public.living_hope_letters;
CREATE POLICY "living_hope_letters_update_own" ON public.living_hope_letters
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_letters_delete_own" ON public.living_hope_letters;
CREATE POLICY "living_hope_letters_delete_own" ON public.living_hope_letters
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_goals_select_own" ON public.living_hope_goals;
CREATE POLICY "living_hope_goals_select_own" ON public.living_hope_goals
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_goals_insert_own" ON public.living_hope_goals;
CREATE POLICY "living_hope_goals_insert_own" ON public.living_hope_goals
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_goals_update_own" ON public.living_hope_goals;
CREATE POLICY "living_hope_goals_update_own" ON public.living_hope_goals
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_goals_delete_own" ON public.living_hope_goals;
CREATE POLICY "living_hope_goals_delete_own" ON public.living_hope_goals
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_reviews_select_own" ON public.living_hope_reviews;
CREATE POLICY "living_hope_reviews_select_own" ON public.living_hope_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_reviews_insert_own" ON public.living_hope_reviews;
CREATE POLICY "living_hope_reviews_insert_own" ON public.living_hope_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_reviews_update_own" ON public.living_hope_reviews;
CREATE POLICY "living_hope_reviews_update_own" ON public.living_hope_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "living_hope_reviews_delete_own" ON public.living_hope_reviews;
CREATE POLICY "living_hope_reviews_delete_own" ON public.living_hope_reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid());
