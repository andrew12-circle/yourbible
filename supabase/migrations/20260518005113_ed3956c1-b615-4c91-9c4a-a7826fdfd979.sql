ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_entry_kind_check;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_entry_kind_check
  CHECK (entry_kind IS NULL OR entry_kind = ANY (ARRAY['dream'::text, 'praise_report'::text, 'testimony'::text, 'vent'::text, 'chat'::text]));