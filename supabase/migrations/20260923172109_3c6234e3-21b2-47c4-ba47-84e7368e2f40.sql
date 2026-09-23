-- Read-only, owner-scoped list/search. No journal content is rewritten.
CREATE OR REPLACE FUNCTION public.journal_entry_list_page(
  p_journal_id uuid DEFAULT NULL,
  p_exclude_journal_ids uuid[] DEFAULT '{}'::uuid[],
  p_entry_kind text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_include_encrypted boolean DEFAULT false,
  p_sort_updated boolean DEFAULT false
) RETURNS TABLE (
  id uuid, user_id uuid, title text, body text, summary text,
  entry_at_ts timestamptz, updated_at timestamptz, mood smallint,
  location_name text, weather text, weather_temp_c numeric, weather_icon text,
  pinned boolean, analyze_for_mirror boolean, journal_id uuid,
  entry_kind text, e2e_encrypted boolean
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $function$
  SELECT e.id, e.user_id, e.title,
    CASE WHEN e.e2e_encrypted
      THEN e.body ELSE left(e.body, 512) END,
    e.summary, e.entry_at_ts, e.updated_at, e.mood,
    e.location_name, e.weather, e.weather_temp_c, e.weather_icon,
    e.pinned, e.analyze_for_mirror, e.journal_id, e.entry_kind, e.e2e_encrypted
  FROM public.journal_entries AS e
  WHERE e.user_id = (SELECT auth.uid())
    AND (p_journal_id IS NULL OR e.journal_id = p_journal_id)
    AND (e.journal_id IS NULL OR NOT (e.journal_id = ANY(COALESCE(p_exclude_journal_ids, '{}'::uuid[]))))
    AND ((p_entry_kind IS NOT NULL AND e.entry_kind = p_entry_kind)
      OR (p_entry_kind IS NULL AND (e.entry_kind IS NULL OR e.entry_kind <> 'vent')))
    AND (NULLIF(btrim(p_search), '') IS NULL
      OR (NOT e.e2e_encrypted AND strpos(lower(concat_ws(' ', e.title, e.body, e.summary, e.location_name)), lower(btrim(p_search))) > 0)
      OR (e.e2e_encrypted AND p_include_encrypted))
  ORDER BY e.pinned DESC,
    CASE WHEN p_sort_updated THEN e.updated_at ELSE e.entry_at_ts END DESC,
    e.id DESC
  OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
$function$;
REVOKE ALL ON FUNCTION public.journal_entry_list_page(uuid, uuid[], text, text, integer, integer, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.journal_entry_list_page(uuid, uuid[], text, text, integer, integer, boolean, boolean) TO authenticated;

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