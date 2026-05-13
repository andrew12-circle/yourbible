
ALTER TABLE public.my_ai_chats ADD COLUMN IF NOT EXISTS journal_entry_id uuid;
CREATE INDEX IF NOT EXISTS my_ai_chats_journal_entry_idx ON public.my_ai_chats (journal_entry_id);
