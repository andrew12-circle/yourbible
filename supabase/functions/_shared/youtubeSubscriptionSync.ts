import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  fetchChannelUploads,
  latestChannelUpload,
  type ResolvedYouTubeChannel,
  type YouTubeChannelVideo,
} from "./youtubeChannelData.ts";

export type SubscriptionRow = {
  id: string;
  user_id: string;
  channel_id: string;
  channel_title: string | null;
  channel_thumbnail_url: string | null;
  channel_handle: string | null;
  auto_import: boolean;
  last_synced_at: string | null;
  last_video_published_at: string | null;
};

export type SyncImportResult = {
  subscriptionId: string;
  channelTitle: string;
  imported: number;
  skipped: number;
  latestPublishedAt: string | null;
};

const SYNC_MIN_INTERVAL_MS = 10 * 60 * 1000;

async function userHasVideoArtifact(
  admin: SupabaseClient,
  userId: string,
  videoId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("artifacts")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "youtube")
    .or(`url.ilike.%${videoId}%,metadata->>video_id.eq.${videoId}`)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[youtube-subscription-sync] duplicate check failed", error.message);
    return false;
  }
  return Boolean(data);
}

async function startTranscriptFetch(
  supabaseUrl: string,
  serviceRoleKey: string,
  artifactId: string,
  url: string,
  processingToken: string,
  userId: string,
): Promise<void> {
  await fetch(`${supabaseUrl}/functions/v1/framework-fetch-transcript`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    body: JSON.stringify({
      artifact_id: artifactId,
      url,
      processing_token: processingToken,
    }),
  }).catch((e) => console.error("[youtube-subscription-sync] transcript invoke failed", e));
}

async function importVideo(
  admin: SupabaseClient,
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  subscription: SubscriptionRow,
  channel: Pick<ResolvedYouTubeChannel, "channelId" | "title" | "thumbnailUrl" | "handle">,
  video: YouTubeChannelVideo,
): Promise<"imported" | "skipped"> {
  const exists = await userHasVideoArtifact(admin, userId, video.videoId);
  if (exists) return "skipped";

  const processingToken = crypto.randomUUID();
  const { data, error } = await admin
    .from("artifacts")
    .insert({
      user_id: userId,
      kind: "youtube",
      title: video.title,
      url: video.url,
      raw_text: "",
      status: "fetching",
      processing_token: processingToken,
      metadata: {
        source: "youtube",
        import_via: "youtube_subscription",
        subscription_id: subscription.id,
        video_id: video.videoId,
        published_at: video.publishedAt,
        channel_id: channel.channelId,
        channel_title: channel.title,
        channel_thumbnail_url: channel.thumbnailUrl,
        thumbnail_url: video.thumbnailUrl,
        provider_name: "YouTube",
      },
    })
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    console.error("[youtube-subscription-sync] artifact insert failed", error?.message);
    return "skipped";
  }

  await startTranscriptFetch(supabaseUrl, serviceRoleKey, data.id as string, video.url, processingToken, userId);
  return "imported";
}

export async function importRecentVideosForSubscription(
  admin: SupabaseClient,
  supabaseUrl: string,
  serviceRoleKey: string,
  subscription: SubscriptionRow,
  channel: ResolvedYouTubeChannel,
  count: number,
): Promise<SyncImportResult> {
  const videos = await fetchChannelUploads(channel.uploadsPlaylistId, { maxResults: count });
  let imported = 0;
  let skipped = 0;
  let latestPublishedAt: string | null = subscription.last_video_published_at;

  for (const video of [...videos].reverse()) {
    const result = await importVideo(admin, supabaseUrl, serviceRoleKey, subscription.user_id, subscription, channel, video);
    if (result === "imported") imported += 1;
    else skipped += 1;
    if (!latestPublishedAt || Date.parse(video.publishedAt) > Date.parse(latestPublishedAt)) {
      latestPublishedAt = video.publishedAt;
    }
  }

  await admin
    .from("youtube_channel_subscriptions")
    .update({
      last_video_published_at: latestPublishedAt,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id);

  return {
    subscriptionId: subscription.id,
    channelTitle: channel.title,
    imported,
    skipped,
    latestPublishedAt,
  };
}

export async function syncSubscriptionNewUploads(
  admin: SupabaseClient,
  supabaseUrl: string,
  serviceRoleKey: string,
  subscription: SubscriptionRow,
  channel: ResolvedYouTubeChannel,
  force = false,
): Promise<SyncImportResult> {
  if (!subscription.auto_import) {
    return {
      subscriptionId: subscription.id,
      channelTitle: channel.title,
      imported: 0,
      skipped: 0,
      latestPublishedAt: subscription.last_video_published_at,
    };
  }

  const lastSyncedMs = subscription.last_synced_at ? Date.parse(subscription.last_synced_at) : 0;
  if (!force && lastSyncedMs && Date.now() - lastSyncedMs < SYNC_MIN_INTERVAL_MS) {
    return {
      subscriptionId: subscription.id,
      channelTitle: channel.title,
      imported: 0,
      skipped: 0,
      latestPublishedAt: subscription.last_video_published_at,
    };
  }

  const sinceIso = subscription.last_video_published_at;
  const videos = await fetchChannelUploads(channel.uploadsPlaylistId, {
    sinceIso,
    maxResults: 25,
  });

  let imported = 0;
  let skipped = 0;
  let latestPublishedAt = subscription.last_video_published_at;

  const latest = await latestChannelUpload(channel.uploadsPlaylistId);
  if (latest) latestPublishedAt = latest.publishedAt;

  for (const video of videos.sort(
    (a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt),
  )) {
    const result = await importVideo(admin, supabaseUrl, serviceRoleKey, subscription.user_id, subscription, channel, video);
    if (result === "imported") imported += 1;
    else skipped += 1;
  }

  await admin
    .from("youtube_channel_subscriptions")
    .update({
      last_video_published_at: latestPublishedAt,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id);

  return {
    subscriptionId: subscription.id,
    channelTitle: channel.title,
    imported,
    skipped,
    latestPublishedAt,
  };
}

export async function bootstrapSubscriptionCursor(
  admin: SupabaseClient,
  subscriptionId: string,
  uploadsPlaylistId: string,
): Promise<string | null> {
  const latest = await latestChannelUpload(uploadsPlaylistId);
  const publishedAt = latest?.publishedAt ?? new Date().toISOString();
  await admin
    .from("youtube_channel_subscriptions")
    .update({
      last_video_published_at: publishedAt,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);
  return publishedAt;
}
