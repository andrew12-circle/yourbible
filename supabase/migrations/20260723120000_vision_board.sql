-- Freeform Life vision board: one board per user with positioned items.

CREATE TABLE IF NOT EXISTS public.vision_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  background_key text NOT NULL DEFAULT 'cork',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vision_boards_user_id_unique UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.vision_board_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.vision_boards (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('photo', 'note', 'pin')),
  x double precision NOT NULL DEFAULT 100,
  y double precision NOT NULL DEFAULT 100,
  width double precision NOT NULL DEFAULT 200,
  height double precision NOT NULL DEFAULT 200,
  rotation double precision NOT NULL DEFAULT 0,
  z_index int NOT NULL DEFAULT 0,
  text text,
  note_color text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vision_board_items_board
  ON public.vision_board_items (board_id, z_index ASC);

CREATE INDEX IF NOT EXISTS idx_vision_board_items_user
  ON public.vision_board_items (user_id);

DROP TRIGGER IF EXISTS trg_vision_boards_updated ON public.vision_boards;
CREATE TRIGGER trg_vision_boards_updated
  BEFORE UPDATE ON public.vision_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vision_board_items_updated ON public.vision_board_items;
CREATE TRIGGER trg_vision_board_items_updated
  BEFORE UPDATE ON public.vision_board_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vision_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_board_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vision_boards_select_own" ON public.vision_boards;
CREATE POLICY "vision_boards_select_own" ON public.vision_boards
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "vision_boards_insert_own" ON public.vision_boards;
CREATE POLICY "vision_boards_insert_own" ON public.vision_boards
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "vision_boards_update_own" ON public.vision_boards;
CREATE POLICY "vision_boards_update_own" ON public.vision_boards
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "vision_boards_delete_own" ON public.vision_boards;
CREATE POLICY "vision_boards_delete_own" ON public.vision_boards
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "vision_board_items_select_own" ON public.vision_board_items;
CREATE POLICY "vision_board_items_select_own" ON public.vision_board_items
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "vision_board_items_insert_own" ON public.vision_board_items;
CREATE POLICY "vision_board_items_insert_own" ON public.vision_board_items
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "vision_board_items_update_own" ON public.vision_board_items;
CREATE POLICY "vision_board_items_update_own" ON public.vision_board_items
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "vision_board_items_delete_own" ON public.vision_board_items;
CREATE POLICY "vision_board_items_delete_own" ON public.vision_board_items
  FOR DELETE TO authenticated USING (user_id = auth.uid());
