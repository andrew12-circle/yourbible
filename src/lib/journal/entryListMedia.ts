import { supabase } from "@/integrations/supabase/client";
import { getSignedPhotoUrls } from "@/lib/journal/photos";
import { getSignedVideoUrls } from "@/lib/journal/videos";

export type EntryListMediaUrls = {
  photoUrls: Record<string, string>;
  videoUrls: Record<string, string>;
};

/** First photo + first video signed URL per entry (for journal list rows). */
export async function fetchEntryListMediaUrls(entryIds: string[]): Promise<EntryListMediaUrls> {
  if (!entryIds.length) return { photoUrls: {}, videoUrls: {} };

  const [photosRes, videosRes] = await Promise.all([
    supabase
      .from("journal_photos")
      .select("entry_id,storage_path,created_at")
      .in("entry_id", entryIds)
      .order("created_at"),
    supabase
      .from("journal_videos")
      .select("entry_id,storage_path,created_at")
      .in("entry_id", entryIds)
      .order("created_at"),
  ]);

  const firstPhoto: Record<string, string> = {};
  (photosRes.data ?? []).forEach((p: { entry_id: string; storage_path: string }) => {
    if (!firstPhoto[p.entry_id]) firstPhoto[p.entry_id] = p.storage_path;
  });

  const firstVideo: Record<string, string> = {};
  (videosRes.data ?? []).forEach((v: { entry_id: string; storage_path: string }) => {
    if (!firstVideo[v.entry_id]) firstVideo[v.entry_id] = v.storage_path;
  });

  const [photoSigned, videoSigned] = await Promise.all([
    getSignedPhotoUrls(Object.values(firstPhoto)),
    getSignedVideoUrls(Object.values(firstVideo)),
  ]);

  const photoUrls: Record<string, string> = {};
  for (const [eid, path] of Object.entries(firstPhoto)) {
    if (photoSigned[path]) photoUrls[eid] = photoSigned[path];
  }

  const videoUrls: Record<string, string> = {};
  for (const [eid, path] of Object.entries(firstVideo)) {
    if (videoSigned[path]) videoUrls[eid] = videoSigned[path];
  }

  return { photoUrls, videoUrls };
}
