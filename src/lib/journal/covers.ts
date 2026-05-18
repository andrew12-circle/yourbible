import { supabase } from "@/integrations/supabase/client";
import { getSignedPhotoUrl } from "@/lib/journal/photos";

const BUCKET = "journal-photos";

export async function uploadJournalCover(
  userId: string,
  journalId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^(jpg|jpeg|png|webp|heic|gif)$/i.test(ext) ? ext : "jpg";
  const path = `${userId}/covers/${journalId}.${safeExt}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || `image/${safeExt}` });
  if (error) throw error;
  return path;
}

export async function uploadAllEntriesCover(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^(jpg|jpeg|png|webp|heic|gif)$/i.test(ext) ? ext : "jpg";
  const path = `${userId}/all-entries-cover.${safeExt}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || `image/${safeExt}` });
  if (error) throw error;
  return path;
}

export async function getJournalCoverUrl(storagePath: string | null): Promise<string | null> {
  if (!storagePath) return null;
  return getSignedPhotoUrl(storagePath);
}

export async function removeJournalCoverFile(storagePath: string) {
  await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
}

export const DEFAULT_COVER_FOCAL = { x: 50, y: 50 } as const;

export function clampCoverFocal(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function journalCoverFocal(journal: {
  cover_focal_x?: number;
  cover_focal_y?: number;
}): { x: number; y: number } {
  return {
    x: clampCoverFocal(journal.cover_focal_x ?? DEFAULT_COVER_FOCAL.x),
    y: clampCoverFocal(journal.cover_focal_y ?? DEFAULT_COVER_FOCAL.y),
  };
}

/** CSS object-position for cover banner images. */
export function journalCoverObjectPosition(journal: {
  cover_focal_x?: number;
  cover_focal_y?: number;
}): string {
  const { x, y } = journalCoverFocal(journal);
  return `${x}% ${y}%`;
}
