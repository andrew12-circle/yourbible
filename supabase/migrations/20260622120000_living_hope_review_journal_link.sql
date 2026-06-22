-- Link completed morning reviews to their exported journal entry.

ALTER TABLE public.living_hope_reviews
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid NULL
  REFERENCES public.journal_entries (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_living_hope_reviews_journal_entry
  ON public.living_hope_reviews (journal_entry_id)
  WHERE journal_entry_id IS NOT NULL;
