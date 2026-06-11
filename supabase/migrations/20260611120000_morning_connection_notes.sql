-- Morning formula: worship, thanksgiving, scripture, prayer, daily assignment.

ALTER TABLE public.living_hope_reviews
  ADD COLUMN IF NOT EXISTS connection_notes jsonb NOT NULL DEFAULT '{}'::jsonb;
