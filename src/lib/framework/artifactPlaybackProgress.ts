import { supabase } from "@/integrations/supabase/client";
import { readPlaybackSecondsFromSession, writePlaybackSecondsToSession } from "@/lib/framework/artifactYoutubePip";
import { normalizePlaybackSeconds, readPlaybackSnapshot, writePlaybackSnapshot, type PlaybackSnapshot } from "./playbackSnapshot";
export { normalizePlaybackSeconds, mergePlaybackSeconds } from "./playbackSnapshot";

export async function fetchArtifactPlaybackSnapshot(userId: string, artifactId: string): Promise<PlaybackSnapshot | null> {
  const { data, error } = await supabase.from("artifact_playback_progress").select("playback_seconds,updated_at")
    .eq("user_id", userId).eq("artifact_id", artifactId).maybeSingle();
  if (error) throw new Error("Playback progress could not be loaded");
  const seconds = normalizePlaybackSeconds(data?.playback_seconds);
  const updatedAt = data?.updated_at ? Date.parse(data.updated_at) : 0;
  return seconds == null ? null : { seconds, updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0 };
}
export async function fetchArtifactPlaybackProgress(userId: string, artifactId: string): Promise<number | null> {
  return (await fetchArtifactPlaybackSnapshot(userId, artifactId))?.seconds ?? null;
}
export async function upsertArtifactPlaybackProgress(userId: string, artifactId: string, seconds: number, updatedAt = Date.now()): Promise<void> {
  const playback_seconds = normalizePlaybackSeconds(seconds);
  if (playback_seconds == null) return;
  const { error } = await supabase.from("artifact_playback_progress").upsert({
    user_id: userId, artifact_id: artifactId, playback_seconds, updated_at: new Date(updatedAt).toISOString(),
  }, { onConflict: "user_id,artifact_id" });
  if (error) throw new Error("Playback progress could not be saved");
}
export function readPlaybackSecondsLocal(artifactId: string, userId?: string): number | null> {
  return readPlaybackSnapshot(artifactId, userId)?.seconds ?? (userId ? null : readPlaybackSecondsFromSession(artifactId));
}
export function writePlaybackSecondsLocal(artifactId: string, seconds: number, userId?: string) {
  const normalized = normalizePlaybackSeconds(seconds);
  if (normalized == null) return;
  writePlaybackSnapshot(artifactId, { seconds: normalized, updatedAt: Date.now() }, userId);
  if (!userId) writePlaybackSecondsToSession(artifactId, normalized);
}
export function markArtifactInlineVideoResume(artifactId: string): void {
  try { sessionStorage.setItem(`artifact-inline-resume:${artifactId}`, "1"); } catch { /* Optional hint. */ }
}
export function consumeArtifactInlineVideoResume(artifactId: string): boolean {
  try {
    const key = `artifact-inline-resume:${artifactId}`;
    if (sessionStorage.getItem(key) !== "1") return false;
    sessionStorage.removeItem(key);
    return true;
  } catch { return false; }
}
