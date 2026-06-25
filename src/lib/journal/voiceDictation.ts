import { supabase } from "@/integrations/supabase/client";
import {
  edgeFunctionErrorMessage,
  isEdgeFunctionReachable,
} from "@/lib/supabase/edgeFunctions";

export const JOURNAL_VOICE_FN = "journal-voice-to-text";

export type VoiceDictationResult = { ok: true; text: string } | { ok: false; error: string };

/** Ensure a fresh JWT is on the Supabase client before storage / edge calls. */
export async function ensureVoiceDictationSession(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return { ok: false, error: "Could not read your session. Sign in again and retry." };
  }
  const session = sessionData.session;
  if (!session?.access_token) {
    return { ok: false, error: "Sign in to use voice dictation." };
  }
  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt - now < 60) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      return { ok: false, error: "Session expired. Sign in again and retry." };
    }
  }
  return { ok: true };
}

export async function uploadJournalVoiceMemo(userId: string, blob: Blob): Promise<string> {
  const auth = await ensureVoiceDictationSession();
  if (!auth.ok) throw new Error(auth.error);
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

export async function transcribeJournalVoiceMemo(
  storagePath: string,
  bucket: "voice-memos" | "journal-videos" = "voice-memos",
): Promise<VoiceDictationResult> {
  const auth = await ensureVoiceDictationSession();
  if (!auth.ok) return auth;

  const { data, error } = await supabase.functions.invoke(JOURNAL_VOICE_FN, {
    body: { storage_path: storagePath, bucket },
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

/** Record-and-transcribe failed after upload (ElevenLabs, empty audio, etc.). */
export function isJournalVoiceTranscriptionFailure(error: string): boolean {
  return (
    /transcription failed/i.test(error) ||
    /elevenlabs api key/i.test(error) ||
    /empty transcript/i.test(error) ||
    /ELEVENLABS_API_KEY/i.test(error) ||
    /download failed/i.test(error)
  );
}
