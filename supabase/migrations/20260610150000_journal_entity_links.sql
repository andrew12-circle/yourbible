-- Link journal entries to knowledge entities (people, topics) in the mind graph.

ALTER TABLE public.journal_entry_links
  DROP CONSTRAINT IF EXISTS journal_entry_links_target_kind_check;

ALTER TABLE public.journal_entry_links
  ADD CONSTRAINT journal_entry_links_target_kind_check
  CHECK (
    target_kind IN (
      'verse', 'belief', 'tension', 'study', 'daily',
      'chat_thread', 'artifact', 'prompt', 'entry', 'entity'
    )
  );
