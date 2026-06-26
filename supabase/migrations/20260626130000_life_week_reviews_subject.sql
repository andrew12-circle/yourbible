-- Per-person week reviews: self, Lilly, Caroline (same week_index space per birth date).

ALTER TABLE public.life_week_reviews
  ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT 'self';

ALTER TABLE public.life_week_reviews
  DROP CONSTRAINT IF EXISTS life_week_reviews_user_week;

ALTER TABLE public.life_week_reviews
  DROP CONSTRAINT IF EXISTS life_week_reviews_subject_check;

ALTER TABLE public.life_week_reviews
  ADD CONSTRAINT life_week_reviews_subject_check
  CHECK (subject IN ('self', 'lilly', 'caroline'));

ALTER TABLE public.life_week_reviews
  ADD CONSTRAINT life_week_reviews_user_subject_week UNIQUE (user_id, subject, week_index);

CREATE INDEX IF NOT EXISTS idx_life_week_reviews_user_subject
  ON public.life_week_reviews (user_id, subject, week_index DESC);
