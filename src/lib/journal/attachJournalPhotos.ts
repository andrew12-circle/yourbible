import { supabase } from "@/integrations/supabase/client";
import { stageJournalPhoto, retryJournalAttachmentOperation, type JournalPhoto } from "./journalAttachmentOperations";
import { getSignedPhotoUrls } from "./photos";
const staged = new WeakMap<File, Map<string, Promise<import("./journalAttachmentOperations").AttachmentOperation>>>();
export async function attachJournalPhotos(userId: string, entryId: string, files: File[]): Promise<JournalPhoto[]> {
  const operations = await Promise.all(files.map((file) => {
    const key = `${userId}:${entryId}`;
    const map = staged.get(file) ?? new Map(); staged.set(file, map);
    let task = map.get(key);
    if (!task) { task = stageJournalPhoto(userId, entryId, file).catch((error) => { map.delete(key); throw error; }); map.set(key, task); }
    return task;
  }));
  const results = await Promise.allSettled(operations.map((op) => retryJournalAttachmentOperation(op)));
  const failure = results.find((item) => item.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
  const ids = [...new Set(operations.map((op) => op.attachmentId))];
  const { data: rows, error } = await supabase.from("journal_photos").select("id,storage_path")
    .eq("user_id", userId).eq("entry_id", entryId).in("id", ids);
  if (error) throw error;
  if (!rows || rows.length !== ids.length) throw new Error("Some attachments are no longer present. Select the missing photos again.");
  const urls = await getSignedPhotoUrls(rows.map((row) => row.storage_path)).catch(() => ({} as Record<string, string>));
  return rows.map((row) => ({ ...row, url: urls[row.storage_path] }));
}
