-- Partial-verse highlights: character offsets within verse text.
-- NULL offsets mean the whole verse (legacy rows unchanged).
ALTER TABLE public.highlights
  ADD COLUMN IF NOT EXISTS start_offset integer,
  ADD COLUMN IF NOT EXISTS end_offset integer;

ALTER TABLE public.highlights
  DROP CONSTRAINT IF EXISTS highlights_offsets_check;
ALTER TABLE public.highlights
  ADD CONSTRAINT highlights_offsets_check
  CHECK (
    (start_offset IS NULL AND end_offset IS NULL)
    OR (
      start_offset IS NOT NULL
      AND end_offset IS NOT NULL
      AND start_offset >= 0
      AND end_offset > start_offset
    )
  );

-- At most one whole-verse mark per (user, ref, verse, kind).
DROP INDEX IF EXISTS uq_highlights_user_verse_kind;
CREATE UNIQUE INDEX uq_highlights_user_verse_kind
  ON public.highlights (user_id, book, chapter, verse, kind)
  WHERE start_offset IS NULL AND end_offset IS NULL;
