-- Private bucket for user-scoped artifact imports (ChatGPT export, PDF, large text).
-- RLS: authenticated users may insert/select/update/delete only objects whose storage
-- key lives under their user id folder (`<auth.uid()>/...`), enforced via `storage.foldername(name)[1]`.
INSERT INTO storage.buckets (id, name, public)
VALUES ('artifact-uploads', 'artifact-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "artifact-uploads own select" ON storage.objects FOR SELECT
  USING (bucket_id = 'artifact-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "artifact-uploads own insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'artifact-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "artifact-uploads own update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'artifact-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "artifact-uploads own delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'artifact-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
