-- Apple Notes-style scratch notebook (same journal_entries table, separate notebook).

alter table public.journals
  drop constraint if exists journals_source_kind_check;

alter table public.journals
  add constraint journals_source_kind_check
  check (source_kind in (
    'manual', 'belief_layer', 'book', 'theme', 'verse_capture', 'daily', 'chat', 'private', 'notes'
  ));
