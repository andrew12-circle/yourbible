import { supabase } from "@/integrations/supabase/client";

export type YouTubeConnectionStatus = {
  configured: boolean;
  connected: boolean;
  channelTitle?: string;
  channelId?: string;
  connectedAt?: string;
};

export async function fetchYouTubeConnectionStatus(): Promise<YouTubeConnectionStatus> {
  const { data, error } = await supabase.functions.invoke("youtube-oauth-status");
  if (error) throw error;
  return (data ?? { configured: false, connected: false }) as YouTubeConnectionStatus;
}

export async function startYouTubeOAuth(returnPath = "/settings"): Promise<string> {
  const { data, error } = await supabase.functions.invoke("youtube-oauth-start", {
    body: { return_path: returnPath },
  });
  if (error) throw error;
  const authUrl = data && typeof data === "object" && "auth_url" in data
    ? String((data as { auth_url?: unknown }).auth_url ?? "")
    : "";
  if (!authUrl) throw new Error("Could not start YouTube connection.");
  return authUrl;
}

export async function disconnectYouTube(): Promise<void> {
  const { error } = await supabase.functions.invoke("youtube-oauth-disconnect");
  if (error) throw error;
}
