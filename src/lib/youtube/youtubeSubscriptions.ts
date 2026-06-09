import { supabase } from "@/integrations/supabase/client";

export type YouTubeChannelSubscription = {
  id: string;
  channel_id: string;
  channel_title: string | null;
  channel_thumbnail_url: string | null;
  channel_handle: string | null;
  auto_import: boolean;
  last_synced_at: string | null;
  created_at: string;
};

export async function listYouTubeSubscriptions(): Promise<YouTubeChannelSubscription[]> {
  const { data, error } = await supabase
    .from("youtube_channel_subscriptions")
    .select(
      "id,channel_id,channel_title,channel_thumbnail_url,channel_handle,auto_import,last_synced_at,created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as YouTubeChannelSubscription[];
}

export async function subscribeYouTubeChannel(
  channelInput: string,
  importRecent = 0,
): Promise<{ imported?: number }> {
  const { data, error } = await supabase.functions.invoke("youtube-channel-subscribe", {
    body: { channel_input: channelInput, import_recent: importRecent },
  });
  if (error) throw error;
  const payload = data as { error?: string; import?: { imported?: number } } | null;
  if (payload?.error) throw new Error(payload.error);
  return { imported: payload?.import?.imported ?? 0 };
}

export async function unsubscribeYouTubeChannel(subscriptionId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("youtube-channel-subscribe", {
    method: "DELETE",
    body: { subscription_id: subscriptionId },
  });
  if (error) throw error;
  const payload = data as { error?: string } | null;
  if (payload?.error) throw new Error(payload.error);
}

export async function syncYouTubeSubscriptions(force = false): Promise<number> {
  const { data, error } = await supabase.functions.invoke("youtube-subscription-sync", {
    body: { force },
  });
  if (error) throw error;
  const payload = data as { error?: string; imported?: number } | null;
  if (payload?.error) throw new Error(payload.error);
  return payload?.imported ?? 0;
}
