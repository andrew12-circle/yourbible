-- George Müller–style prayer requests, timeline events, and journal links.

CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  prayer_text text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'guidance' CHECK (
    category IN ('family', 'business', 'health', 'ministry', 'finances', 'guidance', 'protection')
  ),
  status text NOT NULL DEFAULT 'waiting' CHECK (
    status IN ('waiting', 'partial', 'answered', 'different_answer', 'closed')
  ),
  requested_at date NOT NULL DEFAULT CURRENT_DATE,
  answered_at date,
  answer_text text,
  private_notes text NOT NULL DEFAULT '',
  scripture_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  praise_report_entry_id uuid REFERENCES public.journal_entries (id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_status
  ON public.prayer_requests (user_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_answered
  ON public.prayer_requests (user_id, answered_at DESC)
  WHERE answered_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.prayer_request_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  prayer_request_id uuid NOT NULL REFERENCES public.prayer_requests (id) ON DELETE CASCADE,
  event_kind text NOT NULL CHECK (
    event_kind IN (
      'asked', 'note', 'scripture', 'journal', 'artifact',
      'dream', 'worship', 'gratitude', 'opportunity', 'answered', 'praise'
    )
  ),
  title text NOT NULL,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  link_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prayer_timeline_request
  ON public.prayer_request_timeline_events (prayer_request_id, occurred_at ASC);

CREATE INDEX IF NOT EXISTS idx_prayer_timeline_user
  ON public.prayer_request_timeline_events (user_id, occurred_at DESC);

DROP TRIGGER IF EXISTS trg_prayer_requests_updated ON public.prayer_requests;
CREATE TRIGGER trg_prayer_requests_updated
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_request_timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prayer_requests_select_own" ON public.prayer_requests;
CREATE POLICY "prayer_requests_select_own" ON public.prayer_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "prayer_requests_insert_own" ON public.prayer_requests;
CREATE POLICY "prayer_requests_insert_own" ON public.prayer_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "prayer_requests_update_own" ON public.prayer_requests;
CREATE POLICY "prayer_requests_update_own" ON public.prayer_requests
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "prayer_requests_delete_own" ON public.prayer_requests;
CREATE POLICY "prayer_requests_delete_own" ON public.prayer_requests
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "prayer_timeline_select_own" ON public.prayer_request_timeline_events;
CREATE POLICY "prayer_timeline_select_own" ON public.prayer_request_timeline_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "prayer_timeline_insert_own" ON public.prayer_request_timeline_events;
CREATE POLICY "prayer_timeline_insert_own" ON public.prayer_request_timeline_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "prayer_timeline_update_own" ON public.prayer_request_timeline_events;
CREATE POLICY "prayer_timeline_update_own" ON public.prayer_request_timeline_events
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "prayer_timeline_delete_own" ON public.prayer_request_timeline_events;
CREATE POLICY "prayer_timeline_delete_own" ON public.prayer_request_timeline_events
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Extend journal_entry_links for prayer request backlinks.
ALTER TABLE public.journal_entry_links
  DROP CONSTRAINT IF EXISTS journal_entry_links_target_kind_check;

ALTER TABLE public.journal_entry_links
  ADD CONSTRAINT journal_entry_links_target_kind_check
  CHECK (
    target_kind IN (
      'verse', 'belief', 'tension', 'study', 'daily',
      'chat_thread', 'artifact', 'prompt', 'entry', 'entity', 'prayer_request'
    )
  );
