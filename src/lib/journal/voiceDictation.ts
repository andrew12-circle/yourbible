import { supabase } from "@/integrations/supabase/client";

export type VoiceDictationResult = { ok: true; text: string } | { ok: false; error: string };

export async function uploadJournalVoiceMemo(userId: string, blob: Blob): Promise<string> {
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const path = `${userId}/journal-dictation/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("voice-memos").upload(path, blob, {
    upsert: false,
    contentType: blob.type || "audio/webm",
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function transcribeJournalVoiceMemo(storagePath: string): Promise<VoiceDictationResult> {
  const { data, error } = await supabase.functions.invoke("journal-voice-to-text", {
    body: { storage_path: storagePath },
  });
  if (error) return { ok: false, error: error.message };
  const d = data as Record<string, unknown> | null;
  if (d && typeof d.error === "string") return { ok: false, error: d.error };
  if (!d || d.ok !== true || typeof d.text !== "string") {
    return { ok: false, error: "Unexpected response from voice transcription" };
  }
  return { ok: true, text: d.text.trim() };
}
