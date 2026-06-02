import { supabase } from "@/integrations/supabase/client";

/** Storage path or uploaded file name for a journal handwriting PNG. */
export function isJournalSketchAsset(pathOrName: string): boolean {
  return /sketch-[^/]*\.png$/i.test(pathOrName);
}

export function journalSketchStoragePath(userId: string, entryId: string) {
  return `${userId}/${entryId}/sketch-${entryId}.png`;
}

/** Upsert the canonical sketch image for an entry and ensure a `journal_photos` row exists. */
export async function upsertEntrySketchPhoto(
  userId: string,
  entryId: string,
  file: File,
): Promise<{ storage_path: string; photo_id: string | null }> {
  const storage_path = journalSketchStoragePath(userId, entryId);
  const { error: uploadError } = await supabase.storage
    .from("journal-photos")
    .upload(storage_path, file, { upsert: true, contentType: "image/png" });
  if (uploadError) throw uploadError;

  const { data: existing } = await supabase
    .from("journal_photos")
    .select("id")
    .eq("entry_id", entryId)
    .eq("storage_path", storage_path)
    .maybeSingle();

  if (existing?.id) {
    return { storage_path, photo_id: existing.id };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("journal_photos")
    .insert({
      user_id: userId,
      entry_id: entryId,
      storage_path,
    })
    .select("id")
    .maybeSingle();
  if (insertError) throw insertError;
  return { storage_path, photo_id: inserted?.id ?? null };
}

export type SketchPhotoUpload = { storage_path: string; photo_id: string | null };

/** Upload sketch PNG only (no OCR) — used for periodic autosave while drawing. */
export async function autosaveSketchPhoto(
  userId: string,
  entryId: string,
  file: File,
): Promise<SketchPhotoUpload> {
  return upsertEntrySketchPhoto(userId, entryId, file);
}
