import { supabase } from "@/integrations/supabase/client";

export type GoogleDriveConnectionStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  lastSyncError?: string;
};

export type GoogleDriveSyncResult = {
  ok: boolean;
  uploaded: number;
  remaining: number;
  complete: boolean;
  total_objects: number;
  error?: string;
};

export async function fetchGoogleDriveConnectionStatus(): Promise<GoogleDriveConnectionStatus> {
  const { data, error } = await supabase.functions.invoke("google-drive-oauth-status");
  if (error) throw error;
  return (data ?? { configured: false, connected: false }) as GoogleDriveConnectionStatus;
}

export async function startGoogleDriveOAuth(returnPath = "/settings?section=storage"): Promise<string> {
  const { data, error } = await supabase.functions.invoke("google-drive-oauth-start", {
    body: { return_path: returnPath },
  });
  if (error) throw error;
  const authUrl = data && typeof data === "object" && "auth_url" in data
    ? String((data as { auth_url?: unknown }).auth_url ?? "")
    : "";
  if (!authUrl) throw new Error("Could not start Google Drive connection.");
  return authUrl;
}

export async function disconnectGoogleDrive(): Promise<void> {
  const { error } = await supabase.functions.invoke("google-drive-oauth-disconnect");
  if (error) throw error;
}

export async function syncGoogleDriveBackup(): Promise<GoogleDriveSyncResult> {
  const { data, error } = await supabase.functions.invoke("google-drive-sync");
  if (error) throw error;
  return (data ?? { ok: false, uploaded: 0, remaining: 0, complete: false, total_objects: 0 }) as GoogleDriveSyncResult;
}
