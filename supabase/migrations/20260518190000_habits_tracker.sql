-- Habit tracker: habits, completions, goals, notes, bills (RLS owner-only).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  sort_order int NOT NULL DEFAULT 0,
  note text,
  archived_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.habits (id) ON DELETE CASCADE,
  completion_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT habit_completions_user_habit_day UNIQUE (user_id, habit_id, completion_date)
);

CREATE TABLE IF NOT EXISTS public.habit_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  year_month text NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  goal_type text NOT NULL CHECK (goal_type IN ('monthly', 'weekly', 'event')),
  week_number smallint CHECK (week_number IS NULL OR (week_number >= 1 AND week_number <= 5)),
  title text NOT NULL,
  event_date date,
  done boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  habit_id uuid REFERENCES public.habits (id) ON DELETE CASCADE,
  year_month text NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS habit_notes_global_month
  ON public.habit_notes (user_id, year_month)
  WHERE habit_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS habit_notes_habit_month
  ON public.habit_notes (user_id, habit_id, year_month)
  WHERE habit_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.habit_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  year_month text NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  due_date date,
  name text NOT NULL,
  amount_cents int NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  paid boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_habits_user_active
  ON public.habits (user_id, sort_order)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_habit_completions_user_month
  ON public.habit_completions (user_id, completion_date DESC);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit
  ON public.habit_completions (habit_id, completion_date DESC);

CREATE INDEX IF NOT EXISTS idx_habit_goals_user_month
  ON public.habit_goals (user_id, year_month, goal_type);

CREATE INDEX IF NOT EXISTS idx_habit_notes_user_month
  ON public.habit_notes (user_id, year_month);

CREATE INDEX IF NOT EXISTS idx_habit_bills_user_month
  ON public.habit_bills (user_id, year_month);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_habits_updated ON public.habits;
CREATE TRIGGER trg_habits_updated
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_habit_goals_updated ON public.habit_goals;
CREATE TRIGGER trg_habit_goals_updated
  BEFORE UPDATE ON public.habit_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_habit_notes_updated ON public.habit_notes;
CREATE TRIGGER trg_habit_notes_updated
  BEFORE UPDATE ON public.habit_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_habit_bills_updated ON public.habit_bills;
CREATE TRIGGER trg_habit_bills_updated
  BEFORE UPDATE ON public.habit_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_bills ENABLE ROW LEVEL SECURITY;

-- habits
DROP POLICY IF EXISTS "habits_select_own" ON public.habits;
CREATE POLICY "habits_select_own" ON public.habits
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "habits_insert_own" ON public.habits;
CREATE POLICY "habits_insert_own" ON public.habits
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "habits_update_own" ON public.habits;
CREATE POLICY "habits_update_own" ON public.habits
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "habits_delete_own" ON public.habits;
CREATE POLICY "habits_delete_own" ON public.habits
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- habit_completions
DROP POLICY IF EXISTS "habit_completions_select_own" ON public.habit_completions;
CREATE POLICY "habit_completions_select_own" ON public.habit_completions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_completions_insert_own" ON public.habit_completions;
CREATE POLICY "habit_completions_insert_own" ON public.habit_completions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "habit_completions_update_own" ON public.habit_completions;
CREATE POLICY "habit_completions_update_own" ON public.habit_completions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_completions_delete_own" ON public.habit_completions;
CREATE POLICY "habit_completions_delete_own" ON public.habit_completions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- habit_goals
DROP POLICY IF EXISTS "habit_goals_select_own" ON public.habit_goals;
CREATE POLICY "habit_goals_select_own" ON public.habit_goals
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_goals_insert_own" ON public.habit_goals;
CREATE POLICY "habit_goals_insert_own" ON public.habit_goals
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_goals_update_own" ON public.habit_goals;
CREATE POLICY "habit_goals_update_own" ON public.habit_goals
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_goals_delete_own" ON public.habit_goals;
CREATE POLICY "habit_goals_delete_own" ON public.habit_goals
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- habit_notes
DROP POLICY IF EXISTS "habit_notes_select_own" ON public.habit_notes;
CREATE POLICY "habit_notes_select_own" ON public.habit_notes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_notes_insert_own" ON public.habit_notes;
CREATE POLICY "habit_notes_insert_own" ON public.habit_notes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_notes_update_own" ON public.habit_notes;
CREATE POLICY "habit_notes_update_own" ON public.habit_notes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_notes_delete_own" ON public.habit_notes;
CREATE POLICY "habit_notes_delete_own" ON public.habit_notes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- habit_bills
DROP POLICY IF EXISTS "habit_bills_select_own" ON public.habit_bills;
CREATE POLICY "habit_bills_select_own" ON public.habit_bills
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_bills_insert_own" ON public.habit_bills;
CREATE POLICY "habit_bills_insert_own" ON public.habit_bills
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_bills_update_own" ON public.habit_bills;
CREATE POLICY "habit_bills_update_own" ON public.habit_bills
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_bills_delete_own" ON public.habit_bills;
CREATE POLICY "habit_bills_delete_own" ON public.habit_bills
  FOR DELETE TO authenticated USING (user_id = auth.uid());
