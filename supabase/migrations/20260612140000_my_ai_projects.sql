-- My AI project folders for organizing chat threads.

CREATE TABLE IF NOT EXISTS public.my_ai_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.my_ai_chats
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.my_ai_projects (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS my_ai_projects_user_sort_idx
  ON public.my_ai_projects (user_id, sort_order);

CREATE INDEX IF NOT EXISTS my_ai_chats_project_idx
  ON public.my_ai_chats (user_id, project_id, updated_at DESC)
  WHERE project_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_my_ai_projects_updated_at ON public.my_ai_projects;
CREATE TRIGGER update_my_ai_projects_updated_at
  BEFORE UPDATE ON public.my_ai_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.my_ai_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "my_ai_projects_select_own" ON public.my_ai_projects;
CREATE POLICY "my_ai_projects_select_own"
  ON public.my_ai_projects FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "my_ai_projects_insert_own" ON public.my_ai_projects;
CREATE POLICY "my_ai_projects_insert_own"
  ON public.my_ai_projects FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "my_ai_projects_update_own" ON public.my_ai_projects;
CREATE POLICY "my_ai_projects_update_own"
  ON public.my_ai_projects FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "my_ai_projects_delete_own" ON public.my_ai_projects;
CREATE POLICY "my_ai_projects_delete_own"
  ON public.my_ai_projects FOR DELETE TO authenticated
  USING (user_id = auth.uid());
