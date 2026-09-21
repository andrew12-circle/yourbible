-- Align review storage and make daily journal creation idempotent across devices.
-- No existing entry, recording, text, policy, or encryption safeguard is removed.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.living_hope_reviews
  ADD COLUMN IF NOT EXISTS connection_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.ensure_morning_formula_entry(
  p_review_date date, p_journal_id uuid, p_title text, p_body text,
  p_context jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE(entry_id uuid, created boolean)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE uid uuid := auth.uid(); found_id uuid; day_tag text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to start your morning journal' USING ERRCODE = '42501'; END IF;
  IF p_review_date IS NULL OR p_title IS NULL OR p_body IS NULL THEN RAISE EXCEPTION 'Missing morning journal details'; END IF;
  day_tag := 'lh-conversation:' || to_char(p_review_date, 'YYYY-MM-DD');
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text || ':' || day_tag, 0));
  SELECT e.id INTO found_id FROM public.journal_entries e
    WHERE e.user_id = uid AND e.entry_kind = 'morning_conversation' AND e.tags @> ARRAY[day_tag]
    ORDER BY e.created_at ASC LIMIT 1;
  IF found_id IS NOT NULL THEN RETURN QUERY SELECT found_id, false; RETURN; END IF;
  IF p_journal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.journals j WHERE j.id = p_journal_id AND j.user_id = uid
  ) THEN RAISE EXCEPTION 'Journal ownership mismatch' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.journal_entries(user_id,journal_id,title,body,summary,entry_kind,entry_at,entry_at_ts,tags,analyze_for_mirror,
    location_name,lat,lng,weather,weather_temp_c,weather_icon)
  VALUES(uid,p_journal_id,p_title,p_body,'Today''s morning formula','morning_conversation',p_review_date,now(),
    ARRAY[day_tag,'living-hope','morning-formula','conversation'],true,
    p_context->>'location_name',(p_context->>'lat')::double precision,(p_context->>'lng')::double precision,
    p_context->>'weather',(p_context->>'weather_temp_c')::double precision,p_context->>'weather_icon')
  RETURNING id INTO found_id;
  RETURN QUERY SELECT found_id, true;
END;
$function$;
REVOKE ALL ON FUNCTION public.ensure_morning_formula_entry(date,uuid,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_morning_formula_entry(date,uuid,text,text,jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
