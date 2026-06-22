ALTER TABLE public.journal_videos ADD COLUMN IF NOT EXISTS transcript text;
ALTER TABLE public.journal_videos ADD COLUMN IF NOT EXISTS anchor_offset integer NOT NULL DEFAULT 0;
