-- AI usage and estimated cost tracking (edge functions log via service role).
CREATE TABLE public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  artifact_id uuid REFERENCES public.artifacts(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  chat_id uuid REFERENCES public.my_ai_chats(id) ON DELETE SET NULL,

  function_name text NOT NULL,
  operation text NOT NULL,
  provider text NOT NULL,
  model text,

  input_chars integer,
  output_chars integer,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  embedding_dims integer,
  batch_size integer NOT NULL DEFAULT 1,
  duration_ms integer,
  audio_seconds numeric(12, 2),

  status text NOT NULL CHECK (status IN ('ok', 'error', 'rate_limit', 'billing')),
  http_status integer,
  error_message text,

  estimated_usd numeric(14, 8),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select ai usage" ON public.ai_usage_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_ai_usage_events_user_created
  ON public.ai_usage_events (user_id, created_at DESC);

CREATE INDEX idx_ai_usage_events_artifact
  ON public.ai_usage_events (artifact_id)
  WHERE artifact_id IS NOT NULL;

CREATE INDEX idx_ai_usage_events_function_created
  ON public.ai_usage_events (function_name, created_at DESC);

-- Aggregated totals for Settings UI (authenticated user only).
CREATE OR REPLACE FUNCTION public.get_ai_usage_totals(p_days integer DEFAULT 30)
RETURNS TABLE (
  provider text,
  operation text,
  call_count bigint,
  total_tokens bigint,
  estimated_usd numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.provider,
    e.operation,
    count(*)::bigint AS call_count,
    coalesce(sum(e.total_tokens), 0)::bigint AS total_tokens,
    coalesce(sum(e.estimated_usd), 0)::numeric AS estimated_usd
  FROM public.ai_usage_events e
  WHERE e.user_id = auth.uid()
    AND e.created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
  GROUP BY e.provider, e.operation
  ORDER BY estimated_usd DESC NULLS LAST, call_count DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage_daily(p_days integer DEFAULT 30)
RETURNS TABLE (
  day date,
  call_count bigint,
  total_tokens bigint,
  estimated_usd numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (e.created_at AT TIME ZONE 'UTC')::date AS day,
    count(*)::bigint AS call_count,
    coalesce(sum(e.total_tokens), 0)::bigint AS total_tokens,
    coalesce(sum(e.estimated_usd), 0)::numeric AS estimated_usd
  FROM public.ai_usage_events e
  WHERE e.user_id = auth.uid()
    AND e.created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
  GROUP BY (e.created_at AT TIME ZONE 'UTC')::date
  ORDER BY day ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage_by_function(p_days integer DEFAULT 30)
RETURNS TABLE (
  function_name text,
  call_count bigint,
  estimated_usd numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.function_name,
    count(*)::bigint AS call_count,
    coalesce(sum(e.estimated_usd), 0)::numeric AS estimated_usd
  FROM public.ai_usage_events e
  WHERE e.user_id = auth.uid()
    AND e.created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
  GROUP BY e.function_name
  ORDER BY estimated_usd DESC NULLS LAST, call_count DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_usage_totals(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_daily(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_by_function(integer) TO authenticated;
