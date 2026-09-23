import { supabase } from "@/integrations/supabase/client";

const BUCKET = "voice-memos";
export const SCENE_AUDIO_ACCEPT = "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm";

const MIME_BY_EXT: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  webm: "audio/webm",
};

export function sceneAudioExt(name: string): string | null {
  const ext = (name.split(".").pop() || "").toLowerCase();
  return ext in MIME_BY_EXT ? ext : null;
}

/** Uploads a user-provided narration file (e.g. an ElevenLabs export) for one scene. */
export async function uploadSceneAudio(userId: string, sceneId: string, file: File): Promise<string> {
  const ext = sceneAudioExt(file.name) ?? (file.type.startsWith("audio/") ? "mp3" : null);
  if (!ext) throw new Error("Please choose an audio file (MP3, WAV, or M4A).");
  const safeId = sceneId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `${userId}/morning-scenes/uploads/${safeId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || MIME_BY_EXT[ext] });
  if (error) throw error;
  return path;
}

export async function getSceneAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 6);
  if (error || !data?.signedUrl) throw error ?? new Error("Audio not available");
  return data.signedUrl;
}

export async function removeSceneAudioFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn("Scene audio cleanup failed", error);
}
