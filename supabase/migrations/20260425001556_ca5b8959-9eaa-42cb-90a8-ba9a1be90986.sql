-- Add a "kind" column so a verse can be marked as either a colored
-- highlighter pass or a pen underline.
ALTER TABLE public.highlights
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'highlight';

-- Restrict to known kinds.
ALTER TABLE public.highlights
  DROP CONSTRAINT IF EXISTS highlights_kind_check;
ALTER TABLE public.highlights
  ADD CONSTRAINT highlights_kind_check
  CHECK (kind IN ('highlight', 'underline'));

-- A user can have at most one of each kind per verse.
DROP INDEX IF EXISTS uq_highlights_user_verse_kind;
CREATE UNIQUE INDEX uq_highlights_user_verse_kind
  ON public.highlights (user_id, book, chapter, verse, kind);