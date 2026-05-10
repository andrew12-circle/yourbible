CREATE TABLE public.belief_tensions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  a_id uuid NOT NULL,
  b_id uuid NOT NULL,
  layer text,
  severity integer NOT NULL DEFAULT 50,
  summary text NOT NULL,
  explanation text,
  suggested_resolution text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.belief_tensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.belief_tensions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.belief_tensions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.belief_tensions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.belief_tensions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_belief_tensions_user ON public.belief_tensions(user_id);
CREATE INDEX idx_belief_tensions_status ON public.belief_tensions(user_id, status);

CREATE TRIGGER update_belief_tensions_updated_at
BEFORE UPDATE ON public.belief_tensions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();