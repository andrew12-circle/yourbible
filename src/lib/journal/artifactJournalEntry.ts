import { supabase } from "@/integrations/supabase/client";
import { findEntriesLinkedTo } from "@/lib/journal/links";
import { getSignedPhotoUrl } from "@/lib/journal/photos";
import { isJournalSketchAsset, journalSketchStoragePath } from "@/lib/journal/sketchPhotos";

export type ArtifactJournalEntryRow = {
  id: string;
  title: string | null;
  body: string;
  entry_at_ts: string;
};

export type ArtifactJournalSketchPhoto = {
  id: string;
  storage_path: string;
  url: string;
};

/** Most recent journal entry linked to this artifact (study journal). */
export async function fetchLatestArtifactJournalEntry(
  userId: string,
  artifactId: string,
): Promise<ArtifactJournalEntryRow | null> {
  const entryIds = await findEntriesLinkedTo("artifact", { id: artifactId });
  if (!entryIds.length) return null;

  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, title, body, entry_at_ts")
    .eq("user_id", userId)
    .in("id", entryIds)
    .order("entry_at_ts", { ascending: false })
    .limit(1);

  if (error || !data?.[0]) return null;
  return data[0] as ArtifactJournalEntryRow;
}

export async function fetchEntrySketchPhoto(
  userId: string,
  entryId: string,
): Promise<ArtifactJournalSketchPhoto | null> {
  const storage_path = journalSketchStoragePath(userId, entryId);
  const { data } = await supabase
    .from("journal_photos")
    .select("id, storage_path")
    .eq("entry_id", entryId)
    .eq("storage_path", storage_path)
    .maybeSingle();

  if (!data?.id) return null;
  const url = await getSignedPhotoUrl(storage_path);
  if (!url) return null;
  return { id: data.id, storage_path, url };
}

export function isSketchPhotoRow(storage_path: string) {
  return isJournalSketchAsset(storage_path);
}
