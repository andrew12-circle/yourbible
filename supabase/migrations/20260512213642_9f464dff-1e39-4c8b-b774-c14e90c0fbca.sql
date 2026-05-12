-- knowledge_entities
create table if not exists public.knowledge_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('book','person','scripture','dream_vision','fear','question','project','business','system','technology')),
  title text not null,
  subtitle text null,
  metadata jsonb not null default '{}'::jsonb,
  confidence numeric(3,2) null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists knowledge_entities_user_kind_title_uniq on public.knowledge_entities (user_id, kind, lower(title));
create index if not exists knowledge_entities_user_kind_idx on public.knowledge_entities (user_id, kind, last_seen_at desc);

create table if not exists public.entity_mentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id uuid not null references public.knowledge_entities(id) on delete cascade,
  artifact_id uuid null references public.artifacts(id) on delete cascade,
  journal_entry_id uuid null references public.journal_entries(id) on delete cascade,
  belief_id uuid null references public.belief_nodes(id) on delete set null,
  snippet text null,
  confidence numeric(3,2) null,
  created_at timestamptz not null default now()
);
create unique index if not exists entity_mentions_dedupe_artifact_uniq on public.entity_mentions (entity_id, artifact_id) where artifact_id is not null;
create unique index if not exists entity_mentions_dedupe_journal_uniq on public.entity_mentions (entity_id, journal_entry_id) where journal_entry_id is not null;
create index if not exists entity_mentions_entity_idx on public.entity_mentions (entity_id, created_at desc);
create index if not exists entity_mentions_user_idx on public.entity_mentions (user_id, created_at desc);

alter table public.knowledge_entities enable row level security;
alter table public.entity_mentions enable row level security;

drop policy if exists "knowledge_entities_select_own" on public.knowledge_entities;
create policy "knowledge_entities_select_own" on public.knowledge_entities for select to authenticated using (user_id = auth.uid());
drop policy if exists "knowledge_entities_insert_own" on public.knowledge_entities;
create policy "knowledge_entities_insert_own" on public.knowledge_entities for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "knowledge_entities_update_own" on public.knowledge_entities;
create policy "knowledge_entities_update_own" on public.knowledge_entities for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "knowledge_entities_delete_own" on public.knowledge_entities;
create policy "knowledge_entities_delete_own" on public.knowledge_entities for delete to authenticated using (user_id = auth.uid());

drop policy if exists "entity_mentions_select_own" on public.entity_mentions;
create policy "entity_mentions_select_own" on public.entity_mentions for select to authenticated using (user_id = auth.uid());
drop policy if exists "entity_mentions_insert_own" on public.entity_mentions;
create policy "entity_mentions_insert_own" on public.entity_mentions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "entity_mentions_update_own" on public.entity_mentions;
create policy "entity_mentions_update_own" on public.entity_mentions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "entity_mentions_delete_own" on public.entity_mentions;
create policy "entity_mentions_delete_own" on public.entity_mentions for delete to authenticated using (user_id = auth.uid());

drop trigger if exists trg_knowledge_entities_updated on public.knowledge_entities;
create trigger trg_knowledge_entities_updated before update on public.knowledge_entities for each row execute function public.update_updated_at_column();

