-- Stable verse IDs for highlights and notes (Layer 1 semantic references).
ALTER TABLE public.highlights
  ADD COLUMN IF NOT EXISTS verse_id TEXT,
  ADD COLUMN IF NOT EXISTS bible_id TEXT;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS verse_id TEXT,
  ADD COLUMN IF NOT EXISTS bible_id TEXT;

CREATE INDEX IF NOT EXISTS highlights_verse_id_idx ON public.highlights (user_id, verse_id)
  WHERE verse_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notes_verse_id_idx ON public.notes (user_id, verse_id)
  WHERE verse_id IS NOT NULL;

COMMENT ON COLUMN public.highlights.verse_id IS 'Stable id e.g. CSB:Jhn:3:16 — offsets bind to textRevision on the edition';
COMMENT ON COLUMN public.notes.verse_id IS 'Stable id e.g. CSB:Jhn:3:16';
