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
