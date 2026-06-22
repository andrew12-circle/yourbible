-- Journal end-to-end encryption (Day One–style): ciphertext in DB, keys only on device.
-- Server stores wrapped DEK + encrypted fields; plaintext never required at rest.

alter table public.profiles
  add column if not exists journal_e2e_enabled boolean not null default false;

comment on column public.profiles.journal_e2e_enabled is
  'When true, new journal saves encrypt title/body/summary client-side before sync.';

create table if not exists public.user_journal_crypto (
  user_id uuid primary key references auth.users (id) on delete cascade,
  salt text not null,
  wrapped_dek text not null,
  recovery_wrapped_dek text not null,
  key_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_journal_crypto enable row level security;

create policy "own select" on public.user_journal_crypto
  for select using (auth.uid() = user_id);
create policy "own insert" on public.user_journal_crypto
  for insert with check (auth.uid() = user_id);
create policy "own update" on public.user_journal_crypto
  for update using (auth.uid() = user_id);
create policy "own delete" on public.user_journal_crypto
  for delete using (auth.uid() = user_id);

create trigger trg_user_journal_crypto_updated
  before update on public.user_journal_crypto
  for each row execute function public.update_updated_at_column();

alter table public.journal_entries
  add column if not exists e2e_encrypted boolean not null default false;

comment on column public.journal_entries.e2e_encrypted is
  'When true, title/body/summary are AES-GCM ciphertext envelopes (yb:e2e:1: prefix).';

create index if not exists idx_journal_entries_e2e
  on public.journal_entries (user_id, e2e_encrypted)
  where e2e_encrypted = true;

-- Skip server embeddings for E2E entries (server cannot read plaintext).
create or replace function public.trg_enqueue_journal_embedding()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.entry_kind,'') = 'vent' then return new; end if;
  if coalesce(new.e2e_encrypted, false) = true then return new; end if;
  if (tg_op = 'INSERT')
     or new.body is distinct from old.body
     or coalesce(new.title,'')   is distinct from coalesce(old.title,'')
     or coalesce(new.summary,'') is distinct from coalesce(old.summary,'') then
    perform public.enqueue_embedding_job(new.user_id, 'journal_entries', new.id);
  end if;
  return new;
end; $$;
