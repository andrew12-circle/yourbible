-- Repair production drift: Morning Formula already writes morning_conversation,
-- but the deployed CHECK constraint still allowed only the original five kinds.
-- Keep this narrowly scoped: no entry data, ownership policies, or encryption
-- safeguards are changed. Match src/lib/journal/entryKinds.ts.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_entry_kind_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_entry_kind_check
  CHECK (entry_kind IS NULL OR entry_kind IN (
    'dream', 'praise_report', 'testimony', 'vent', 'chat', 'listening',
    'morning_review', 'morning_conversation', 'life_week_review'
  ));

NOTIFY pgrst, 'reload schema';
