ALTER TABLE public.artifacts
ADD COLUMN IF NOT EXISTS processing_token TEXT;

UPDATE public.artifacts
SET processing_token = gen_random_uuid()::text
WHERE processing_token IS NULL;
