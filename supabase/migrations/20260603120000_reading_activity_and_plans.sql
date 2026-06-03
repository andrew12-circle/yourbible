-- Bible reading activity (daily streak) and curated plan progress.

CREATE TABLE IF NOT EXISTS public.reading_activity (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  chapters_read integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_date)
);

ALTER TABLE public.reading_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reading activity"
  ON public.reading_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reading activity"
  ON public.reading_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reading activity"
  ON public.reading_activity FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reading_plan_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  day_index integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_id, day_index)
);

ALTER TABLE public.reading_plan_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own plan progress"
  ON public.reading_plan_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own plan progress"
  ON public.reading_plan_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own plan progress"
  ON public.reading_plan_progress FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reading_plan_progress_user_plan_idx
  ON public.reading_plan_progress (user_id, plan_id);
