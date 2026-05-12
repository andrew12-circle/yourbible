-- Adds 'vent' to the allowed values for journal_entries.entry_kind.
-- Vents are private "let it out" entries that the rest of the system
-- (mirror, My AI retrieval, main feeds) deliberately ignores.
ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_entry_kind_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_entry_kind_check
  CHECK (entry_kind IS NULL OR entry_kind IN ('dream', 'praise_report', 'testimony', 'vent'));
