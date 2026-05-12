-- Optional journal entry classification: dreams, praise reports, testimonies (faith-story entries).
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS entry_kind text;

ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_entry_kind_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_entry_kind_check
  CHECK (entry_kind IS NULL OR entry_kind IN ('dream', 'praise_report', 'testimony'));

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_entry_kind
  ON public.journal_entries (user_id, entry_kind)
  WHERE entry_kind IS NOT NULL;
