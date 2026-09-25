-- Provision Ledger: specific requests, accounting detail, recurring obligations.

ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'important',
  ADD COLUMN IF NOT EXISTS consequence text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provision_source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS need_kind text NOT NULL DEFAULT 'need',
  ADD COLUMN IF NOT EXISTS recurring_template_id uuid,
  ADD COLUMN IF NOT EXISTS occurrence_month date;

ALTER TABLE public.prayer_requests
  DROP CONSTRAINT IF EXISTS prayer_requests_priority_check;
ALTER TABLE public.prayer_requests
  ADD CONSTRAINT prayer_requests_priority_check
  CHECK (priority IN ('critical','required','important','desired','long_term'));

ALTER TABLE public.prayer_requests
  DROP CONSTRAINT IF EXISTS prayer_requests_need_kind_check;
ALTER TABLE public.prayer_requests
  ADD CONSTRAINT prayer_requests_need_kind_check
  CHECK (need_kind IN ('need','desire','restoration','business_goal'));

ALTER TABLE public.prayer_requests
  DROP CONSTRAINT IF EXISTS prayer_requests_status_check;
ALTER TABLE public.prayer_requests
  ADD CONSTRAINT prayer_requests_status_check
  CHECK (status IN ('waiting','in_motion','partial','answered','different_answer','closed'));

CREATE TABLE IF NOT EXISTS public.provision_recurring_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount_requested numeric(12,2),
  due_day smallint CHECK (due_day BETWEEN 1 AND 31),
  category text NOT NULL DEFAULT 'finances' CHECK (
    category IN ('family','business','health','ministry','finances','guidance','protection')
  ),
  priority text NOT NULL DEFAULT 'required' CHECK (
    priority IN ('critical','required','important','desired','long_term')
  ),
  need_kind text NOT NULL DEFAULT 'need' CHECK (
    need_kind IN ('need','desire','restoration','business_goal')
  ),
  purpose text NOT NULL DEFAULT '',
  consequence text NOT NULL DEFAULT '',
  prayer_text text NOT NULL DEFAULT '',
  private_notes text NOT NULL DEFAULT '',
  scripture_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  cadence text NOT NULL DEFAULT 'monthly' CHECK (cadence IN ('monthly','quarterly','annual')),
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  ends_on date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_requests
  DROP CONSTRAINT IF EXISTS prayer_requests_recurring_template_id_fkey;
ALTER TABLE public.prayer_requests
  ADD CONSTRAINT prayer_requests_recurring_template_id_fkey
  FOREIGN KEY (recurring_template_id)
  REFERENCES public.provision_recurring_needs(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prayer_requests_recurring_occurrence
  ON public.prayer_requests(user_id, recurring_template_id, occurrence_month)
  WHERE recurring_template_id IS NOT NULL AND occurrence_month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_priority_deadline
  ON public.prayer_requests(user_id, priority, deadline)
  WHERE status IN ('waiting','in_motion','partial');

CREATE INDEX IF NOT EXISTS idx_provision_recurring_needs_user_active
  ON public.provision_recurring_needs(user_id, active, starts_on);

DROP TRIGGER IF EXISTS trg_provision_recurring_needs_updated ON public.provision_recurring_needs;
CREATE TRIGGER trg_provision_recurring_needs_updated
  BEFORE UPDATE ON public.provision_recurring_needs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.provision_recurring_needs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provision_recurring_needs_select_own" ON public.provision_recurring_needs;
CREATE POLICY "provision_recurring_needs_select_own" ON public.provision_recurring_needs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "provision_recurring_needs_insert_own" ON public.provision_recurring_needs;
CREATE POLICY "provision_recurring_needs_insert_own" ON public.provision_recurring_needs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "provision_recurring_needs_update_own" ON public.provision_recurring_needs;
CREATE POLICY "provision_recurring_needs_update_own" ON public.provision_recurring_needs
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "provision_recurring_needs_delete_own" ON public.provision_recurring_needs;
CREATE POLICY "provision_recurring_needs_delete_own" ON public.provision_recurring_needs
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.ensure_provision_occurrences(p_month date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_month date := date_trunc('month', p_month)::date;
  v_month_end date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  v_inserted integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.prayer_requests (
    user_id,
    title,
    prayer_text,
    purpose,
    category,
    status,
    requested_at,
    deadline,
    amount_requested,
    private_notes,
    scripture_refs,
    priority,
    consequence,
    need_kind,
    recurring_template_id,
    occurrence_month
  )
  SELECT
    t.user_id,
    t.title,
    t.prayer_text,
    t.purpose,
    t.category,
    'waiting',
    GREATEST(t.starts_on, v_month),
    CASE
      WHEN t.due_day IS NULL THEN NULL
      ELSE LEAST((v_month + (t.due_day - 1) * interval '1 day')::date, v_month_end)
    END,
    t.amount_requested,
    t.private_notes,
    t.scripture_refs,
    t.priority,
    t.consequence,
    t.need_kind,
    t.id,
    v_month
  FROM public.provision_recurring_needs t
  WHERE t.user_id = v_uid
    AND t.active = true
    AND t.starts_on <= v_month_end
    AND (t.ends_on IS NULL OR t.ends_on >= v_month)
    AND (
      t.cadence = 'monthly'
      OR (
        t.cadence = 'quarterly'
        AND ((extract(year from v_month)::int * 12 + extract(month from v_month)::int)
          - (extract(year from date_trunc('month', t.starts_on))::int * 12
          + extract(month from date_trunc('month', t.starts_on))::int)) % 3 = 0
      )
      OR (
        t.cadence = 'annual'
        AND ((extract(year from v_month)::int * 12 + extract(month from v_month)::int)
          - (extract(year from date_trunc('month', t.starts_on))::int * 12
          + extract(month from date_trunc('month', t.starts_on))::int)) % 12 = 0
      )
    )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_provision_occurrences(date) TO authenticated;
