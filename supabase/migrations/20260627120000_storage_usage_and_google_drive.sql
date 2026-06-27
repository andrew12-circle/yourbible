-- Per-user Supabase Storage usage (journal + artifacts buckets).
-- Google Drive OAuth for optional cloud backup.

CREATE OR REPLACE FUNCTION public.get_my_storage_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  uid uuid := auth.uid();
  journal_bytes bigint := 0;
  artifacts_bytes bigint := 0;
  photos_bytes bigint := 0;
  videos_bytes bigint := 0;
  voice_bytes bigint := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT coalesce(sum((metadata->>'size')::bigint), 0) INTO photos_bytes
  FROM storage.objects
  WHERE bucket_id = 'journal-photos'
    AND (storage.foldername(name))[1] = uid::text;

  SELECT coalesce(sum((metadata->>'size')::bigint), 0) INTO videos_bytes
  FROM storage.objects
  WHERE bucket_id = 'journal-videos'
    AND (storage.foldername(name))[1] = uid::text;

  SELECT coalesce(sum((metadata->>'size')::bigint), 0) INTO voice_bytes
  FROM storage.objects
  WHERE bucket_id = 'voice-memos'
    AND (storage.foldername(name))[1] = uid::text;

  SELECT coalesce(sum((metadata->>'size')::bigint), 0) INTO artifacts_bytes
  FROM storage.objects
  WHERE bucket_id = 'artifact-uploads'
    AND (storage.foldername(name))[1] = uid::text;

  journal_bytes := photos_bytes + videos_bytes + voice_bytes;

  RETURN jsonb_build_object(
    'journal_bytes', journal_bytes,
    'artifacts_bytes', artifacts_bytes,
    'total_bytes', journal_bytes + artifacts_bytes,
    'breakdown', jsonb_build_object(
      'journal_photos_bytes', photos_bytes,
      'journal_videos_bytes', videos_bytes,
      'voice_memos_bytes', voice_bytes,
      'artifact_uploads_bytes', artifacts_bytes
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_storage_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_storage_usage() TO authenticated;

COMMENT ON FUNCTION public.get_my_storage_usage IS
  'Returns Supabase Storage bytes for the current user (journal photos/videos/voice + artifact uploads).';

-- Lists storage objects for Google Drive backup (service role / edge functions only).
CREATE OR REPLACE FUNCTION public.list_user_storage_objects_for_backup(p_user_id uuid)
RETURNS TABLE (bucket_id text, name text, size_bytes bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT o.bucket_id,
         o.name,
         coalesce((o.metadata->>'size')::bigint, 0)::bigint AS size_bytes
  FROM storage.objects o
  WHERE o.bucket_id IN ('journal-photos', 'journal-videos', 'voice-memos', 'artifact-uploads')
    AND (storage.foldername(o.name))[1] = p_user_id::text
  ORDER BY o.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.list_user_storage_objects_for_backup(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_user_storage_objects_for_backup(uuid) TO service_role;

-- Google Drive backup OAuth (server-side tokens; edge functions only).

CREATE TABLE IF NOT EXISTS public.google_drive_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  state text NOT NULL UNIQUE,
  return_path text NOT NULL DEFAULT '/settings',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_drive_oauth_states_user
  ON public.google_drive_oauth_states (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.google_drive_oauth_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  access_token text NULL,
  access_token_expires_at timestamptz NULL,
  google_email text NULL,
  drive_folder_id text NULL,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  last_sync_at timestamptz NULL,
  last_sync_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.google_drive_synced_objects (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  bucket_id text NOT NULL,
  storage_path text NOT NULL,
  drive_file_id text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_google_drive_synced_objects_user
  ON public.google_drive_synced_objects (user_id, synced_at DESC);

ALTER TABLE public.google_drive_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_oauth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_synced_objects ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.google_drive_oauth_connections IS
  'Google Drive OAuth tokens for optional YourBible vault backup.';
COMMENT ON TABLE public.google_drive_synced_objects IS
  'Maps Supabase storage objects to Google Drive file ids after backup sync.';
