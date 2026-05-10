CREATE TABLE public.chat_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  mode text NOT NULL DEFAULT 'socratic',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.chat_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.chat_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.chat_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.chat_threads FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_chat_threads_user ON public.chat_threads(user_id, updated_at DESC);
CREATE TRIGGER update_chat_threads_updated_at BEFORE UPDATE ON public.chat_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id, created_at);

CREATE TABLE public.study_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  topic text NOT NULL,
  summary text NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_belief_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.study_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.study_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.study_plans FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_study_plans_user ON public.study_plans(user_id, created_at DESC);

CREATE TABLE public.tradition_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  belief_id uuid NOT NULL,
  traditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, belief_id)
);
ALTER TABLE public.tradition_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.tradition_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.tradition_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.tradition_views FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.tradition_views FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_tradition_views_updated_at BEFORE UPDATE ON public.tradition_views
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.daily_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  reference text NOT NULL,
  passage text NOT NULL,
  reason text NOT NULL,
  prompt text NOT NULL,
  belief_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
ALTER TABLE public.daily_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.daily_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.daily_readings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.daily_readings FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_daily_readings_user ON public.daily_readings(user_id, date DESC);