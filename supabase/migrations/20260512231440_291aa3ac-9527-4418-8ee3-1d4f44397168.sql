
-- 1) profiles.date_of_birth
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 2) life_priorities
CREATE TABLE IF NOT EXISTS public.life_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  intention text,
  color text,
  rank integer NOT NULL DEFAULT 1,
  daily_target_minutes integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.life_priorities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own select" ON public.life_priorities FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "own insert" ON public.life_priorities FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "own update" ON public.life_priorities FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "own delete" ON public.life_priorities FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS life_priorities_user_rank_idx ON public.life_priorities (user_id, rank);

DROP TRIGGER IF EXISTS life_priorities_updated_at ON public.life_priorities;
CREATE TRIGGER life_priorities_updated_at
  BEFORE UPDATE ON public.life_priorities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) life_priority_logs
CREATE TABLE IF NOT EXISTS public.life_priority_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  priority_id uuid NOT NULL REFERENCES public.life_priorities(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  minutes integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, priority_id, log_date)
);

ALTER TABLE public.life_priority_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own select" ON public.life_priority_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "own insert" ON public.life_priority_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "own update" ON public.life_priority_logs FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "own delete" ON public.life_priority_logs FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS life_priority_logs_user_date_idx ON public.life_priority_logs (user_id, log_date);

-- 4) RPC to seed defaults for the current user (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_default_life_priorities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.life_priorities WHERE user_id = v_uid) THEN
    RETURN;
  END IF;
  INSERT INTO public.life_priorities (user_id, key, label, intention, color, rank) VALUES
    (v_uid, 'god',    'God',    'Time in the Word and prayer', 'amber-500',   1),
    (v_uid, 'health', 'Health', 'Move, rest, eat well',         'rose-500',    2),
    (v_uid, 'family', 'Family', 'Presence with the people closest', 'sky-500', 3),
    (v_uid, 'work',   'Work',   'Deep, focused craft',          'violet-500',  4),
    (v_uid, 'others', 'Others', 'Serve, encourage, give',       'emerald-500', 5);
END;
$$;
