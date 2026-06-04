-- Persisted validation/research packs per claim + lightweight analytics events.

CREATE TABLE public.artifact_claim_research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_claim_id uuid NOT NULL REFERENCES public.artifact_claims(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  pack_type text NOT NULL DEFAULT 'validation' CHECK (pack_type IN ('standard', 'validation')),
  use_web boolean NOT NULL DEFAULT false,
  pack_json jsonb NOT NULL,
  brief_summary text,
  user_question text,
  opened_at timestamptz,
  first_chat_at timestamptz,
  verdict_at timestamptz,
  verdict text
);

CREATE INDEX idx_claim_research_runs_claim_created
  ON public.artifact_claim_research_runs (artifact_claim_id, created_at DESC);

CREATE INDEX idx_claim_research_runs_user_created
  ON public.artifact_claim_research_runs (user_id, created_at DESC);

ALTER TABLE public.artifact_claim_research_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select claim research runs"
  ON public.artifact_claim_research_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own insert claim research runs"
  ON public.artifact_claim_research_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own update claim research runs"
  ON public.artifact_claim_research_runs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TABLE public.claim_research_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_claim_id uuid NOT NULL REFERENCES public.artifact_claims(id) ON DELETE CASCADE,
  artifact_id uuid REFERENCES public.artifacts(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (
    event_type IN ('opened', 'brief_loaded', 'brief_cached', 'message_sent', 'verdict_set', 'reflect_saved', 'full_report_opened')
  ),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_claim_research_events_claim_created
  ON public.claim_research_events (artifact_claim_id, created_at DESC);

ALTER TABLE public.claim_research_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select claim research events"
  ON public.claim_research_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own insert claim research events"
  ON public.claim_research_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
