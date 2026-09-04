-- Journal stability repair: reconcile E2E schema, enforce local calendar dates,
-- add optimistic revision metadata, and tighten journal integrity without deleting content.

alter table public.profiles
  add column if not exists journal_e2e_enabled boolean not null default false;

alter table public.profiles
  add column if not exists journal_timezone text not null default 'America/Chicago';

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

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_journal_crypto' and policyname='own select') then
    create policy "own select" on public.user_journal_crypto for select using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_journal_crypto' and policyname='own insert') then
    create policy "own insert" on public.user_journal_crypto for insert with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_journal_crypto' and policyname='own update') then
    create policy "own update" on public.user_journal_crypto for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_journal_crypto' and policyname='own delete') then
    create policy "own delete" on public.user_journal_crypto for delete using ((select auth.uid()) = user_id);
  end if;
end $$;

drop trigger if exists trg_user_journal_crypto_updated on public.user_journal_crypto;
create trigger trg_user_journal_crypto_updated
  before update on public.user_journal_crypto
  for each row execute function public.update_updated_at_column();

alter table public.journal_entries
  add column if not exists e2e_encrypted boolean not null default false;

alter table public.journal_entries
  add column if not exists revision bigint not null default 0;

alter table public.journals
  add column if not exists e2e_required boolean not null default false;

alter table public.journals drop constraint if exists journals_source_kind_check;
alter table public.journals
  add constraint journals_source_kind_check
  check (source_kind in (
    'manual', 'belief_layer', 'book', 'theme', 'verse_capture', 'daily', 'chat', 'private', 'notes'
  ));

create index if not exists idx_journal_entries_e2e
  on public.journal_entries (user_id, e2e_encrypted)
  where e2e_encrypted = true;

create index if not exists idx_journals_e2e_required
  on public.journals (user_id)
  where e2e_required = true;

create unique index if not exists journals_one_default_per_user
  on public.journals (user_id)
  where is_default = true;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.journal_entries'::regclass
      and conname = 'journal_entries_journal_id_fkey'
  ) then
    alter table public.journal_entries
      add constraint journal_entries_journal_id_fkey
      foreign key (journal_id) references public.journals(id) on delete set null;
  end if;
end $$;

create or replace function public.set_journal_entry_local_date()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  tz text := 'America/Chicago';
begin
  if new.user_id is not null then
    select coalesce(nullif(p.journal_timezone, ''), 'America/Chicago')
      into tz
      from public.profiles p
      where p.id = new.user_id;
    tz := coalesce(tz, 'America/Chicago');
  end if;

  begin
    new.entry_at := (new.entry_at_ts at time zone tz)::date;
  exception when invalid_parameter_value then
    new.entry_at := (new.entry_at_ts at time zone 'America/Chicago')::date;
  end;
  return new;
end;
$$;

drop trigger if exists trg_journal_entries_local_date on public.journal_entries;
create trigger trg_journal_entries_local_date
  before insert or update of entry_at_ts, user_id
  on public.journal_entries
  for each row execute function public.set_journal_entry_local_date();

create or replace function public.bump_journal_entry_revision()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.revision := old.revision + 1;
  return new;
end;
$$;

drop trigger if exists trg_journal_entries_revision on public.journal_entries;
create trigger trg_journal_entries_revision
  before update on public.journal_entries
  for each row execute function public.bump_journal_entry_revision();

-- Recompute existing calendar dates with the current app default timezone.
-- The trigger above uses a per-profile timezone whenever profile identity is available.
update public.journal_entries
set entry_at = (entry_at_ts at time zone 'America/Chicago')::date
where entry_at is distinct from (entry_at_ts at time zone 'America/Chicago')::date;

-- Server embeddings must never inspect ciphertext.
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
