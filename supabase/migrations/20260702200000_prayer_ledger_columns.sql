-- George Müller provision ledger: amounts, deadline, purpose.

ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS amount_requested numeric(12, 2),
  ADD COLUMN IF NOT EXISTS amount_provided numeric(12, 2),
  ADD COLUMN IF NOT EXISTS deadline date;

CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_deadline
  ON public.prayer_requests (user_id, deadline)
  WHERE deadline IS NOT NULL;
