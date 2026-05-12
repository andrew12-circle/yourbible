-- Journal entry kind: 'chat' — conversational journal sessions backed by my_ai_chats / my_ai_messages.
-- Storage model (Option A): my_ai_chats.journal_entry_id links the thread to one journal_entries row;
-- the entry's body is filled with a markdown transcript when the user ends the session.

ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_entry_kind_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_entry_kind_check
  CHECK (entry_kind IS NULL OR entry_kind IN ('dream', 'praise_report', 'testimony', 'vent', 'chat'));

-- Link My AI chat threads to a journal entry (nullable: ordinary My AI chats stay unlinked).
ALTER TABLE public.my_ai_chats
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS my_ai_chats_journal_entry_id_idx
  ON public.my_ai_chats (journal_entry_id)
  WHERE journal_entry_id IS NOT NULL;

-- At most one chat thread per journal entry.
CREATE UNIQUE INDEX IF NOT EXISTS my_ai_chats_one_journal_entry
  ON public.my_ai_chats (journal_entry_id)
  WHERE journal_entry_id IS NOT NULL;
