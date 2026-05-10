
-- Belief nodes
CREATE TABLE public.belief_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  layer TEXT NOT NULL, -- foundations | life | mechanics | emotional
  topic TEXT NOT NULL,
  statement TEXT NOT NULL,
  answer TEXT,
  confidence INTEGER NOT NULL DEFAULT 50,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.belief_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.belief_nodes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.belief_nodes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.belief_nodes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.belief_nodes FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_belief_nodes_user_layer ON public.belief_nodes(user_id, layer);

-- Belief scriptures
CREATE TABLE public.belief_scriptures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  belief_id UUID NOT NULL REFERENCES public.belief_nodes(id) ON DELETE CASCADE,
  ref TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'supports', -- supports | challenges
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.belief_scriptures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.belief_scriptures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.belief_scriptures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.belief_scriptures FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.belief_scriptures FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_belief_scriptures_belief ON public.belief_scriptures(belief_id);

-- Belief sources
CREATE TABLE public.belief_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  belief_id UUID NOT NULL REFERENCES public.belief_nodes(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- mentor | denomination | podcast | scripture | experience | book | other
  label TEXT NOT NULL,
  artifact_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.belief_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.belief_sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.belief_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.belief_sources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.belief_sources FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_belief_sources_belief ON public.belief_sources(belief_id);

-- Belief versions
CREATE TABLE public.belief_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  belief_id UUID NOT NULL REFERENCES public.belief_nodes(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.belief_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.belief_versions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.belief_versions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.belief_versions FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_belief_versions_belief ON public.belief_versions(belief_id);

-- Artifacts
CREATE TABLE public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL, -- text | youtube | podcast | journal | voice
  title TEXT,
  url TEXT,
  raw_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | analyzing | ready | error
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.artifacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.artifacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.artifacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.artifacts FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_artifacts_user ON public.artifacts(user_id, created_at DESC);

-- Artifact claims
CREATE TABLE public.artifact_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  claim TEXT NOT NULL,
  tone TEXT,
  doctrine_tags TEXT[] NOT NULL DEFAULT '{}',
  scripture_supports JSONB NOT NULL DEFAULT '[]'::jsonb,
  scripture_challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
  matched_belief_id UUID REFERENCES public.belief_nodes(id) ON DELETE SET NULL,
  match_relation TEXT, -- agree | disagree | new
  bias_flags TEXT[] NOT NULL DEFAULT '{}',
  verdict TEXT, -- keep | reject | updated
  user_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artifact_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.artifact_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.artifact_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.artifact_claims FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.artifact_claims FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_artifact_claims_artifact ON public.artifact_claims(artifact_id);

-- Belief links
CREATE TABLE public.belief_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  a_id UUID NOT NULL REFERENCES public.belief_nodes(id) ON DELETE CASCADE,
  b_id UUID NOT NULL REFERENCES public.belief_nodes(id) ON DELETE CASCADE,
  relation TEXT NOT NULL DEFAULT 'related', -- supports | contradicts | related
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.belief_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.belief_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.belief_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.belief_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.belief_links FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_belief_links_user ON public.belief_links(user_id);

-- updated_at triggers
CREATE TRIGGER trg_belief_nodes_updated BEFORE UPDATE ON public.belief_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_artifacts_updated BEFORE UPDATE ON public.artifacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
