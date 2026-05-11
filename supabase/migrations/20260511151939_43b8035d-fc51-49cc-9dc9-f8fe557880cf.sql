ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS target_ref jsonb;
ALTER TABLE public.belief_nodes ADD COLUMN IF NOT EXISTS is_core boolean NOT NULL DEFAULT false;
ALTER TABLE public.belief_nodes ADD COLUMN IF NOT EXISTS core_scope text;
CREATE INDEX IF NOT EXISTS idx_belief_nodes_user_core_scope ON public.belief_nodes (user_id, core_scope) WHERE core_scope IS NOT NULL;