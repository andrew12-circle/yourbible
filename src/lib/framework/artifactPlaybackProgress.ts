import { supabase } from "@/integrations/supabase/client";
import {
  readPlaybackSecondsFromSession,
  writePlaybackSecondsToSession,
} from "@/lib/framework/artifactYoutubePip";

/** Pick the furthest saved position (session vs account). */
export function mergePlaybackSeconds(
  sessionSeconds: number | null | undefined,
  remoteSeconds: number | null | undefined,
): number {
  const session = normalizePlaybackSeconds(sessionSeconds);
  const remote = normalizePlaybackSeconds(remoteSeconds);
  return Math.max(session ?? 0, remote ?? 0);
}

export function normalizePlaybackSeconds(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

export async function fetchArtifactPlaybackProgress(
  userId: string,
  artifactId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("artifact_playback_progress")
    .select("playback_seconds")
    .eq("user_id", userId)
    .eq("artifact_id", artifactId)
    .maybeSingle();

  if (error) {
    console.warn("[artifactPlaybackProgress] fetch failed", error.message);
    return null;
  }
  return normalizePlaybackSeconds(data?.playback_seconds);
}

export async function upsertArtifactPlaybackProgress(
  userId: string,
  artifactId: string,
  playbackSeconds: number,
): Promise<void> {
  const playback_seconds = normalizePlaybackSeconds(playbackSeconds) ?? 0;
  const { error } = await supabase.from("artifact_playback_progress").upsert(
    {
      user_id: userId,
      artifact_id: artifactId,
      playback_seconds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,artifact_id" },
  );

  if (error) {
    console.warn("[artifactPlaybackProgress] upsert failed", error.message);
  }
}

/** Session read for the current tab; use mergePlaybackSeconds when account data is available. */
export function readPlaybackSecondsLocal(artifactId: string): number | null {
  return readPlaybackSecondsFromSession(artifactId);
}

export function writePlaybackSecondsLocal(artifactId: string, seconds: number) {
  writePlaybackSecondsToSession(artifactId, seconds);
}
