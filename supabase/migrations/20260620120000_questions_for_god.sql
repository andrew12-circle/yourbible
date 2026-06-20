-- Questions for God: personal log of "why?" questions brought to God (answer optional)

CREATE TABLE public.questions_for_god (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  context text,
  notes text NOT NULL DEFAULT '',
  insight text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'insight', 'released', 'unknown')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_for_god_user_status
  ON public.questions_for_god (user_id, status, updated_at DESC);

ALTER TABLE public.questions_for_god ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions_for_god_select_own"
  ON public.questions_for_god FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "questions_for_god_insert_own"
  ON public.questions_for_god FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "questions_for_god_update_own"
  ON public.questions_for_god FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "questions_for_god_delete_own"
  ON public.questions_for_god FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_questions_for_god_updated
  BEFORE UPDATE ON public.questions_for_god
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
