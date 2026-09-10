CREATE TABLE IF NOT EXISTS public.life_week_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  week_index int NOT NULL CHECK (week_index >= 0 AND week_index < 6240),
  week_start date NOT NULL,
  reflection text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_week_reviews_user_week UNIQUE (user_id, week_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_week_reviews TO authenticated;
GRANT ALL ON public.life_week_reviews TO service_role;
CREATE INDEX IF NOT EXISTS idx_life_week_reviews_user ON public.life_week_reviews (user_id, week_index DESC);
ALTER TABLE public.life_week_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "life_week_reviews_select_own" ON public.life_week_reviews;
CREATE POLICY "life_week_reviews_select_own" ON public.life_week_reviews FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "life_week_reviews_insert_own" ON public.life_week_reviews;
CREATE POLICY "life_week_reviews_insert_own" ON public.life_week_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "life_week_reviews_update_own" ON public.life_week_reviews;
CREATE POLICY "life_week_reviews_update_own" ON public.life_week_reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "life_week_reviews_delete_own" ON public.life_week_reviews;
CREATE POLICY "life_week_reviews_delete_own" ON public.life_week_reviews FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.life_week_reviews ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT 'self';
ALTER TABLE public.life_week_reviews DROP CONSTRAINT IF EXISTS life_week_reviews_user_week;
ALTER TABLE public.life_week_reviews DROP CONSTRAINT IF EXISTS life_week_reviews_subject_check;
ALTER TABLE public.life_week_reviews ADD CONSTRAINT life_week_reviews_subject_check CHECK (subject IN ('self', 'lilly', 'caroline'));
ALTER TABLE public.life_week_reviews ADD CONSTRAINT life_week_reviews_user_subject_week UNIQUE (user_id, subject, week_index);
CREATE INDEX IF NOT EXISTS idx_life_week_reviews_user_subject ON public.life_week_reviews (user_id, subject, week_index DESC);
alter table public.journals drop constraint if exists journals_source_kind_check;
alter table public.journals add constraint journals_source_kind_check check (source_kind in ('manual', 'belief_layer', 'book', 'theme', 'verse_capture', 'daily', 'chat', 'private', 'notes', 'life_week_reviews'));
alter table public.journal_entries drop constraint if exists journal_entries_entry_kind_check;
alter table public.journal_entries add constraint journal_entries_entry_kind_check check (entry_kind is null or entry_kind in ('dream', 'praise_report', 'testimony', 'vent', 'chat', 'listening', 'morning_review', 'morning_conversation', 'life_week_review'));
CREATE OR REPLACE FUNCTION public.get_my_storage_usage()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE
  uid uuid := auth.uid();
  journal_bytes bigint := 0;
  artifacts_bytes bigint := 0;
  photos_bytes bigint := 0;
  videos_bytes bigint := 0;
  voice_bytes bigint := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT coalesce(sum((metadata->>'size')::bigint), 0) INTO photos_bytes FROM storage.objects WHERE bucket_id = 'journal-photos' AND (storage.foldername(name))[1] = uid::text;
  SELECT coalesce(sum((metadata->>'size')::bigint), 0) INTO videos_bytes FROM storage.objects WHERE bucket_id = 'journal-videos' AND (storage.foldername(name))[1] = uid::text;
  SELECT coalesce(sum((metadata->>'size')::bigint), 0) INTO voice_bytes FROM storage.objects WHERE bucket_id = 'voice-memos' AND (storage.foldername(name))[1] = uid::text;
  SELECT coalesce(sum((metadata->>'size')::bigint), 0) INTO artifacts_bytes FROM storage.objects WHERE bucket_id = 'artifact-uploads' AND (storage.foldername(name))[1] = uid::text;
  journal_bytes := photos_bytes + videos_bytes + voice_bytes;
  RETURN jsonb_build_object('journal_bytes', journal_bytes, 'artifacts_bytes', artifacts_bytes, 'total_bytes', journal_bytes + artifacts_bytes, 'breakdown', jsonb_build_object('journal_photos_bytes', photos_bytes, 'journal_videos_bytes', videos_bytes, 'voice_memos_bytes', voice_bytes, 'artifact_uploads_bytes', artifacts_bytes));
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_storage_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_storage_usage() TO authenticated;
COMMENT ON FUNCTION public.get_my_storage_usage IS 'Returns Supabase Storage bytes for the current user (journal photos/videos/voice + artifact uploads).';
CREATE OR REPLACE FUNCTION public.list_user_storage_objects_for_backup(p_user_id uuid)
RETURNS TABLE (bucket_id text, name text, size_bytes bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public, storage AS $$
  SELECT o.bucket_id, o.name, coalesce((o.metadata->>'size')::bigint, 0)::bigint AS size_bytes
  FROM storage.objects o
  WHERE o.bucket_id IN ('journal-photos', 'journal-videos', 'voice-memos', 'artifact-uploads')
    AND (storage.foldername(o.name))[1] = p_user_id::text
  ORDER BY o.created_at ASC;
$$;
REVOKE ALL ON FUNCTION public.list_user_storage_objects_for_backup(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_user_storage_objects_for_backup(uuid) TO service_role;
CREATE TABLE IF NOT EXISTS public.google_drive_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  state text NOT NULL UNIQUE,
  return_path text NOT NULL DEFAULT '/settings',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.google_drive_oauth_states TO service_role;
CREATE INDEX IF NOT EXISTS idx_google_drive_oauth_states_user ON public.google_drive_oauth_states (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.google_drive_oauth_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  access_token text NULL,
  access_token_expires_at timestamptz NULL,
  google_email text NULL,
  drive_folder_id text NULL,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  last_sync_at timestamptz NULL,
  last_sync_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.google_drive_oauth_connections TO service_role;
CREATE TABLE IF NOT EXISTS public.google_drive_synced_objects (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  bucket_id text NOT NULL,
  storage_path text NOT NULL,
  drive_file_id text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket_id, storage_path)
);
GRANT ALL ON public.google_drive_synced_objects TO service_role;
CREATE INDEX IF NOT EXISTS idx_google_drive_synced_objects_user ON public.google_drive_synced_objects (user_id, synced_at DESC);
ALTER TABLE public.google_drive_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_oauth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_synced_objects ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.google_drive_oauth_connections IS 'Google Drive OAuth tokens for optional YourBible vault backup.';
COMMENT ON TABLE public.google_drive_synced_objects IS 'Maps Supabase storage objects to Google Drive file ids after backup sync.';
ALTER TABLE public.highlights ADD COLUMN IF NOT EXISTS verse_id TEXT, ADD COLUMN IF NOT EXISTS bible_id TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS verse_id TEXT, ADD COLUMN IF NOT EXISTS bible_id TEXT;
CREATE INDEX IF NOT EXISTS highlights_verse_id_idx ON public.highlights (user_id, verse_id) WHERE verse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notes_verse_id_idx ON public.notes (user_id, verse_id) WHERE verse_id IS NOT NULL;
COMMENT ON COLUMN public.highlights.verse_id IS 'Stable id e.g. CSB:Jhn:3:16';
COMMENT ON COLUMN public.notes.verse_id IS 'Stable id e.g. CSB:Jhn:3:16';
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  prayer_text text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'guidance' CHECK (category IN ('family', 'business', 'health', 'ministry', 'finances', 'guidance', 'protection')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'partial', 'answered', 'different_answer', 'closed')),
  requested_at date NOT NULL DEFAULT CURRENT_DATE,
  answered_at date,
  answer_text text,
  private_notes text NOT NULL DEFAULT '',
  scripture_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  praise_report_entry_id uuid REFERENCES public.journal_entries (id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_requests TO authenticated;
GRANT ALL ON public.prayer_requests TO service_role;
CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_status ON public.prayer_requests (user_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_answered ON public.prayer_requests (user_id, answered_at DESC) WHERE answered_at IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.prayer_request_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  prayer_request_id uuid NOT NULL REFERENCES public.prayer_requests (id) ON DELETE CASCADE,
  event_kind text NOT NULL CHECK (event_kind IN ('asked', 'note', 'scripture', 'journal', 'artifact', 'dream', 'worship', 'gratitude', 'opportunity', 'answered', 'praise')),
  title text NOT NULL,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  link_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_request_timeline_events TO authenticated;
GRANT ALL ON public.prayer_request_timeline_events TO service_role;
CREATE INDEX IF NOT EXISTS idx_prayer_timeline_request ON public.prayer_request_timeline_events (prayer_request_id, occurred_at ASC);
CREATE INDEX IF NOT EXISTS idx_prayer_timeline_user ON public.prayer_request_timeline_events (user_id, occurred_at DESC);
DROP TRIGGER IF EXISTS trg_prayer_requests_updated ON public.prayer_requests;
CREATE TRIGGER trg_prayer_requests_updated BEFORE UPDATE ON public.prayer_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_request_timeline_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prayer_requests_select_own" ON public.prayer_requests;
CREATE POLICY "prayer_requests_select_own" ON public.prayer_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "prayer_requests_insert_own" ON public.prayer_requests;
CREATE POLICY "prayer_requests_insert_own" ON public.prayer_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "prayer_requests_update_own" ON public.prayer_requests;
CREATE POLICY "prayer_requests_update_own" ON public.prayer_requests FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "prayer_requests_delete_own" ON public.prayer_requests;
CREATE POLICY "prayer_requests_delete_own" ON public.prayer_requests FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "prayer_timeline_select_own" ON public.prayer_request_timeline_events;
CREATE POLICY "prayer_timeline_select_own" ON public.prayer_request_timeline_events FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "prayer_timeline_insert_own" ON public.prayer_request_timeline_events;
CREATE POLICY "prayer_timeline_insert_own" ON public.prayer_request_timeline_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "prayer_timeline_update_own" ON public.prayer_request_timeline_events;
CREATE POLICY "prayer_timeline_update_own" ON public.prayer_request_timeline_events FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "prayer_timeline_delete_own" ON public.prayer_request_timeline_events;
CREATE POLICY "prayer_timeline_delete_own" ON public.prayer_request_timeline_events FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.journal_entry_links DROP CONSTRAINT IF EXISTS journal_entry_links_target_kind_check;
ALTER TABLE public.journal_entry_links ADD CONSTRAINT journal_entry_links_target_kind_check CHECK (target_kind IN ('verse', 'belief', 'tension', 'study', 'daily', 'chat_thread', 'artifact', 'prompt', 'entry', 'entity', 'prayer_request'));
ALTER TABLE public.prayer_requests ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS amount_requested numeric(12, 2), ADD COLUMN IF NOT EXISTS amount_provided numeric(12, 2), ADD COLUMN IF NOT EXISTS deadline date;
CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_deadline ON public.prayer_requests (user_id, deadline) WHERE deadline IS NOT NULL;
CREATE OR REPLACE FUNCTION public.ensure_default_life_priorities()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.life_priorities lp WHERE lp.user_id = v_uid LIMIT 1) THEN RETURN; END IF;
  INSERT INTO public.life_priorities (user_id, rank, key, label, intention, daily_target_minutes, color) VALUES
    (v_uid, 1, 'god', 'Abide', 'Pray · Scripture · worship', 20, 'amber-500'),
    (v_uid, 2, 'health', 'Build the temple', 'Sleep · nourishment · exercise · recovery', 30, 'rose-500'),
    (v_uid, 3, 'family', 'Family', 'Presence · conversation · care', 45, 'sky-500'),
    (v_uid, 4, 'work', 'Work', 'Focused blocks · clear priorities', 120, 'violet-500');
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_default_life_priorities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_life_priorities() TO authenticated;
UPDATE public.life_priorities SET label = 'Abide', intention = 'Pray · Scripture · worship' WHERE key = 'god' AND archived_at IS NULL AND (label = 'God' OR intention = 'Pray · read Scripture · quiet my heart');
UPDATE public.life_priorities SET label = 'Build the temple', intention = 'Sleep · nourishment · exercise · recovery' WHERE key = 'health' AND archived_at IS NULL AND (label = 'Health' OR intention = 'Move · sleep · nourishment');
UPDATE public.life_priorities SET archived_at = now() WHERE key = 'others' AND archived_at IS NULL;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.life_priorities LOOP
    WITH ordered AS (SELECT id, ROW_NUMBER() OVER (ORDER BY rank ASC, key ASC) AS new_rank FROM public.life_priorities WHERE user_id = r.user_id AND archived_at IS NULL)
    UPDATE public.life_priorities lp SET rank = o.new_rank::smallint FROM ordered o WHERE lp.id = o.id;
  END LOOP;
END;
$$;
CREATE OR REPLACE FUNCTION public.sync_habit_framework_template()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_names text[] := ARRAY['Daily Alignment (worship, gratitude, Scripture, prayer)','Morning hygiene complete','Filled water bottle','Finished water goal','Move for 20 minutes','Ate three real meals (or equivalent nutrition)','Shutdown routine complete','In bed for next sleep block','15 minutes uninterrupted with Tish','Read or pray with Lilly','Held, fed, or intentionally connected with Caroline','One deep-work session','Cleared critical communications'];
  v_categories text[] := ARRAY['Abide','Build the temple','Build the temple','Build the temple','Build the temple','Build the temple','Build the temple','Build the temple','Family','Family','Family','Work','Work'];
  i int;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  FOR i IN 1..array_length(v_names, 1) LOOP
    UPDATE public.habits SET sort_order = i - 1, category = v_categories[i] WHERE user_id = v_uid AND archived_at IS NULL AND name = v_names[i];
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_habit_framework_template() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_habit_framework_template() TO authenticated;
CREATE TABLE IF NOT EXISTS public.vision_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  background_key text NOT NULL DEFAULT 'cork',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vision_boards_user_id_unique UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vision_boards TO authenticated;
GRANT ALL ON public.vision_boards TO service_role;
CREATE TABLE IF NOT EXISTS public.vision_board_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.vision_boards (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('photo', 'note', 'pin')),
  x double precision NOT NULL DEFAULT 100,
  y double precision NOT NULL DEFAULT 100,
  width double precision NOT NULL DEFAULT 200,
  height double precision NOT NULL DEFAULT 200,
  rotation double precision NOT NULL DEFAULT 0,
  z_index int NOT NULL DEFAULT 0,
  text text,
  note_color text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vision_board_items TO authenticated;
GRANT ALL ON public.vision_board_items TO service_role;
CREATE INDEX IF NOT EXISTS idx_vision_board_items_board ON public.vision_board_items (board_id, z_index ASC);
CREATE INDEX IF NOT EXISTS idx_vision_board_items_user ON public.vision_board_items (user_id);
DROP TRIGGER IF EXISTS trg_vision_boards_updated ON public.vision_boards;
CREATE TRIGGER trg_vision_boards_updated BEFORE UPDATE ON public.vision_boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_vision_board_items_updated ON public.vision_board_items;
CREATE TRIGGER trg_vision_board_items_updated BEFORE UPDATE ON public.vision_board_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.vision_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_board_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vision_boards_select_own" ON public.vision_boards;
CREATE POLICY "vision_boards_select_own" ON public.vision_boards FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "vision_boards_insert_own" ON public.vision_boards;
CREATE POLICY "vision_boards_insert_own" ON public.vision_boards FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "vision_boards_update_own" ON public.vision_boards;
CREATE POLICY "vision_boards_update_own" ON public.vision_boards FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "vision_boards_delete_own" ON public.vision_boards;
CREATE POLICY "vision_boards_delete_own" ON public.vision_boards FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "vision_board_items_select_own" ON public.vision_board_items;
CREATE POLICY "vision_board_items_select_own" ON public.vision_board_items FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "vision_board_items_insert_own" ON public.vision_board_items;
CREATE POLICY "vision_board_items_insert_own" ON public.vision_board_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "vision_board_items_update_own" ON public.vision_board_items;
CREATE POLICY "vision_board_items_update_own" ON public.vision_board_items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "vision_board_items_delete_own" ON public.vision_board_items;
CREATE POLICY "vision_board_items_delete_own" ON public.vision_board_items FOR DELETE TO authenticated USING (user_id = auth.uid());
alter table public.profiles add column if not exists journal_e2e_enabled boolean not null default false;
alter table public.profiles add column if not exists journal_timezone text not null default 'America/Chicago';
create table if not exists public.user_journal_crypto (
  user_id uuid primary key references auth.users (id) on delete cascade,
  salt text not null,
  wrapped_dek text not null,
  recovery_wrapped_dek text not null,
  key_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_journal_crypto TO authenticated;
GRANT ALL ON public.user_journal_crypto TO service_role;
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
create trigger trg_user_journal_crypto_updated before update on public.user_journal_crypto for each row execute function public.update_updated_at_column();
alter table public.journal_entries add column if not exists e2e_encrypted boolean not null default false;
alter table public.journal_entries add column if not exists revision bigint not null default 0;
alter table public.journals add column if not exists e2e_required boolean not null default false;
alter table public.journals drop constraint if exists journals_source_kind_check;
alter table public.journals add constraint journals_source_kind_check check (source_kind in ('manual', 'belief_layer', 'book', 'theme', 'verse_capture', 'daily', 'chat', 'private', 'notes', 'life_week_reviews'));
create index if not exists idx_journal_entries_e2e on public.journal_entries (user_id, e2e_encrypted) where e2e_encrypted = true;
create index if not exists idx_journals_e2e_required on public.journals (user_id) where e2e_required = true;
create unique index if not exists journals_one_default_per_user on public.journals (user_id) where is_default = true;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.journal_entries'::regclass and conname = 'journal_entries_journal_id_fkey') then
    alter table public.journal_entries add constraint journal_entries_journal_id_fkey foreign key (journal_id) references public.journals(id) on delete set null;
  end if;
end $$;
create or replace function public.set_journal_entry_local_date()
returns trigger language plpgsql security invoker set search_path = public as $$
declare tz text := 'America/Chicago';
begin
  if new.user_id is not null then
    select coalesce(nullif(p.journal_timezone, ''), 'America/Chicago') into tz from public.profiles p where p.user_id = new.user_id;
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
create trigger trg_journal_entries_local_date before insert or update of entry_at_ts, user_id on public.journal_entries for each row execute function public.set_journal_entry_local_date();
create or replace function public.bump_journal_entry_revision()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.revision := old.revision + 1;
  return new;
end;
$$;
drop trigger if exists trg_journal_entries_revision on public.journal_entries;
create trigger trg_journal_entries_revision before update on public.journal_entries for each row execute function public.bump_journal_entry_revision();
update public.journal_entries set entry_at = (entry_at_ts at time zone 'America/Chicago')::date where entry_at is distinct from (entry_at_ts at time zone 'America/Chicago')::date;
create or replace function public.trg_enqueue_journal_embedding()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.entry_kind,'') = 'vent' then return new; end if;
  if coalesce(new.e2e_encrypted, false) = true then return new; end if;
  if (tg_op = 'INSERT') or new.body is distinct from old.body or coalesce(new.title,'') is distinct from coalesce(old.title,'') or coalesce(new.summary,'') is distinct from coalesce(old.summary,'') then
    perform public.enqueue_embedding_job(new.user_id, 'journal_entries', new.id);
  end if;
  return new;
end; $$;