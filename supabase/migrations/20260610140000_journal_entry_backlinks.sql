-- Allow journal entries to backlink other journal entries (Reflect-style graph edges).

ALTER TABLE public.journal_entry_links
  DROP CONSTRAINT IF EXISTS journal_entry_links_target_kind_check;

ALTER TABLE public.journal_entry_links
  ADD CONSTRAINT journal_entry_links_target_kind_check
  CHECK (
    target_kind IN (
      'verse', 'belief', 'tension', 'study', 'daily',
      'chat_thread', 'artifact', 'prompt', 'entry'
    )
  );

CREATE INDEX IF NOT EXISTS idx_jel_entry_target
  ON public.journal_entry_links (user_id, target_kind)
  WHERE target_kind = 'entry';
