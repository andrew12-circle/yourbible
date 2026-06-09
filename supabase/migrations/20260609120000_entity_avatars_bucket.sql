-- Public cache for AI-generated entity portraits (biblical figures, etc.).
INSERT INTO storage.buckets (id, name, public)
VALUES ('entity-avatars', 'entity-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Edge functions upload via service role; clients read via public bucket URL.
