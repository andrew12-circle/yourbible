import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

export const YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

export type YouTubeConnectionRow = {
  user_id: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  channel_id: string | null;
  channel_title: string | null;
  scopes: string[];
};

export type OAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export function getOAuthConfig() {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")?.trim() ?? "";
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")?.trim() ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const redirectUri =
    Deno.env.get("YOUTUBE_OAUTH_REDIRECT_URI")?.trim()
    || (supabaseUrl ? `${supabaseUrl}/functions/v1/youtube-oauth-callback` : "");
  return { clientId, clientSecret, redirectUri };
}

export function isYouTubeOAuthConfigured(): boolean {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return Boolean(clientId && clientSecret && redirectUri);
}

export function appOrigin(): string {
  return (
    Deno.env.get("YOUTUBE_OAUTH_APP_ORIGIN")?.trim()
    || Deno.env.get("PUBLIC_APP_URL")?.trim()
    || "http://localhost:5173"
  ).replace(/\/+$/, "");
}

export function buildYouTubeAuthUrl(state: string): string {
  const { clientId, redirectUri } = getOAuthConfig();
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", YOUTUBE_READONLY_SCOPE);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  return (await res.json()) as OAuthTokenResponse;
}

export async function refreshOAuthAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const { clientId, clientSecret } = getOAuthConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return (await res.json()) as OAuthTokenResponse;
}

export async function fetchMyYouTubeChannel(accessToken: string): Promise<{ id: string; title: string } | null> {
  const u = new URL("https://www.googleapis.com/youtube/v3/channels");
  u.searchParams.set("part", "snippet");
  u.searchParams.set("mine", "true");
  const apiKey = Deno.env.get("YOUTUBE_DATA_API_KEY")?.trim();
  if (apiKey) u.searchParams.set("key", apiKey);

  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = await res.json() as {
    items?: Array<{ id?: string; snippet?: { title?: string } }>;
  };
  const item = json.items?.[0];
  if (!item?.id) return null;
  return { id: item.id, title: item.snippet?.title?.trim() || "YouTube channel" };
}

export async function upsertYouTubeConnection(
  admin: SupabaseClient,
  userId: string,
  tokens: OAuthTokenResponse,
  channel: { id: string; title: string } | null,
  existingRefreshToken?: string,
): Promise<void> {
  const refreshToken = tokens.refresh_token?.trim() || existingRefreshToken?.trim();
  if (!refreshToken) throw new Error("Google did not return a refresh token. Disconnect and connect again with consent.");

  const expiresIn = typeof tokens.expires_in === "number" ? tokens.expires_in : 3600;
  const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const scopes = tokens.scope?.split(/\s+/).filter(Boolean) ?? [YOUTUBE_READONLY_SCOPE];

  const { error } = await admin.from("youtube_oauth_connections").upsert(
    {
      user_id: userId,
      refresh_token: refreshToken,
      access_token: tokens.access_token ?? null,
      access_token_expires_at: accessTokenExpiresAt,
      channel_id: channel?.id ?? null,
      channel_title: channel?.title ?? null,
      scopes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

/** Returns a valid access token, refreshing and persisting when needed. */
export async function getValidYouTubeAccessToken(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: row, error } = await admin
    .from("youtube_oauth_connections")
    .select("refresh_token,access_token,access_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !row?.refresh_token) return null;

  const expiresAt = row.access_token_expires_at
    ? new Date(row.access_token_expires_at).getTime()
    : 0;
  if (row.access_token && expiresAt > Date.now() + 60_000) {
    return row.access_token as string;
  }

  const refreshed = await refreshOAuthAccessToken(row.refresh_token as string);
  if (!refreshed.access_token) {
    console.error("YouTube token refresh failed:", refreshed.error, refreshed.error_description);
    return null;
  }

  await upsertYouTubeConnection(admin, userId, refreshed, null, row.refresh_token as string);
  return refreshed.access_token;
}

export async function getYouTubeConnectionPublic(
  admin: SupabaseClient,
  userId: string,
): Promise<{ connected: boolean; channelTitle?: string; channelId?: string; connectedAt?: string }> {
  const { data } = await admin
    .from("youtube_oauth_connections")
    .select("channel_id,channel_title,created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { connected: false };
  return {
    connected: true,
    channelTitle: (data.channel_title as string | null) ?? undefined,
    channelId: (data.channel_id as string | null) ?? undefined,
    connectedAt: (data.created_at as string | null) ?? undefined,
  };
}

export function sanitizeReturnPath(raw: string | undefined): string {
  const path = (raw ?? "/settings").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/settings";
  return path;
}
