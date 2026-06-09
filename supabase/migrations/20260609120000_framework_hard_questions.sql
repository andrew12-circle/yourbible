-- Hard Questions: user-initiated theological research workspace

CREATE TABLE public.framework_hard_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  framing text,
  why_it_matters text,
  current_thinking text,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'researching', 'concluded', 'parked')),
  conclusion text,
  confidence numeric(3, 2),
  layer text CHECK (layer IS NULL OR layer IN ('foundations', 'life', 'mechanics', 'emotional')),
  tags text[] NOT NULL DEFAULT '{}'::text[],
  scripture_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_belief_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  seed_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_framework_hard_questions_user_status
  ON public.framework_hard_questions (user_id, status, updated_at DESC);

CREATE UNIQUE INDEX idx_framework_hard_questions_user_seed
  ON public.framework_hard_questions (user_id, seed_key)
  WHERE seed_key IS NOT NULL;

CREATE TABLE public.hard_question_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hard_question_id uuid NOT NULL REFERENCES public.framework_hard_questions(id) ON DELETE CASCADE,
  artifact_id uuid REFERENCES public.artifacts(id) ON DELETE SET NULL,
  url text,
  label text NOT NULL,
  snippet text,
  kind text NOT NULL DEFAULT 'note' CHECK (kind IN ('artifact', 'link', 'note', 'voice')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hard_question_sources_question
  ON public.hard_question_sources (hard_question_id, created_at DESC);

CREATE TABLE public.hard_question_research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hard_question_id uuid NOT NULL REFERENCES public.framework_hard_questions(id) ON DELETE CASCADE,
  pack_type text NOT NULL DEFAULT 'standard' CHECK (pack_type IN ('standard', 'validation')),
  use_web boolean NOT NULL DEFAULT false,
  pack_json jsonb NOT NULL,
  brief_summary text,
  user_question text,
  opened_at timestamptz,
  first_chat_at timestamptz,
  verdict_at timestamptz,
  verdict text
);

CREATE INDEX idx_hard_question_research_runs_question_created
  ON public.hard_question_research_runs (hard_question_id, created_at DESC);

CREATE INDEX idx_hard_question_research_runs_user_created
  ON public.hard_question_research_runs (user_id, created_at DESC);

ALTER TABLE public.framework_hard_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hard_question_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hard_question_research_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "framework_hard_questions_select_own"
  ON public.framework_hard_questions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "framework_hard_questions_insert_own"
  ON public.framework_hard_questions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "framework_hard_questions_update_own"
  ON public.framework_hard_questions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "framework_hard_questions_delete_own"
  ON public.framework_hard_questions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "hard_question_sources_select_own"
  ON public.hard_question_sources FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "hard_question_sources_insert_own"
  ON public.hard_question_sources FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "hard_question_sources_update_own"
  ON public.hard_question_sources FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "hard_question_sources_delete_own"
  ON public.hard_question_sources FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "hard_question_research_runs_select_own"
  ON public.hard_question_research_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "hard_question_research_runs_insert_own"
  ON public.hard_question_research_runs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "hard_question_research_runs_update_own"
  ON public.hard_question_research_runs FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_framework_hard_questions_updated
  BEFORE UPDATE ON public.framework_hard_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
