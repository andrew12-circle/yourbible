-- Habit achievement badges (Apple Fitness–style unlocks)

CREATE TABLE IF NOT EXISTS public.habit_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  habit_id uuid REFERENCES public.habits (id) ON DELETE SET NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT habit_badges_user_badge UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_habit_badges_user
  ON public.habit_badges (user_id, unlocked_at DESC);

ALTER TABLE public.habit_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "habit_badges_select_own" ON public.habit_badges;
CREATE POLICY "habit_badges_select_own" ON public.habit_badges
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_badges_insert_own" ON public.habit_badges;
CREATE POLICY "habit_badges_insert_own" ON public.habit_badges
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
