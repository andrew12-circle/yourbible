-- Private notebook: entries must be E2E-encrypted client-side before sync.
alter table public.journals
  add column if not exists e2e_required boolean not null default false;

comment on column public.journals.e2e_required is
  'When true, entries in this journal must be saved with e2e_encrypted=true (client-side AES-GCM).';

alter table public.journals
  drop constraint if exists journals_source_kind_check;

alter table public.journals
  add constraint journals_source_kind_check
  check (source_kind in (
    'manual', 'belief_layer', 'book', 'theme', 'verse_capture', 'daily', 'chat', 'private'
  ));

create index if not exists idx_journals_e2e_required
  on public.journals (user_id)
  where e2e_required = true;
