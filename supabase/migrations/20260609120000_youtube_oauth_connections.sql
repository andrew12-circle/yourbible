-- YouTube OAuth: store refresh tokens server-side for official Captions API access.
-- Tokens are only read/written by edge functions (service role); no client RLS policies.

CREATE TABLE IF NOT EXISTS public.youtube_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  state text NOT NULL UNIQUE,
  return_path text NOT NULL DEFAULT '/settings',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_youtube_oauth_states_user
  ON public.youtube_oauth_states (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.youtube_oauth_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  access_token text NULL,
  access_token_expires_at timestamptz NULL,
  channel_id text NULL,
  channel_title text NULL,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.youtube_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_oauth_connections ENABLE ROW LEVEL SECURITY;

-- No policies: authenticated clients cannot read tokens; edge functions use service role.

COMMENT ON TABLE public.youtube_oauth_connections IS
  'YouTube OAuth refresh tokens for captions.download on the user''s own uploads.';
