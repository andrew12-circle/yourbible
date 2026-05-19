import { supabase } from "@/integrations/supabase/client";
import {
  edgeFunctionErrorMessage,
  isEdgeFunctionReachable,
} from "@/lib/supabase/edgeFunctions";

export const JOURNAL_VOICE_FN = "journal-voice-to-text";

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

/** Lightweight probe: any HTTP response means the function is deployed. */
export async function probeJournalVoiceEdge(): Promise<boolean> {
  const { error } = await supabase.functions.invoke(JOURNAL_VOICE_FN, { body: {} });
  if (!error) return true;
  return isEdgeFunctionReachable(error);
}

export async function transcribeJournalVoiceMemo(storagePath: string): Promise<VoiceDictationResult> {
  const { data, error } = await supabase.functions.invoke(JOURNAL_VOICE_FN, {
    body: { storage_path: storagePath },
  });
  if (error) {
    return { ok: false, error: await edgeFunctionErrorMessage(JOURNAL_VOICE_FN, error, data) };
  }
  const d = data as Record<string, unknown> | null;
  if (d && typeof d.error === "string") {
    return { ok: false, error: await edgeFunctionErrorMessage(JOURNAL_VOICE_FN, null, d) };
  }
  if (!d || d.ok !== true || typeof d.text !== "string") {
    return { ok: false, error: "Unexpected response from voice transcription" };
  }
  return { ok: true, text: d.text.trim() };
}

export function isJournalVoiceEdgeUnavailable(error: string): boolean {
  return (
    /journal-voice-to-text is not deployed/i.test(error) ||
    /journal-voice-to-text is unreachable/i.test(error) ||
    /journal-voice-to-text relay error/i.test(error) ||
    /failed to send a request/i.test(error)
  );
}
