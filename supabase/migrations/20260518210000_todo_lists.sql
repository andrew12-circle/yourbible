-- Todo lists & items (RLS owner-only). Smart views (today, upcoming) are client-side filters.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.todo_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  archived_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT todo_lists_user_slug UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS public.todo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  list_id uuid REFERENCES public.todo_lists (id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.todo_items (id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  due_date date,
  priority smallint NOT NULL DEFAULT 0 CHECK (priority >= 0 AND priority <= 3),
  sort_order int NOT NULL DEFAULT 0,
  notes text,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_todo_lists_user_active
  ON public.todo_lists (user_id, sort_order)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_todo_items_user_open
  ON public.todo_items (user_id, done, sort_order)
  WHERE done = false;

CREATE INDEX IF NOT EXISTS idx_todo_items_user_list
  ON public.todo_items (user_id, list_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_todo_items_user_due
  ON public.todo_items (user_id, due_date)
  WHERE done = false AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_todo_items_parent
  ON public.todo_items (parent_id)
  WHERE parent_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_todo_lists_updated ON public.todo_lists;
CREATE TRIGGER trg_todo_lists_updated
  BEFORE UPDATE ON public.todo_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_todo_items_updated ON public.todo_items;
CREATE TRIGGER trg_todo_items_updated
  BEFORE UPDATE ON public.todo_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Seed default Inbox list
-- ---------------------------------------------------------------------------

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

  IF EXISTS (SELECT 1 FROM public.todo_lists tl WHERE tl.user_id = v_uid LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.todo_lists (user_id, name, slug, sort_order, color)
  VALUES (v_uid, 'Inbox', 'inbox', 0, 'zinc-500');
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_todo_lists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_todo_lists() TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.todo_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "todo_lists_select_own" ON public.todo_lists;
CREATE POLICY "todo_lists_select_own" ON public.todo_lists
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "todo_lists_insert_own" ON public.todo_lists;
CREATE POLICY "todo_lists_insert_own" ON public.todo_lists
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "todo_lists_update_own" ON public.todo_lists;
CREATE POLICY "todo_lists_update_own" ON public.todo_lists
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "todo_lists_delete_own" ON public.todo_lists;
CREATE POLICY "todo_lists_delete_own" ON public.todo_lists
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "todo_items_select_own" ON public.todo_items;
CREATE POLICY "todo_items_select_own" ON public.todo_items
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "todo_items_insert_own" ON public.todo_items;
CREATE POLICY "todo_items_insert_own" ON public.todo_items
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      list_id IS NULL
      OR EXISTS (SELECT 1 FROM public.todo_lists l WHERE l.id = list_id AND l.user_id = auth.uid())
    )
    AND (
      parent_id IS NULL
      OR EXISTS (SELECT 1 FROM public.todo_items p WHERE p.id = parent_id AND p.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "todo_items_update_own" ON public.todo_items;
CREATE POLICY "todo_items_update_own" ON public.todo_items
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      list_id IS NULL
      OR EXISTS (SELECT 1 FROM public.todo_lists l WHERE l.id = list_id AND l.user_id = auth.uid())
    )
    AND (
      parent_id IS NULL
      OR EXISTS (SELECT 1 FROM public.todo_items p WHERE p.id = parent_id AND p.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "todo_items_delete_own" ON public.todo_items;
CREATE POLICY "todo_items_delete_own" ON public.todo_items
  FOR DELETE TO authenticated USING (user_id = auth.uid());
