import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export type GoogleDriveConnectionRow = {
  user_id: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  google_email: string | null;
  drive_folder_id: string | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
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

export function getGoogleDriveOAuthConfig() {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")?.trim() ?? "";
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")?.trim() ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const redirectUri =
    Deno.env.get("GOOGLE_DRIVE_OAUTH_REDIRECT_URI")?.trim()
    || (supabaseUrl ? `${supabaseUrl}/functions/v1/google-drive-oauth-callback` : "");
  return { clientId, clientSecret, redirectUri };
}

export function isGoogleDriveOAuthConfigured(): boolean {
  const { clientId, clientSecret, redirectUri } = getGoogleDriveOAuthConfig();
  return Boolean(clientId && clientSecret && redirectUri);
}

export function appOrigin(): string {
  return (
    Deno.env.get("GOOGLE_DRIVE_OAUTH_APP_ORIGIN")?.trim()
    || Deno.env.get("YOUTUBE_OAUTH_APP_ORIGIN")?.trim()
    || Deno.env.get("PUBLIC_APP_URL")?.trim()
    || "http://localhost:5173"
  ).replace(/\/+$/, "");
}

export function buildGoogleDriveAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleDriveOAuthConfig();
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", DRIVE_FILE_SCOPE);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleDriveOAuthConfig();
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
  const { clientId, clientSecret } = getGoogleDriveOAuthConfig();
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

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = await res.json() as { email?: string };
  return json.email?.trim() || null;
}

export async function upsertGoogleDriveConnection(
  admin: SupabaseClient,
  userId: string,
  tokens: OAuthTokenResponse,
  googleEmail: string | null,
  existingRefreshToken?: string,
): Promise<void> {
  const refreshToken = tokens.refresh_token?.trim() || existingRefreshToken?.trim();
  if (!refreshToken) {
    throw new Error("Google did not return a refresh token. Disconnect and connect again with consent.");
  }

  const expiresIn = typeof tokens.expires_in === "number" ? tokens.expires_in : 3600;
  const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const scopes = tokens.scope?.split(/\s+/).filter(Boolean) ?? [DRIVE_FILE_SCOPE];

  const { error } = await admin.from("google_drive_oauth_connections").upsert(
    {
      user_id: userId,
      refresh_token: refreshToken,
      access_token: tokens.access_token ?? null,
      access_token_expires_at: accessTokenExpiresAt,
      google_email: googleEmail,
      scopes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

export async function getValidGoogleDriveAccessToken(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: row, error } = await admin
    .from("google_drive_oauth_connections")
    .select("refresh_token,access_token,access_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !row?.refresh_token) return null;

  const expiresAt = row.access_token_expires_at
    ? new Date(row.access_token_expires_at as string).getTime()
    : 0;
  if (row.access_token && expiresAt > Date.now() + 60_000) {
    return row.access_token as string;
  }

  const refreshed = await refreshOAuthAccessToken(row.refresh_token as string);
  if (!refreshed.access_token) {
    console.error("Google Drive token refresh failed:", refreshed.error, refreshed.error_description);
    return null;
  }

  await upsertGoogleDriveConnection(admin, userId, refreshed, null, row.refresh_token as string);
  return refreshed.access_token;
}

export async function getGoogleDriveConnectionPublic(
  admin: SupabaseClient,
  userId: string,
): Promise<{
  connected: boolean;
  googleEmail?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  lastSyncError?: string;
}> {
  const { data } = await admin
    .from("google_drive_oauth_connections")
    .select("google_email,created_at,last_sync_at,last_sync_error")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { connected: false };
  return {
    connected: true,
    googleEmail: (data.google_email as string | null) ?? undefined,
    connectedAt: (data.created_at as string | null) ?? undefined,
    lastSyncAt: (data.last_sync_at as string | null) ?? undefined,
    lastSyncError: (data.last_sync_error as string | null) ?? undefined,
  };
}

export function sanitizeReturnPath(raw: string | undefined): string {
  const path = (raw ?? "/settings").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/settings?section=storage";
  return path;
}

const BACKUP_BUCKETS = ["journal-photos", "journal-videos", "voice-memos", "artifact-uploads"] as const;

export type StorageObjectRow = {
  bucket_id: string;
  name: string;
  size_bytes: number;
};

export async function listUserStorageObjects(
  admin: SupabaseClient,
  userId: string,
): Promise<StorageObjectRow[]> {
  const { data, error } = await admin.rpc("list_user_storage_objects_for_backup", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as StorageObjectRow[];
}

export async function ensureDriveBackupFolder(
  accessToken: string,
  existingFolderId: string | null,
): Promise<string> {
  if (existingFolderId) return existingFolderId;

  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "YourBible Vault",
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Could not create Drive folder (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json() as { id?: string };
  if (!json.id) throw new Error("Drive folder creation returned no id.");
  return json.id;
}

export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  relativePath: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<string> {
  const fileName = relativePath.split("/").pop() || "file";
  const metadata = {
    name: fileName,
    parents: [folderId],
    description: relativePath,
  };

  const boundary = `yourbible_${crypto.randomUUID()}`;
  const metaPart = JSON.stringify(metadata);
  const bodyParts = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaPart}\r\n`,
    `--${boundary}\r\nContent-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`,
  ];
  const prefix = new TextEncoder().encode(bodyParts[0]);
  const mid = new TextEncoder().encode(bodyParts[1]);
  const suffix = new TextEncoder().encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(prefix.length + mid.length + bytes.length + suffix.length);
  body.set(prefix, 0);
  body.set(mid, prefix.length);
  body.set(bytes, prefix.length + mid.length);
  body.set(suffix, prefix.length + mid.length + bytes.length);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json() as { id?: string };
  if (!json.id) throw new Error("Drive upload returned no file id.");
  return json.id;
}

export { BACKUP_BUCKETS };