create or replace function public.merge_knowledge_entity(p_user_id uuid, p_kind text, p_title text, p_subtitle text, p_metadata jsonb, p_confidence numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_title text := trim(p_title);
begin
  if v_title = '' then raise exception 'merge_knowledge_entity: empty title'; end if;
  insert into public.knowledge_entities (user_id, kind, title, subtitle, metadata, confidence)
  values (p_user_id, p_kind, v_title, nullif(trim(coalesce(p_subtitle,'')),''), coalesce(p_metadata,'{}'::jsonb), p_confidence)
  on conflict (user_id, kind, lower(title)) do update set
    last_seen_at = now(),
    confidence = greatest(coalesce(public.knowledge_entities.confidence, excluded.confidence), coalesce(excluded.confidence, public.knowledge_entities.confidence)),
    updated_at = now()
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.merge_knowledge_entity(uuid,text,text,text,jsonb,numeric) from public;
grant execute on function public.merge_knowledge_entity(uuid,text,text,text,jsonb,numeric) to service_role;

-- my_ai_chats / my_ai_messages
create table if not exists public.my_ai_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.my_ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id uuid not null references public.my_ai_chats(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists my_ai_messages_chat_idx on public.my_ai_messages (chat_id, created_at);
create index if not exists my_ai_chats_user_updated_idx on public.my_ai_chats (user_id, updated_at desc);

drop trigger if exists update_my_ai_chats_updated_at on public.my_ai_chats;
create trigger update_my_ai_chats_updated_at before update on public.my_ai_chats for each row execute function public.update_updated_at_column();

create or replace function public.touch_my_ai_chat_from_message() returns trigger language plpgsql as $$
begin update public.my_ai_chats set updated_at = now() where id = new.chat_id; return new; end; $$;

drop trigger if exists my_ai_messages_touch_chat on public.my_ai_messages;
create trigger my_ai_messages_touch_chat after insert on public.my_ai_messages for each row execute function public.touch_my_ai_chat_from_message();

alter table public.my_ai_chats enable row level security;
alter table public.my_ai_messages enable row level security;

drop policy if exists "my_ai_chats_select_own" on public.my_ai_chats;
create policy "my_ai_chats_select_own" on public.my_ai_chats for select to authenticated using (user_id = auth.uid());
drop policy if exists "my_ai_chats_insert_own" on public.my_ai_chats;
create policy "my_ai_chats_insert_own" on public.my_ai_chats for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "my_ai_chats_update_own" on public.my_ai_chats;
create policy "my_ai_chats_update_own" on public.my_ai_chats for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "my_ai_chats_delete_own" on public.my_ai_chats;
create policy "my_ai_chats_delete_own" on public.my_ai_chats for delete to authenticated using (user_id = auth.uid());

drop policy if exists "my_ai_messages_select_own" on public.my_ai_messages;
create policy "my_ai_messages_select_own" on public.my_ai_messages for select to authenticated using (user_id = auth.uid());
drop policy if exists "my_ai_messages_insert_own" on public.my_ai_messages;
create policy "my_ai_messages_insert_own" on public.my_ai_messages for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "my_ai_messages_update_own" on public.my_ai_messages;
create policy "my_ai_messages_update_own" on public.my_ai_messages for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "my_ai_messages_delete_own" on public.my_ai_messages;
create policy "my_ai_messages_delete_own" on public.my_ai_messages for delete to authenticated using (user_id = auth.uid());

-- teachings / playbook_items
create table if not exists public.teachings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid null references public.artifacts(id) on delete cascade,
  title text not null,
  summary text null,
  category text not null check (category in ('practice','principle','warning','identity','prayer','discipline','strategy','question')),
  scriptures text[] not null default '{}',
  source_snippet text null,
  confidence numeric(3,2) null,
  status text not null default 'proposed' check (status in ('proposed','accepted','deferred','rejected')),
  notes text null,
  decided_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teachings_user_status_idx on public.teachings (user_id, status, updated_at desc);
create index if not exists teachings_artifact_idx on public.teachings (artifact_id, created_at);

create table if not exists public.playbook_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  teaching_id uuid not null references public.teachings(id) on delete cascade,
  title text not null,
  why text null,
  steps jsonb not null default '[]'::jsonb,
  watch_outs text[] not null default '{}',
  scriptures text[] not null default '{}',
  related_belief_ids uuid[] not null default '{}',
  status text not null default 'active' check (status in ('active','paused','complete','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists playbook_items_one_per_teaching on public.playbook_items (teaching_id);
create index if not exists playbook_items_user_status_idx on public.playbook_items (user_id, status, updated_at desc);

alter table public.teachings enable row level security;
alter table public.playbook_items enable row level security;

drop policy if exists "teachings_select_own" on public.teachings;
create policy "teachings_select_own" on public.teachings for select to authenticated using (user_id = auth.uid());
drop policy if exists "teachings_insert_own" on public.teachings;
create policy "teachings_insert_own" on public.teachings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "teachings_update_own" on public.teachings;
create policy "teachings_update_own" on public.teachings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "teachings_delete_own" on public.teachings;
create policy "teachings_delete_own" on public.teachings for delete to authenticated using (user_id = auth.uid());

drop policy if exists "playbook_items_select_own" on public.playbook_items;
create policy "playbook_items_select_own" on public.playbook_items for select to authenticated using (user_id = auth.uid());
drop policy if exists "playbook_items_insert_own" on public.playbook_items;
create policy "playbook_items_insert_own" on public.playbook_items for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "playbook_items_update_own" on public.playbook_items;
create policy "playbook_items_update_own" on public.playbook_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "playbook_items_delete_own" on public.playbook_items;
create policy "playbook_items_delete_own" on public.playbook_items for delete to authenticated using (user_id = auth.uid());

drop trigger if exists trg_teachings_updated on public.teachings;
create trigger trg_teachings_updated before update on public.teachings for each row execute function public.update_updated_at_column();
drop trigger if exists trg_playbook_items_updated on public.playbook_items;
create trigger trg_playbook_items_updated before update on public.playbook_items for each row execute function public.update_updated_at_column();

-- journal_entries.entry_kind
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS entry_kind text;
ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_entry_kind_check;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_entry_kind_check CHECK (entry_kind IS NULL OR entry_kind IN ('dream','praise_report','testimony','vent'));
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_entry_kind ON public.journal_entries (user_id, entry_kind) WHERE entry_kind IS NOT NULL;

-- partner_*
CREATE TABLE IF NOT EXISTS public.partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  relationship text NOT NULL DEFAULT 'friend' CHECK (relationship IN ('spouse','friend','mentor','family','other')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days')
);
CREATE TABLE IF NOT EXISTS public.partner_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'friend' CHECK (relationship IN ('spouse','friend','mentor','family','other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT partner_connections_ordered CHECK (user_a < user_b),
  CONSTRAINT partner_connections_distinct CHECK (user_a <> user_b),
  CONSTRAINT partner_connections_unique_pair UNIQUE (user_a, user_b)
);
CREATE TABLE IF NOT EXISTS public.partner_share_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.partner_connections(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_summary boolean NOT NULL DEFAULT true,
  share_prayer_needs boolean NOT NULL DEFAULT true,
  share_recent_themes boolean NOT NULL DEFAULT true,
  share_testimony boolean NOT NULL DEFAULT true,
  share_mood_pulse boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_share_settings_owner_unique UNIQUE (connection_id, owner_user_id)
);
CREATE TABLE IF NOT EXISTS public.partner_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.partner_connections(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text NOT NULL DEFAULT '',
  recent_themes text[] NOT NULL DEFAULT '{}'::text[],
  prayer_points text[] NOT NULL DEFAULT '{}'::text[],
  season_label text NULL,
  mood_pulse jsonb NULL,
  entry_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model text NULL,
  CONSTRAINT partner_summaries_unique_owner UNIQUE (connection_id, owner_user_id)
);
CREATE INDEX IF NOT EXISTS idx_partner_invites_inviter ON public.partner_invites (inviter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_invites_invitee_email_pending ON public.partner_invites (lower(trim(invitee_email))) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_partner_connections_user_a ON public.partner_connections (user_a) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_partner_connections_user_b ON public.partner_connections (user_b) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_partner_summaries_connection ON public.partner_summaries (connection_id);

CREATE OR REPLACE FUNCTION public.partner_invites_normalize_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.invitee_email := lower(trim(NEW.invitee_email)); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_partner_invites_normalize_email ON public.partner_invites;
CREATE TRIGGER trg_partner_invites_normalize_email BEFORE INSERT OR UPDATE OF invitee_email ON public.partner_invites FOR EACH ROW EXECUTE FUNCTION public.partner_invites_normalize_email();
DROP TRIGGER IF EXISTS trg_partner_share_settings_updated ON public.partner_share_settings;
CREATE TRIGGER trg_partner_share_settings_updated BEFORE UPDATE ON public.partner_share_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_share_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_invites_select_inviter" ON public.partner_invites;
CREATE POLICY "partner_invites_select_inviter" ON public.partner_invites FOR SELECT TO authenticated USING (inviter_user_id = auth.uid());
DROP POLICY IF EXISTS "partner_invites_select_invitee_email" ON public.partner_invites;
CREATE POLICY "partner_invites_select_invitee_email" ON public.partner_invites FOR SELECT TO authenticated USING (invitee_email = lower(trim(coalesce((auth.jwt() ->> 'email')::text,''))));
DROP POLICY IF EXISTS "partner_invites_insert_inviter" ON public.partner_invites;
CREATE POLICY "partner_invites_insert_inviter" ON public.partner_invites FOR INSERT TO authenticated WITH CHECK (inviter_user_id = auth.uid());
DROP POLICY IF EXISTS "partner_invites_update_inviter" ON public.partner_invites;
CREATE POLICY "partner_invites_update_inviter" ON public.partner_invites FOR UPDATE TO authenticated USING (inviter_user_id = auth.uid()) WITH CHECK (inviter_user_id = auth.uid());
DROP POLICY IF EXISTS "partner_invites_delete_inviter" ON public.partner_invites;
CREATE POLICY "partner_invites_delete_inviter" ON public.partner_invites FOR DELETE TO authenticated USING (inviter_user_id = auth.uid());

DROP POLICY IF EXISTS "partner_connections_select_member" ON public.partner_connections;
CREATE POLICY "partner_connections_select_member" ON public.partner_connections FOR SELECT TO authenticated USING (user_a = auth.uid() OR user_b = auth.uid());
DROP POLICY IF EXISTS "partner_connections_delete_member" ON public.partner_connections;
CREATE POLICY "partner_connections_delete_member" ON public.partner_connections FOR DELETE TO authenticated USING (user_a = auth.uid() OR user_b = auth.uid());

DROP POLICY IF EXISTS "partner_share_settings_select_member" ON public.partner_share_settings;
CREATE POLICY "partner_share_settings_select_member" ON public.partner_share_settings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.partner_connections pc WHERE pc.id = connection_id AND pc.is_active = true AND (pc.user_a = auth.uid() OR pc.user_b = auth.uid())));
DROP POLICY IF EXISTS "partner_share_settings_insert_owner" ON public.partner_share_settings;
CREATE POLICY "partner_share_settings_insert_owner" ON public.partner_share_settings FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.partner_connections pc WHERE pc.id = connection_id AND pc.is_active = true AND (pc.user_a = auth.uid() OR pc.user_b = auth.uid())));
DROP POLICY IF EXISTS "partner_share_settings_update_owner" ON public.partner_share_settings;
CREATE POLICY "partner_share_settings_update_owner" ON public.partner_share_settings FOR UPDATE TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS "partner_share_settings_delete_owner" ON public.partner_share_settings;
CREATE POLICY "partner_share_settings_delete_owner" ON public.partner_share_settings FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "partner_summaries_select_member" ON public.partner_summaries;
CREATE POLICY "partner_summaries_select_member" ON public.partner_summaries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.partner_connections pc WHERE pc.id = connection_id AND pc.is_active = true AND (pc.user_a = auth.uid() OR pc.user_b = auth.uid())));
DROP POLICY IF EXISTS "partner_summaries_write_owner" ON public.partner_summaries;
CREATE POLICY "partner_summaries_write_owner" ON public.partner_summaries FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.partner_connections pc WHERE pc.id = connection_id AND pc.is_active = true AND (pc.user_a = auth.uid() OR pc.user_b = auth.uid())));
DROP POLICY IF EXISTS "partner_summaries_update_owner" ON public.partner_summaries;
CREATE POLICY "partner_summaries_update_owner" ON public.partner_summaries FOR UPDATE TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS "partner_summaries_delete_owner" ON public.partner_summaries;
CREATE POLICY "partner_summaries_delete_owner" ON public.partner_summaries FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.accept_partner_invite(p_token text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv public.partner_invites%ROWTYPE; v_uid uuid := auth.uid(); v_email text; v_a uuid; v_b uuid; v_connection_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN RAISE EXCEPTION 'invalid_token'; END IF;
  SELECT * INTO v_inv FROM public.partner_invites WHERE token = trim(p_token);
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF v_inv.status <> 'pending' THEN
    IF v_inv.status = 'accepted' THEN RAISE EXCEPTION 'already_accepted'; END IF;
    RAISE EXCEPTION 'invite_not_pending';
  END IF;
  IF v_inv.expires_at < now() THEN UPDATE public.partner_invites SET status='expired' WHERE id=v_inv.id; RAISE EXCEPTION 'invite_expired'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL OR length(trim(v_email)) = 0 THEN RAISE EXCEPTION 'no_email'; END IF;
  IF lower(trim(v_email)) <> v_inv.invitee_email THEN RAISE EXCEPTION 'wrong_invitee'; END IF;
  IF v_inv.inviter_user_id = v_uid THEN RAISE EXCEPTION 'self_invite'; END IF;
  IF v_inv.inviter_user_id < v_uid THEN v_a := v_inv.inviter_user_id; v_b := v_uid; ELSE v_a := v_uid; v_b := v_inv.inviter_user_id; END IF;
  IF EXISTS (SELECT 1 FROM public.partner_connections c WHERE c.user_a = v_a AND c.user_b = v_b AND c.is_active = true) THEN RAISE EXCEPTION 'already_connected'; END IF;
  INSERT INTO public.partner_connections (user_a, user_b, relationship) VALUES (v_a, v_b, v_inv.relationship) RETURNING id INTO v_connection_id;
  INSERT INTO public.partner_share_settings (connection_id, owner_user_id) VALUES (v_connection_id, v_inv.inviter_user_id), (v_connection_id, v_uid);
  UPDATE public.partner_invites SET status='accepted', accepted_at=now() WHERE id=v_inv.id;
  RETURN v_connection_id;
END; $$;
REVOKE ALL ON FUNCTION public.accept_partner_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_partner_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.partner_peer_displays() RETURNS TABLE (connection_id uuid, peer_user_id uuid, peer_display_name text, peer_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pc.id AS connection_id,
    CASE WHEN pc.user_a = auth.uid() THEN pc.user_b ELSE pc.user_a END AS peer_user_id,
    p.display_name AS peer_display_name,
    au.email::text AS peer_email
  FROM public.partner_connections pc
  JOIN public.profiles p ON p.user_id = CASE WHEN pc.user_a = auth.uid() THEN pc.user_b ELSE pc.user_a END
  JOIN auth.users au ON au.id = p.user_id
  WHERE auth.uid() IS NOT NULL AND pc.is_active = true AND (pc.user_a = auth.uid() OR pc.user_b = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.partner_peer_displays() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_peer_displays() TO authenticated;