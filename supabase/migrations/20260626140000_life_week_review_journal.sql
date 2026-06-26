-- Dedicated notebook + entry kind for life-in-weeks close-out reflections.

alter table public.journals
  drop constraint if exists journals_source_kind_check;

alter table public.journals
  add constraint journals_source_kind_check
  check (source_kind in (
    'manual', 'belief_layer', 'book', 'theme', 'verse_capture', 'daily', 'chat', 'private', 'notes',
    'life_week_reviews'
  ));

alter table public.journal_entries
  drop constraint if exists journal_entries_entry_kind_check;

alter table public.journal_entries
  add constraint journal_entries_entry_kind_check
  check (entry_kind is null or entry_kind in (
    'dream', 'praise_report', 'testimony', 'vent', 'chat', 'listening',
    'morning_review', 'morning_conversation', 'life_week_review'
  ));
