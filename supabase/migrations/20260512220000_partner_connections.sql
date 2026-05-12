-- Partner / "Unified Walk" — invites, symmetric connections, share gates, privacy-safe summaries.
-- Email delivery for invites is out of scope; clients share a link with the token.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  relationship text NOT NULL DEFAULT 'friend'
    CHECK (relationship IN ('spouse', 'friend', 'mentor', 'family', 'other')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days')
);

CREATE TABLE IF NOT EXISTS public.partner_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'friend'
    CHECK (relationship IN ('spouse', 'friend', 'mentor', 'family', 'other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT partner_connections_ordered CHECK (user_a < user_b),
  CONSTRAINT partner_connections_distinct CHECK (user_a <> user_b),
  CONSTRAINT partner_connections_unique_pair UNIQUE (user_a, user_b)
);

CREATE TABLE IF NOT EXISTS public.partner_share_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.partner_connections (id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
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
  connection_id uuid NOT NULL REFERENCES public.partner_connections (id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
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

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_partner_invites_inviter
  ON public.partner_invites (inviter_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_invites_invitee_email_pending
  ON public.partner_invites (lower(trim(invitee_email)))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_partner_connections_user_a
  ON public.partner_connections (user_a)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_partner_connections_user_b
  ON public.partner_connections (user_b)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_partner_summaries_connection
  ON public.partner_summaries (connection_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.partner_invites_normalize_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.invitee_email := lower(trim(NEW.invitee_email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_invites_normalize_email ON public.partner_invites;
CREATE TRIGGER trg_partner_invites_normalize_email
  BEFORE INSERT OR UPDATE OF invitee_email ON public.partner_invites
  FOR EACH ROW EXECUTE FUNCTION public.partner_invites_normalize_email();

DROP TRIGGER IF EXISTS trg_partner_share_settings_updated ON public.partner_share_settings;
CREATE TRIGGER trg_partner_share_settings_updated
  BEFORE UPDATE ON public.partner_share_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_share_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_summaries ENABLE ROW LEVEL SECURITY;

-- partner_invites
DROP POLICY IF EXISTS "partner_invites_select_inviter" ON public.partner_invites;
CREATE POLICY "partner_invites_select_inviter" ON public.partner_invites
  FOR SELECT TO authenticated
  USING (inviter_user_id = auth.uid());

DROP POLICY IF EXISTS "partner_invites_select_invitee_email" ON public.partner_invites;
CREATE POLICY "partner_invites_select_invitee_email" ON public.partner_invites
  FOR SELECT TO authenticated
  USING (
    invitee_email = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
  );

DROP POLICY IF EXISTS "partner_invites_insert_inviter" ON public.partner_invites;
CREATE POLICY "partner_invites_insert_inviter" ON public.partner_invites
  FOR INSERT TO authenticated
  WITH CHECK (inviter_user_id = auth.uid());

DROP POLICY IF EXISTS "partner_invites_update_inviter" ON public.partner_invites;
CREATE POLICY "partner_invites_update_inviter" ON public.partner_invites
  FOR UPDATE TO authenticated
  USING (inviter_user_id = auth.uid())
  WITH CHECK (inviter_user_id = auth.uid());

DROP POLICY IF EXISTS "partner_invites_delete_inviter" ON public.partner_invites;
CREATE POLICY "partner_invites_delete_inviter" ON public.partner_invites
  FOR DELETE TO authenticated
  USING (inviter_user_id = auth.uid());

-- partner_connections
DROP POLICY IF EXISTS "partner_connections_select_member" ON public.partner_connections;
CREATE POLICY "partner_connections_select_member" ON public.partner_connections
  FOR SELECT TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

DROP POLICY IF EXISTS "partner_connections_delete_member" ON public.partner_connections;
CREATE POLICY "partner_connections_delete_member" ON public.partner_connections
  FOR DELETE TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- partner_share_settings
DROP POLICY IF EXISTS "partner_share_settings_select_member" ON public.partner_share_settings;
CREATE POLICY "partner_share_settings_select_member" ON public.partner_share_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_connections pc
      WHERE pc.id = connection_id
        AND pc.is_active = true
        AND (pc.user_a = auth.uid() OR pc.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "partner_share_settings_insert_owner" ON public.partner_share_settings;
CREATE POLICY "partner_share_settings_insert_owner" ON public.partner_share_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.partner_connections pc
      WHERE pc.id = connection_id
        AND pc.is_active = true
        AND (pc.user_a = auth.uid() OR pc.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "partner_share_settings_update_owner" ON public.partner_share_settings;
CREATE POLICY "partner_share_settings_update_owner" ON public.partner_share_settings
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "partner_share_settings_delete_owner" ON public.partner_share_settings;
CREATE POLICY "partner_share_settings_delete_owner" ON public.partner_share_settings
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

-- partner_summaries
DROP POLICY IF EXISTS "partner_summaries_select_member" ON public.partner_summaries;
CREATE POLICY "partner_summaries_select_member" ON public.partner_summaries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_connections pc
      WHERE pc.id = connection_id
        AND pc.is_active = true
        AND (pc.user_a = auth.uid() OR pc.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "partner_summaries_write_owner" ON public.partner_summaries;
CREATE POLICY "partner_summaries_write_owner" ON public.partner_summaries
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.partner_connections pc
      WHERE pc.id = connection_id
        AND pc.is_active = true
        AND (pc.user_a = auth.uid() OR pc.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "partner_summaries_update_owner" ON public.partner_summaries;
CREATE POLICY "partner_summaries_update_owner" ON public.partner_summaries
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "partner_summaries_delete_owner" ON public.partner_summaries;
CREATE POLICY "partner_summaries_delete_owner" ON public.partner_summaries
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPC: accept invite (SECURITY DEFINER — bypasses RLS for controlled writes)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_partner_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.partner_invites%ROWTYPE;
  v_uid uuid := auth.uid();
  v_email text;
  v_a uuid;
  v_b uuid;
  v_connection_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  SELECT * INTO v_inv
  FROM public.partner_invites
  WHERE token = trim(p_token);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  IF v_inv.status <> 'pending' THEN
    IF v_inv.status = 'accepted' THEN
      RAISE EXCEPTION 'already_accepted';
    END IF;
    RAISE EXCEPTION 'invite_not_pending';
  END IF;

  IF v_inv.expires_at < now() THEN
    UPDATE public.partner_invites SET status = 'expired' WHERE id = v_inv.id;
    RAISE EXCEPTION 'invite_expired';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL OR length(trim(v_email)) = 0 THEN
    RAISE EXCEPTION 'no_email';
  END IF;

  IF lower(trim(v_email)) <> v_inv.invitee_email THEN
    RAISE EXCEPTION 'wrong_invitee';
  END IF;

  IF v_inv.inviter_user_id = v_uid THEN
    RAISE EXCEPTION 'self_invite';
  END IF;

  IF v_inv.inviter_user_id < v_uid THEN
    v_a := v_inv.inviter_user_id;
    v_b := v_uid;
  ELSE
    v_a := v_uid;
    v_b := v_inv.inviter_user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.partner_connections c
    WHERE c.user_a = v_a AND c.user_b = v_b AND c.is_active = true
  ) THEN
    RAISE EXCEPTION 'already_connected';
  END IF;

  INSERT INTO public.partner_connections (user_a, user_b, relationship)
  VALUES (v_a, v_b, v_inv.relationship)
  RETURNING id INTO v_connection_id;

  INSERT INTO public.partner_share_settings (connection_id, owner_user_id)
  VALUES (v_connection_id, v_inv.inviter_user_id), (v_connection_id, v_uid);

  UPDATE public.partner_invites
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_inv.id;

  RETURN v_connection_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_partner_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_partner_invite(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: minimal partner display (display_name only — avoids widening profiles RLS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.partner_peer_displays()
RETURNS TABLE (
  connection_id uuid,
  peer_user_id uuid,
  peer_display_name text,
  peer_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pc.id AS connection_id,
    CASE WHEN pc.user_a = auth.uid() THEN pc.user_b ELSE pc.user_a END AS peer_user_id,
    p.display_name AS peer_display_name,
    au.email::text AS peer_email
  FROM public.partner_connections pc
  JOIN public.profiles p
    ON p.user_id = CASE WHEN pc.user_a = auth.uid() THEN pc.user_b ELSE pc.user_a END
  JOIN auth.users au ON au.id = p.user_id
  WHERE auth.uid() IS NOT NULL
    AND pc.is_active = true
    AND (pc.user_a = auth.uid() OR pc.user_b = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.partner_peer_displays() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_peer_displays() TO authenticated;
