-- Life priorities: ordered lanes + daily explicit check-ins (RLS owner-only).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.life_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- UI shows 1..5 by default; wider bound allows brief in-between values while saving reorder.
  rank smallint NOT NULL CHECK (rank >= 1 AND rank <= 32),
  key text NOT NULL CHECK (key IN ('god', 'health', 'family', 'work', 'others')),
  label text NOT NULL,
  intention text,
  daily_target_minutes int NOT NULL DEFAULT 0 CHECK (daily_target_minutes >= 0),
  color text,
  archived_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_priorities_user_key UNIQUE (user_id, key)
);

CREATE UNIQUE INDEX IF NOT EXISTS life_priorities_user_rank_active
  ON public.life_priorities (user_id, rank)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.life_priority_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  priority_id uuid NOT NULL REFERENCES public.life_priorities (id) ON DELETE CASCADE,
  log_date date NOT NULL,
  minutes int NOT NULL DEFAULT 0 CHECK (minutes >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_priority_logs_user_priority_day UNIQUE (user_id, priority_id, log_date)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_life_priorities_user
  ON public.life_priorities (user_id);

CREATE INDEX IF NOT EXISTS idx_life_priority_logs_user_date
  ON public.life_priority_logs (user_id, log_date DESC);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_life_priorities_updated ON public.life_priorities;
CREATE TRIGGER trg_life_priorities_updated
  BEFORE UPDATE ON public.life_priorities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Seed defaults (first visit only — zero rows for user)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_default_life_priorities()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.life_priorities lp WHERE lp.user_id = v_uid LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.life_priorities (user_id, rank, key, label, intention, daily_target_minutes, color)
  VALUES
    (v_uid, 1, 'god', 'God', 'Pray · read Scripture · quiet my heart', 20, 'amber-500'),
    (v_uid, 2, 'health', 'Health', 'Move · sleep · nourishment', 30, 'rose-500'),
    (v_uid, 3, 'family', 'Family', 'Presence · conversation · care', 45, 'sky-500'),
    (v_uid, 4, 'work', 'Work', 'Focused blocks · clear priorities', 120, 'violet-500'),
    (v_uid, 5, 'others', 'Others', 'Serve · encourage · listen', 30, 'emerald-500');
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_life_priorities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_life_priorities() TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.life_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_priority_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "life_priorities_select_own" ON public.life_priorities;
CREATE POLICY "life_priorities_select_own" ON public.life_priorities
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "life_priorities_insert_own" ON public.life_priorities;
CREATE POLICY "life_priorities_insert_own" ON public.life_priorities
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "life_priorities_update_own" ON public.life_priorities;
CREATE POLICY "life_priorities_update_own" ON public.life_priorities
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "life_priorities_delete_own" ON public.life_priorities;
CREATE POLICY "life_priorities_delete_own" ON public.life_priorities
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "life_priority_logs_select_own" ON public.life_priority_logs;
CREATE POLICY "life_priority_logs_select_own" ON public.life_priority_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "life_priority_logs_insert_own" ON public.life_priority_logs;
CREATE POLICY "life_priority_logs_insert_own" ON public.life_priority_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.life_priorities p
      WHERE p.id = priority_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "life_priority_logs_update_own" ON public.life_priority_logs;
CREATE POLICY "life_priority_logs_update_own" ON public.life_priority_logs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.life_priorities p
      WHERE p.id = priority_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "life_priority_logs_delete_own" ON public.life_priority_logs;
CREATE POLICY "life_priority_logs_delete_own" ON public.life_priority_logs
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
