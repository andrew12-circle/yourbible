-- Default Home & Projects folder for big someday tasks.

CREATE OR REPLACE FUNCTION public.ensure_default_todo_lists()
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

  IF NOT EXISTS (SELECT 1 FROM public.todo_lists tl WHERE tl.user_id = v_uid AND tl.slug = 'inbox') THEN
    INSERT INTO public.todo_lists (user_id, name, slug, sort_order, color, kind)
    VALUES (v_uid, 'Inbox', 'inbox', 0, 'zinc-500', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.todo_lists tl WHERE tl.user_id = v_uid AND tl.slug = 'work') THEN
    INSERT INTO public.todo_lists (user_id, name, slug, sort_order, color, kind)
    VALUES (v_uid, 'Work', 'work', 1, 'blue-500', 'work');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.todo_lists tl WHERE tl.user_id = v_uid AND tl.slug = 'personal') THEN
    INSERT INTO public.todo_lists (user_id, name, slug, sort_order, color, kind)
    VALUES (v_uid, 'Personal', 'personal', 2, 'emerald-500', 'personal');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.todo_lists tl WHERE tl.user_id = v_uid AND tl.slug = 'home') THEN
    INSERT INTO public.todo_lists (user_id, name, slug, sort_order, color, kind)
    VALUES (v_uid, 'Home & Projects', 'home', 3, 'amber-600', NULL);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_todo_lists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_todo_lists() TO authenticated;
