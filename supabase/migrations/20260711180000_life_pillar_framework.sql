-- Align life priorities and habits with the four-pillar framework:
-- 1 Abide · 2 Build the temple · 3 Family · 4 Work (archive Others for new defaults)

-- ---------------------------------------------------------------------------
-- Life priorities: four-lane defaults + migrate existing rows
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_default_life_priorities()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.life_priorities lp WHERE lp.user_id = v_uid LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.life_priorities (user_id, rank, key, label, intention, daily_target_minutes, color)
  VALUES
    (v_uid, 1, 'god', 'Abide', 'Pray · Scripture · worship', 20, 'amber-500'),
    (v_uid, 2, 'health', 'Build the temple', 'Sleep · nourishment · exercise · recovery', 30, 'rose-500'),
    (v_uid, 3, 'family', 'Family', 'Presence · conversation · care', 45, 'sky-500'),
    (v_uid, 4, 'work', 'Work', 'Focused blocks · clear priorities', 120, 'violet-500');
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_life_priorities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_life_priorities() TO authenticated;

UPDATE public.life_priorities
SET
  label = 'Abide',
  intention = 'Pray · Scripture · worship'
WHERE key = 'god'
  AND archived_at IS NULL
  AND (label = 'God' OR intention = 'Pray · read Scripture · quiet my heart');

UPDATE public.life_priorities
SET
  label = 'Build the temple',
  intention = 'Sleep · nourishment · exercise · recovery'
WHERE key = 'health'
  AND archived_at IS NULL
  AND (label = 'Health' OR intention = 'Move · sleep · nourishment');

UPDATE public.life_priorities
SET archived_at = now()
WHERE key = 'others'
  AND archived_at IS NULL;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.life_priorities
  LOOP
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY rank ASC, key ASC) AS new_rank
      FROM public.life_priorities
      WHERE user_id = r.user_id
        AND archived_at IS NULL
    )
    UPDATE public.life_priorities lp
    SET rank = o.new_rank::smallint
    FROM ordered o
    WHERE lp.id = o.id;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Habits: rename categories and restore template order (temple before family)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_habit_framework_template()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_names text[] := ARRAY[
    'Daily Alignment (worship, gratitude, Scripture, prayer)',
    'Morning hygiene complete',
    'Filled water bottle',
    'Finished water goal',
    'Move for 20 minutes',
    'Ate three real meals (or equivalent nutrition)',
    'Shutdown routine complete',
    'In bed for next sleep block',
    '15 minutes uninterrupted with Tish',
    'Read or pray with Lilly',
    'Held, fed, or intentionally connected with Caroline',
    'One deep-work session',
    'Cleared critical communications'
  ];
  v_categories text[] := ARRAY[
    'Abide',
    'Build the temple',
    'Build the temple',
    'Build the temple',
    'Build the temple',
    'Build the temple',
    'Build the temple',
    'Build the temple',
    'Family',
    'Family',
    'Family',
    'Work',
    'Work'
  ];
  i int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  FOR i IN 1..array_length(v_names, 1)
  LOOP
    UPDATE public.habits
    SET
      sort_order = i - 1,
      category = v_categories[i]
    WHERE user_id = v_uid
      AND archived_at IS NULL
      AND name = v_names[i];
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_habit_framework_template() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_habit_framework_template() TO authenticated;
