-- Identity synthesis (Gemini) cached on the user's profile. Existing RLS policies
-- on public.profiles already allow owners to SELECT/UPDATE all columns.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_summary jsonb NULL,
  ADD COLUMN IF NOT EXISTS identity_generated_at timestamptz NULL;
